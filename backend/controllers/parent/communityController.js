import CommunityPost from "../../models/community/CommunityPost.model.js";
import School from "../../models/school/School.js";
import Class from "../../models/organization/organizationClass.js";
import Student from "../../models/users/student.model.js";
import Teacher from "../../models/users/teacher.model.js";
import User from "../../models/users/user.model.js";

// Helper function to format "2 hours ago" exactly like the frontend UI expects
const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " mins ago";
    return "Just now";
};

// @desc    Get the community feed & sidebar data
// @route   GET /api/parent/community/feed?filter=...
export const getCommunityFeed = async (req, res) => {
    try {
        const parentId = req.user._id;
        const schoolId = req.user.school;
        const { filter = 'all' } = req.query;

        // 1. Map the frontend tab filter to the exact database Enum
        let queryFilter = { school: schoolId, isActive: true };
        const typeMap = {
            'photos': 'photo',
            'announcements': 'announcement',
            'polls': 'poll',
            'events': 'event',
            'achievements': 'achievement'
        };
        
        if (filter !== 'all' && typeMap[filter]) {
            queryFilter.type = typeMap[filter];
        }

        // 2. Fetch the Main Feed
        const rawPosts = await CommunityPost.find(queryFilter)
            .sort({ createdAt: -1 })
            .limit(20) // Pagination could be added here later
            .lean();

        // 3. Format the Main Feed for React
        const formattedPosts = rawPosts.map(post => {
            // General Mapping
            let mapped = {
                id: post._id,
                type: post.type,
                schoolName: post.schoolNameLabel,
                authorRole: post.authorRoleLabel,
                timeAgo: timeAgo(post.createdAt),
                likes: post.likes?.length || 0,
                liked: post.likes?.some(id => id.toString() === parentId.toString()),
                commentsCount: post.comments?.length || 0,
                comments: post.comments?.map(c => ({
                    id: c._id,
                    name: c.nameLabel,
                    text: c.text,
                    timeAgo: timeAgo(c.createdAt),
                    liked: c.likes?.some(id => id.toString() === parentId.toString())
                })) || []
            };

            // Type-Specific Mapping
            if (post.type === 'photo') {
                mapped.caption = post.caption;
                mapped.photos = post.photos?.length || 0;
                mapped.photoUrls = post.photos || [];
            } 
            else if (post.type === 'announcement') {
                mapped.title = post.title;
                mapped.content = post.content;
                mapped.attachment = post.attachmentName;
            } 
            else if (post.type === 'poll') {
                mapped.question = post.question;
                mapped.totalVotes = post.pollOptions?.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0) || 0;
                mapped.endsIn = post.pollEndsAt ? `Ends in ${Math.ceil((new Date(post.pollEndsAt) - new Date()) / 86400000)} days` : "No limit";
                
                // Find which option the user voted for
                let userVote = null;
                mapped.options = post.pollOptions?.map(opt => {
                    if (opt.votes?.some(v => v.toString() === parentId.toString())) userVote = opt._id;
                    return { id: opt._id, text: opt.text, votes: opt.votes?.length || 0 };
                }) || [];
                mapped.userVote = userVote;
            }
            else if (post.type === 'event') {
                mapped.eventName = post.eventName;
                mapped.eventDate = post.eventDate ? new Date(post.eventDate).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : "";
                mapped.venue = post.venue;
                mapped.who = post.targetAudience;
                mapped.rsvpYes = post.eventRsvps?.filter(r => r.response === 'yes').length || 0;
                mapped.rsvpNo = post.eventRsvps?.filter(r => r.response === 'no').length || 0;
                mapped.userRsvp = post.eventRsvps?.find(r => r.user.toString() === parentId.toString())?.response || null;
            }
            else if (post.type === 'achievement') {
                mapped.studentName = post.studentName;
                mapped.achievement = post.achievementText;
                mapped.competition = post.competitionName;
            }

            return mapped;
        });

        // 4. Fetch the Independent Sidebar Data (So it never disappears!)
        const activePolls = await CommunityPost.find({ school: schoolId, type: 'poll', isActive: true })
            .sort({ createdAt: -1 }).limit(2).select('question pollOptions').lean();
            
        const upcomingEvents = await CommunityPost.find({ school: schoolId, type: 'event', eventDate: { $gte: new Date() }, isActive: true })
            .sort({ eventDate: 1 }).limit(3).select('eventName eventDate').lean();

        // MongoDB aggregation to find top 3 most liked posts
        const popularPosts = await CommunityPost.aggregate([
            { $match: { school: schoolId, isActive: true } },
            { $addFields: { likeCount: { $size: { $ifNull: ["$likes", []] } } } },
            { $sort: { likeCount: -1 } },
            { $limit: 3 },
            { $project: { type: 1, title: 1, eventName: 1, question: 1, caption: 1, likeCount: 1 } }
        ]);

        // 4b. School profile data for sidebar
        const school = await School.findById(schoolId).lean();
        const organizationId = school?.organization;
        const classIds = organizationId
            ? (await Class.find({ organization: organizationId }).select('_id').lean()).map((c) => c._id)
            : [];
        const [studentCount, teacherCount, classCount] = await Promise.all([
            classIds.length ? Student.countDocuments({ class: { $in: classIds } }) : 0,
            Teacher.countDocuments({ school: schoolId }),
            organizationId ? Class.countDocuments({ organization: organizationId }) : 0,
        ]);

        // 5. Send Everything
        res.status(200).json({
            success: true,
            data: {
                feed: formattedPosts,
                sidebar: {
                    schoolProfile: {
                        name: school?.schoolName || "",
                        establishedYear: school?.createdAt ? new Date(school.createdAt).getFullYear() : null,
                        students: studentCount,
                        teachers: teacherCount,
                        classes: classCount,
                    },
                    activePolls: activePolls.map(p => ({
                        id: p._id,
                        question: p.question,
                        totalVotes: p.pollOptions.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0)
                    })),
                    upcomingEvents: upcomingEvents.map((e, idx) => ({
                        id: e._id,
                        title: e.eventName,
                        date: new Date(e.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        color: idx === 0 ? 'bg-emerald-500' : idx === 1 ? 'bg-blue-500' : 'bg-amber-500'
                    })),
                    popularPosts: popularPosts.map(p => ({
                        id: p._id,
                        type: p.type,
                        title: p.title || p.eventName || p.question || p.caption || "Community post",
                        likes: p.likeCount
                    }))
                }
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Like or Unlike a Post
// @route   POST /api/parent/community/posts/:id/like
export const togglePostLike = async (req, res) => {
    try {
        const { id } = req.params;
        const parentId = req.user._id;

        const post = await CommunityPost.findById(id);
        if (!post) return res.status(404).json({ success: false, message: "Post not found" });

        const isLiked = post.likes.includes(parentId);
        
        if (isLiked) {
            post.likes.pull(parentId); // Unlike
        } else {
            post.likes.push(parentId); // Like
        }

        await post.save();
        res.status(200).json({ success: true, liked: !isLiked });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Add a comment
// @route   POST /api/parent/community/posts/:id/comment
export const addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        const parentId = req.user._id;

        const post = await CommunityPost.findById(id);
        if (!post) return res.status(404).json({ success: false, message: "Post not found" });

        // Push new comment
        post.comments.push({
            user: parentId,
            nameLabel: req.user.name, // Uses the actual logged-in parent's name!
            text: text
        });

        await post.save();
        res.status(200).json({ success: true, message: "Comment added" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Vote on a Poll
// @route   POST /api/parent/community/posts/:id/poll-vote
export const voteOnPoll = async (req, res) => {
    try {
        const { id } = req.params;
        const { optionId } = req.body;
        const parentId = req.user._id;

        const post = await CommunityPost.findById(id);
        if (!post || post.type !== 'poll') return res.status(404).json({ success: false, message: "Poll not found" });

        // Remove user's previous vote from any option (prevents double voting)
        post.pollOptions.forEach(opt => opt.votes.pull(parentId));

        // Add user to the new option
        const selectedOption = post.pollOptions.id(optionId);
        if (selectedOption) selectedOption.votes.push(parentId);

        await post.save();
        res.status(200).json({ success: true, message: "Vote recorded" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    RSVP to a Community Event
// @route   POST /api/parent/community/posts/:id/event-rsvp
export const rsvpToCommunityEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { response } = req.body; // 'yes' or 'no'
        const parentId = req.user._id;

        const post = await CommunityPost.findById(id);
        if (!post || post.type !== 'event') return res.status(404).json({ success: false, message: "Event not found" });

        // Remove previous RSVP if it exists
        post.eventRsvps = post.eventRsvps.filter(r => r.user.toString() !== parentId.toString());
        
        // Push new RSVP
        post.eventRsvps.push({ user: parentId, response });

        await post.save();
        res.status(200).json({ success: true, message: "RSVP recorded" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};