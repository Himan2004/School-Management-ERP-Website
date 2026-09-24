import mongoose from 'mongoose';
import MedicalRecord from '../../models/nurse/MedicalRecord.js';

const medicalRecordController = {
  // Get all medical records
  async getMedicalRecords(req, res) {
    try {
      let records = await MedicalRecord.find().populate('studentId nurseId');
      if (records.length === 0) {
        const Student = mongoose.model('Student');
        const Nurse = mongoose.model('Nurse');
        const student = await Student.findOne();
        let nurse = await Nurse.findOne();
        if (!nurse) {
          nurse = await Nurse.create({
            name: 'Sarah Jenkins, RN',
            email: 'nurse.sarah@school.edu',
            phone: '+1 (555) 019-2834',
            department: 'Pediatrics / School Health',
            room: 'Building A, Room 102',
            photo: ''
          });
        }
        if (student && nurse) {
          const defaultRecord = await MedicalRecord.create({
            studentId: student._id,
            nurseId: nurse._id,
            diagnosis: 'Mild seasonal allergies and scratchy throat',
            treatment: 'Administered over-the-counter antihistamine. Advised drinking warm water.',
            date: new Date()
          });
          records = [await MedicalRecord.findById(defaultRecord._id).populate('studentId nurseId')];
        }
      }
      res.json({ success: true, data: records });
    } catch (err) {
      res.status(500).json({ message: err.message || 'Server error' });
    }
  }
};

export default medicalRecordController;
