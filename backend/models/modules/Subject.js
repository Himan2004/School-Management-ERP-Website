import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  subjectName: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true,
    maxlength: [100, 'Subject name cannot exceed 100 characters']
  },
  subjectCode: {
    type: String,
    required: [true, 'Subject code is required'],
    trim: true,
    uppercase: true,
    maxlength: [20, 'Subject code cannot exceed 20 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },

  // ==========================================
  // LEGACY FIELDS (Kept so other devs' code doesn't break)
  // ==========================================
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  gradeLevel: { type: String, trim: true },
  credits: { type: Number, default: 0 },

  // ==========================================
  // NEW FIELDS (For the new UI, added safely)
  // ==========================================
  type: {
    type: String,
    enum: ['Theory', 'Practical', 'Both'],
    default: 'Theory'
  },
  theoryMarks: { type: Number, default: 80 },
  practicalMarks: { type: Number, default: 0 },
  passMarks: { type: Number, default: 33 },
  assignedClasses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  }],
  
  status: {
    type: String,
    enum: ['active', 'inactive', 'Active', 'Inactive'], // Supports both casing styles
    default: 'Active'
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'School ID is required'],
    index: true
  }
}, {
  timestamps: true 
});

subjectSchema.index({ schoolId: 1, subjectCode: 1 }, { unique: true });
subjectSchema.index({ schoolId: 1, status: 1 });

export default mongoose.models.Subject || mongoose.model('Subject', subjectSchema);