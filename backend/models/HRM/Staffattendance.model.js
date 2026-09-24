import mongoose from 'mongoose';

const staffAttendanceSchema = new mongoose.Schema(
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
        staffId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        staffRole: {
            type: String,
            enum: ['teacher', 'admin', 'accountant', 'principal', 'support_staff'],
            required: true,
        },
        date: {
            type: Date,
            required: true,
            index: true,
        },
        clockIn: {
            type: Date,
        },
        clockOut: {
            type: Date,
        },
        totalHours: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: ['present', 'absent', 'half_day', 'on_leave', 'holiday', 'late'],
            default: 'absent',
            index: true,
        },
        isLate: {
            type: Boolean,
            default: false,
        },
        lateByMinutes: {
            type: Number,
            default: 0,
        },
        overtimeHours: {
            type: Number,
            default: 0,
        },
        leaveRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'StaffLeave',
            default: null,
        },
        markedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        remarks: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

staffAttendanceSchema.pre('save', function (next) {
    if (this.clockIn && this.clockOut) {
        const diffMs = this.clockOut - this.clockIn;
        this.totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
    }
    next();
});

staffAttendanceSchema.index({ staffId: 1, date: 1 }, { unique: true });
staffAttendanceSchema.index({ school: 1, date: 1, status: 1 });

const StaffAttendance = mongoose.model('StaffAttendance', staffAttendanceSchema);
export default StaffAttendance;