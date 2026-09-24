import Message from '../../models/communication/Message.model.js';
import User from "../../models/users/user.model.js";
import Student from "../../models/users/student.model.js";
import Parent from "../../models/users/parent.model.js";
import Teacher from "../../models/users/teacher.model.js";

/**
 * @desc    Get sidebar conversations (latest message per user + unread count)
 * @route   GET /api/messages/conversations
 * @access  Private
 */
export const getConversations = async (req, res) => {
    try {
        const myId = req.user._id;
        const schoolId = req.user.school;

        // If user is a student
        if (req.user.role === 'student') {
            const studentProfile = await Student.findOne({ user: myId }).lean();
            if (!studentProfile) {
                return res.status(200).json({ success: true, data: [] });
            }

            // Find all teachers assigned to this student's class
            const teachers = await Teacher.find({
                assignedClasses: studentProfile.class,
                school: schoolId
            }).populate('user', 'name role avatar').lean();

            const allowedTeacherUserIds = teachers.map(t => t.user?._id?.toString()).filter(Boolean);

            const allMessages = await Message.find({
                $or: [{ sender: myId }, { receiver: myId }]
            })
            .populate('sender', 'name role avatar')
            .populate('receiver', 'name role avatar')
            .sort({ createdAt: -1 })
            .lean();

            const chatsMap = new Map();

            allMessages.forEach(msg => {
                const isMeSender = msg.sender?._id?.toString() === myId.toString();
                const otherUser = isMeSender ? msg.receiver : msg.sender;
                if (!otherUser) return;
                const otherUserId = otherUser._id.toString();

                if (!allowedTeacherUserIds.includes(otherUserId)) return;

                if (!chatsMap.has(otherUserId)) {
                    chatsMap.set(otherUserId, {
                        id: otherUserId,
                        name: otherUser.name,
                        role: 'Teacher',
                        avatar: otherUser.avatar || '',
                        lastMessage: msg.text,
                        time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        unread: 0,
                        online: false
                    });
                }

                if (!isMeSender && msg.status !== 'read') {
                    chatsMap.get(otherUserId).unread += 1;
                }
            });

            return res.status(200).json({ success: true, data: Array.from(chatsMap.values()) });
        }

        // --- Teacher flow ---
        // Fetch only incoming messages where the teacher is the receiver
        const allMessages = await Message.find({
            receiver: myId
        })
        .populate('sender', 'name role avatar')
        .sort({ createdAt: -1 })
        .lean();

        // Group them by the sender to build the sidebar list
        const chatsMap = new Map();

        allMessages.forEach(msg => {
            const otherUser = msg.sender;
            if (!otherUser) return;
            const otherUserId = otherUser._id.toString();

            if (!chatsMap.has(otherUserId)) {
                chatsMap.set(otherUserId, {
                    id: otherUserId,
                    name: otherUser.name,
                    role: otherUser.role ? (otherUser.role.charAt(0).toUpperCase() + otherUser.role.slice(1)) : '',
                    avatar: otherUser.avatar || '',
                    lastMessage: msg.text,
                    time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    unread: 0,
                    online: false
                });
            }

            // Increment unread count if they sent it to me and I haven't read it
            if (msg.status !== 'read') {
                chatsMap.get(otherUserId).unread += 1;
            }
        });

        // Convert Map back to an array
        const chatsArray = Array.from(chatsMap.values());

        // PERMISSION FILTER: Only return conversations with allowed users
        const teacherProfile = await Teacher.findOne({ user: myId }).lean();
        if (!teacherProfile) {
            return res.status(200).json({ success: true, data: [] });
        }

        const assignedClasses = teacherProfile.assignedClasses || [];

        // 1. Fetch Students assigned to this teacher
        const students = await Student.find({
            class: { $in: assignedClasses },
            school: req.user.school
        }).lean();
        const allowedStudentUserIds = students.map(s => s.user?.toString()).filter(Boolean);

        // 2. Fetch Parent user IDs
        const studentIds = students.map(s => s._id);
        const parentIds = students.map(s => s.parent?.toString() || s.parent).filter(Boolean);
        const parents = await Parent.find({
            $or: [
                { _id: { $in: parentIds } },
                { students: { $in: studentIds } }
            ],
            school: req.user.school
        }).lean();
        const allowedParentUserIds = parents.map(p => p.user?.toString()).filter(Boolean);

        // 3. Fetch Staff user IDs
        const staffUsers = await User.find({
            school: req.user.school,
            role: { $in: ['principal', 'admin', 'teacher', 'support_staff'] }
        }).select('_id').lean();
        const allowedStaffUserIds = staffUsers.map(s => s._id.toString());

        const finalConversations = chatsArray.filter(c => 
            allowedStudentUserIds.includes(c.id) ||
            allowedParentUserIds.includes(c.id) ||
            allowedStaffUserIds.includes(c.id)
        );

        res.status(200).json({ success: true, data: finalConversations });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get contacts list by categories
 * @route   GET /api/messages/contacts
 * @access  Private
 */
export const getContacts = async (req, res) => {
    try {
        const myId = req.user._id;
        const schoolId = req.user.school;

        // If user is a student
        if (req.user.role === 'student') {
            const studentProfile = await Student.findOne({ user: myId }).lean();
            if (!studentProfile) {
                return res.status(404).json({ success: false, message: 'Student profile not found' });
            }

            const teachers = await Teacher.find({
                assignedClasses: studentProfile.class,
                school: schoolId
            })
            .populate('user', 'name email avatar role')
            .populate('subjects', 'name')
            .lean();

            // Fetch all messages involving the student
            const messages = await Message.find({
                $or: [{ sender: myId }, { receiver: myId }]
            })
            .sort({ createdAt: 1 })
            .lean();

            const lastMsgMap = new Map();
            const unreadMap = new Map();

            messages.forEach(msg => {
                const otherUserId = msg.sender.toString() === myId.toString() ? msg.receiver.toString() : msg.sender.toString();
                lastMsgMap.set(otherUserId, msg);
                if (msg.receiver.toString() === myId.toString() && msg.status !== 'read') {
                    unreadMap.set(otherUserId, (unreadMap.get(otherUserId) || 0) + 1);
                }
            });

            const teacherContacts = teachers.map(teacher => {
                const userId = teacher.user?._id?.toString();
                const lastMsg = lastMsgMap.get(userId);
                return {
                    id: userId,
                    name: teacher.user?.name || 'Unknown Teacher',
                    photo: teacher.photo || teacher.user?.avatar || '',
                    designation: teacher.designation || 'Teacher',
                    subject: teacher.subjects?.[0]?.name || 'General',
                    role: 'teacher',
                    lastMessage: lastMsg ? lastMsg.text : '',
                    lastMessageTime: lastMsg ? lastMsg.createdAt : null,
                    unread: unreadMap.get(userId) || 0,
                    isOnline: false
                };
            });

            return res.status(200).json({
                success: true,
                data: {
                    teachers: teacherContacts
                }
            });
        }

        // --- Teacher contacts flow ---
        // Fetch teacher profile
        const teacherProfile = await Teacher.findOne({ user: myId }).lean();
        if (!teacherProfile) {
            return res.status(404).json({ success: false, message: 'Teacher profile not found' });
        }

        const assignedClasses = teacherProfile.assignedClasses || [];

        // 1. Fetch Students assigned to this teacher
        const students = await Student.find({
            class: { $in: assignedClasses },
            school: schoolId
        })
        .populate('user', 'name email avatar role')
        .populate('class', 'name')
        .populate({
            path: 'parent',
            populate: { path: 'user', select: 'name email avatar role' }
        })
        .lean();

        // 2. Extract allowed Parents from those students
        const parentsMap = new Map();
        students.forEach(student => {
            if (student.parent && student.parent.user) {
                const parentUserId = student.parent.user._id.toString();
                if (!parentsMap.has(parentUserId)) {
                    parentsMap.set(parentUserId, {
                        parentProfile: student.parent,
                        studentName: student.user?.name || 'Unknown Student'
                    });
                }
            }
        });

        // 3. Fetch Staff (principal, admin, teacher, support_staff) in same school
        const staffUsers = await User.find({
            school: schoolId,
            role: { $in: ['principal', 'admin', 'teacher', 'support_staff'] },
            _id: { $ne: myId }
        })
        .select('name email role avatar')
        .lean();

        // Fetch designation for staff (Teachers)
        const staffUserIds = staffUsers.map(s => s._id);
        const teacherProfilesForStaff = await Teacher.find({ user: { $in: staffUserIds } }).select('user designation').lean();
        const staffDesignations = new Map();
        teacherProfilesForStaff.forEach(t => {
            if (t.designation) {
                staffDesignations.set(t.user.toString(), t.designation);
            }
        });

        // 4. Fetch all messages involving the teacher to compute last message and unread count
        const messages = await Message.find({
            $or: [{ sender: myId }, { receiver: myId }]
        })
        .sort({ createdAt: 1 })
        .lean();

        const lastMsgMap = new Map();
        const unreadMap = new Map();

        messages.forEach(msg => {
            const otherUserId = msg.sender.toString() === myId.toString() ? msg.receiver.toString() : msg.sender.toString();
            lastMsgMap.set(otherUserId, msg);
            if (msg.receiver.toString() === myId.toString() && msg.status !== 'read') {
                unreadMap.set(otherUserId, (unreadMap.get(otherUserId) || 0) + 1);
            }
        });

        const studentContacts = students.map(student => {
            const userId = student.user?._id?.toString();
            const lastMsg = lastMsgMap.get(userId);
            return {
                id: userId,
                name: student.user?.name || 'Unknown Student',
                photo: student.photo || student.user?.avatar || '',
                rollNo: student.rollNo || 'N/A',
                className: student.class?.name || 'N/A',
                role: 'student',
                lastMessage: lastMsg ? lastMsg.text : '',
                lastMessageTime: lastMsg ? lastMsg.createdAt : null,
                unread: unreadMap.get(userId) || 0,
                isOnline: false
            };
        });

        const parentContacts = [];
        parentsMap.forEach((val, parentUserId) => {
            const { parentProfile, studentName } = val;
            const lastMsg = lastMsgMap.get(parentUserId);
            parentContacts.push({
                id: parentUserId,
                name: parentProfile.fatherName || parentProfile.motherName || parentProfile.user?.name || 'Parent',
                photo: parentProfile.photo || parentProfile.user?.avatar || '',
                studentName: studentName,
                contactInfo: parentProfile.primaryContact || parentProfile.user?.email || '',
                role: 'parent',
                lastMessage: lastMsg ? lastMsg.text : '',
                lastMessageTime: lastMsg ? lastMsg.createdAt : null,
                unread: unreadMap.get(parentUserId) || 0,
                isOnline: false
            });
        });

        const staffContacts = staffUsers.map(staff => {
            const userId = staff._id.toString();
            const lastMsg = lastMsgMap.get(userId);
            const designation = staffDesignations.get(userId) || 
                                (staff.role ? staff.role.charAt(0).toUpperCase() + staff.role.slice(1) : 'Staff');
            return {
                id: userId,
                name: staff.name || 'Unknown Staff',
                photo: staff.avatar || '',
                designation: designation,
                role: staff.role || 'staff',
                lastMessage: lastMsg ? lastMsg.text : '',
                lastMessageTime: lastMsg ? lastMsg.createdAt : null,
                unread: unreadMap.get(userId) || 0,
                isOnline: false
            };
        });

        res.status(200).json({
            success: true,
            data: {
                students: studentContacts,
                parents: parentContacts,
                staff: staffContacts
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get full chat history with a specific user
 * @route   GET /api/messages/:receiverId
 * @access  Private
 */
export const getChatHistory = async (req, res) => {
    try {
        const myId = req.user._id;
        const schoolId = req.user.school;
        const { receiverId } = req.params;

        // PERMISSION CHECK
        if (req.user.role === 'student') {
            const studentProfile = await Student.findOne({ user: myId }).lean();
            if (!studentProfile) {
                return res.status(404).json({ success: false, message: 'Student profile not found' });
            }

            const teachers = await Teacher.find({
                assignedClasses: studentProfile.class,
                school: schoolId
            }).lean();

            const allowedTeacherUserIds = teachers.map(t => t.user?.toString()).filter(Boolean);

            if (!allowedTeacherUserIds.includes(receiverId)) {
                return res.status(403).json({ success: false, message: 'Access denied: You are not authorized to communicate with this user.' });
            }
        } else {
            const teacherProfile = await Teacher.findOne({ user: myId }).lean();
            if (!teacherProfile) {
                return res.status(404).json({ success: false, message: 'Teacher profile not found' });
            }
            const assignedClasses = teacherProfile.assignedClasses || [];

            // 1. Fetch Students assigned to this teacher
            const students = await Student.find({
                class: { $in: assignedClasses },
                school: schoolId
            }).lean();
            const allowedStudentUserIds = students.map(s => s.user?.toString()).filter(Boolean);

            // 2. Fetch Parent user IDs
            const studentIds = students.map(s => s._id);
            const parentIds = students.map(s => s.parent?.toString() || s.parent).filter(Boolean);
            const parents = await Parent.find({
                $or: [
                    { _id: { $in: parentIds } },
                    { students: { $in: studentIds } }
                ],
                school: schoolId
            }).lean();
            const allowedParentUserIds = parents.map(p => p.user?.toString()).filter(Boolean);

            // 3. Fetch Staff user IDs
            const staffUsers = await User.find({
                school: schoolId,
                role: { $in: ['principal', 'admin', 'teacher', 'support_staff'] }
            }).select('_id').lean();
            const allowedStaffUserIds = staffUsers.map(s => s._id.toString());

            const isAllowed = allowedStudentUserIds.includes(receiverId) ||
                              allowedParentUserIds.includes(receiverId) ||
                              allowedStaffUserIds.includes(receiverId);

            if (!isAllowed) {
                return res.status(403).json({ success: false, message: 'Access denied: You are not authorized to communicate with this user.' });
            }
        }

        const messages = await Message.find({
            $or: [
                { sender: myId, receiver: receiverId },
                { sender: receiverId, receiver: myId }
            ]
        })
        .sort({ createdAt: 1 })
        .lean();

        // Mark incoming messages as read since we just opened the chat
        await Message.updateMany(
            { sender: receiverId, receiver: myId, status: { $ne: 'read' } },
            { $set: { status: 'read' } }
        );

        // Format for the React UI
        const formattedMessages = messages.map(msg => ({
            id: msg._id,
            sender: msg.sender.toString() === myId.toString() ? 'me' : 'them',
            text: msg.text,
            time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: msg.status
        }));

        res.status(200).json({ success: true, data: formattedMessages });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Send a new message
 * @route   POST /api/messages/:receiverId
 * @access  Private
 */
export const sendMessage = async (req, res) => {
    try {
        const senderId = req.user._id;
        const schoolId = req.user.school;
        const { receiverId } = req.params;
        const { text } = req.body;

        // PERMISSION CHECK
        if (req.user.role === 'student') {
            const studentProfile = await Student.findOne({ user: senderId }).lean();
            if (!studentProfile) {
                return res.status(404).json({ success: false, message: 'Student profile not found' });
            }

            const teachers = await Teacher.find({
                assignedClasses: studentProfile.class,
                school: schoolId
            }).lean();

            const allowedTeacherUserIds = teachers.map(t => t.user?.toString()).filter(Boolean);

            if (!allowedTeacherUserIds.includes(receiverId)) {
                return res.status(403).json({ success: false, message: 'Access denied: You are not authorized to communicate with this user.' });
            }
        } else {
            const teacherProfile = await Teacher.findOne({ user: senderId }).lean();
            if (!teacherProfile) {
                return res.status(404).json({ success: false, message: 'Teacher profile not found' });
            }
            const assignedClasses = teacherProfile.assignedClasses || [];

            // 1. Fetch Students assigned to this teacher
            const students = await Student.find({
                class: { $in: assignedClasses },
                school: schoolId
            }).lean();
            const allowedStudentUserIds = students.map(s => s.user?.toString()).filter(Boolean);

            // 2. Fetch Parent user IDs
            const studentIds = students.map(s => s._id);
            const parentIds = students.map(s => s.parent?.toString() || s.parent).filter(Boolean);
            const parents = await Parent.find({
                $or: [
                    { _id: { $in: parentIds } },
                    { students: { $in: studentIds } }
                ],
                school: schoolId
            }).lean();
            const allowedParentUserIds = parents.map(p => p.user?.toString()).filter(Boolean);

            // 3. Fetch Staff user IDs
            const staffUsers = await User.find({
                school: schoolId,
                role: { $in: ['principal', 'admin', 'teacher', 'support_staff'] }
            }).select('_id').lean();
            const allowedStaffUserIds = staffUsers.map(s => s._id.toString());

            const isAllowed = allowedStudentUserIds.includes(receiverId) ||
                              allowedParentUserIds.includes(receiverId) ||
                              allowedStaffUserIds.includes(receiverId);

            if (!isAllowed) {
                return res.status(403).json({ success: false, message: 'Access denied: You are not authorized to communicate with this user.' });
            }
        }

        const newMessage = await Message.create({
            school: schoolId,
            sender: senderId,
            receiver: receiverId,
            text,
            status: 'sent'
        });

        res.status(201).json({
            success: true,
            data: {
                id: newMessage._id,
                sender: 'me',
                text: newMessage.text,
                time: new Date(newMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: newMessage.status
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};