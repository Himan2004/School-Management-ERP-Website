import mongoose from 'mongoose';

const attendeeSchema = new mongoose.Schema(
    {
        staffId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        hasAcknowledged: {
            type: Boolean,
            default: false,
        },
        acknowledgedAt: {
            type: Date,
            default: null,
        },
        attendanceStatus: {
            type: String,
            enum: ['pending', 'attended', 'absent', 'excused', 'confirmed', 'cancelled', 'declined'],
            default: 'pending',
        },
        selectedSlot: {
            type: String,
            default: '',
        },
        notes: {
            type: String,
            default: '',
        },
        declineReason: {
            type: String,
            default: '',
        },
    },
    { _id: false }
);

const staffMeetingSchema = new mongoose.Schema(
    {
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
            index: true,
        },
        school: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'School',
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        agenda: {
            type: String,
            trim: true,
        },
        meetingType: {
            type: String,
            enum: ['general', 'academic', 'disciplinary', 'emergency', 'department'],
            default: 'general',
        },
        scheduledAt: {
            type: Date,
            required: true,
            index: true,
        },
        durationMinutes: {
            type: Number,
            required: true,
            min: 1,
        },
        venue: {
            type: String,
            trim: true,
        },
        isOnline: {
            type: Boolean,
            default: false,
        },
        meetingLink: {
            type: String,
            trim: true,
        },
        targetRoles: [
            {
                type: String,

                targetRoles: [
                    {
                        type: String,
                        // Added 'parents', 'students', and 'board_members' to the enum list.
                        enum: ['all', 'board_members', 'principal', 'admin', 'accountant', 'teacher', 'support_staff', 'parents', 'students'],
                    },
                ],
                // enum: ['teacher', 'admin', 'accountant', 'principal', 'support_staff', 'all'],
            },
        ],
        attendees: {
            type: [attendeeSchema],
            default: [],
        },
        status: {
            type: String,
            enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
            default: 'scheduled',
            index: true,
        },
        minutesOfMeeting: {
            type: String,
            trim: true,
        },
        minutesDocUrl: {
            type: String,
            trim: true,
        },
        notificationSent: {
            type: Boolean,
            default: false,
        },
        reminder: {
            type: String,
            default: '1 Hour Before',
        },
        className: {
            type: String,
            trim: true,
            default: 'All Classes',
        },
        sectionName: {
            type: String,
            trim: true,
            default: 'All Sections',
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

staffMeetingSchema.index({ school: 1, scheduledAt: -1 });
staffMeetingSchema.index({ school: 1, status: 1 });

const StaffMeeting = mongoose.model('StaffMeeting', staffMeetingSchema);
export default StaffMeeting;