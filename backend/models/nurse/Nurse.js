import mongoose from 'mongoose';

const NurseSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  department: { type: String },
  room: { type: String },
  photo: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const Nurse = mongoose.model('Nurse', NurseSchema);
export default Nurse;
