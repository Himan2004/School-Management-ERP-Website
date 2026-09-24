import mongoose from 'mongoose';

const periodSchema = new mongoose.Schema({
  periodName: {
    type: String,
    required: [true, 'period name is required'],
    trim: true,
    maxlength: [100, 'period name cannot exceed 100 characters']
  },
  gradeLevel: {
    type: String,
    required: [true, 'Grade level is required'],
    trim: true,
  },
  section: {
    type: String,
    trim: true,
  },
  academicYear: {
    type: String,
    required: [true, 'Academic year is required'],
    trim: true,
  },
  homeroomTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher'
  },
  // ADDED: These match the controller to prevent the strictPopulate crash
  classTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  classTeacherName: {
    type: String,
    trim: true
  },
  subjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  }],
  maxCapacity: {
    type: Number,
    default: 40,
    min: [1, 'Maximum capacity must be at least 1'],
    max: [200, 'Maximum capacity cannot exceed 200']
  },
  currentStrength: {
    type: Number,
    default: 0,
    min: [0, 'Current strength cannot be negative']
  },
  roomNumber: {
    type: String,
    trim: true,
    maxlength: [20, 'Room number cannot exceed 20 characters']
  },
  schedule: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'School ID is required'],
    index: true
  }
}, {
  timestamps: true 
});

periodSchema.index({ schoolId: 1, gradeLevel: 1, section: 1, academicYear: 1 }, { unique: true });
periodSchema.index({ schoolId: 1, gradeLevel: 1 });
periodSchema.index({ schoolId: 1, academicYear: 1 });
periodSchema.index({ schoolId: 1, status: 1 });
periodSchema.index({ schoolId: 1, homeroomTeacher: 1 });
periodSchema.index({ schoolId: 1, classTeacher: 1 });

const Period = mongoose.model('Period', periodSchema);
export default Period;