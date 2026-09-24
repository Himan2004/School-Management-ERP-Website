import mongoose from "mongoose";

const schoolRequestSchema = new mongoose.Schema({
  // School Info
  schoolName: { type: String, required: true, trim: true },
  yearOfEstablishment: { type: String },
  board: { type: String },
  schoolRanking: { type: String },
  country: { type: String },
  state: { type: String },
  city: { type: String },
  pinCode: { type: String },
  address: { type: String, required: true },
  officialPhone: { type: String, required: true },
  officialEmail: { type: String, required: true, lowercase: true },
  website: { type: String },

  // Organization Info
  organization: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization',
    required: true 
  },
  branchCreationId: { 
    type: String, 
    required: true,
    trim: true 
  },

  // Students Info
  totalStudents: { type: String },
  totalTeachers: { type: String },
  gradesOffered: { type: String },
  mediumOfInstruction: { type: String },
  schoolType: { type: String },   // Co-ed / Boys / Girls

  // Principal & Staff
  principalName: { type: String },
  principalEmail: { type: String },
  principalPhone: { type: String },
  totalTeachingStaff: { type: String },
  totalNonTeachingStaff: { type: String },
  totalStaff: { type: String },

  // Status
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  },
  loginId: { type: String, default: null },
  rejectionReason: { type: String, default: null },
  processedAt: { type: Date, default: null },
}, {
  timestamps: true,
});

export default mongoose.model('SchoolRequest', schoolRequestSchema);