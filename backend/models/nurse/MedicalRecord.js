import mongoose from 'mongoose';

const MedicalRecordSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  nurseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Nurse', required: true },
  diagnosis: { type: String, required: true },
  treatment: { type: String },
  date: { type: Date, default: Date.now }
});

const MedicalRecord = mongoose.model('MedicalRecord', MedicalRecordSchema);
export default MedicalRecord;
