import mongoose from 'mongoose';

const EmergencyContactSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  name: { type: String, required: true },
  relation: { type: String, required: true },
  phone: { type: String, required: true }
});

const EmergencyContact = mongoose.model('EmergencyContact', EmergencyContactSchema);
export default EmergencyContact;
