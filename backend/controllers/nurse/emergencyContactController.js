import mongoose from 'mongoose';
import EmergencyContact from '../../models/nurse/EmergencyContact.js';

const emergencyContactController = {
  // Get all emergency contacts
  async getEmergencyContacts(req, res) {
    try {
      let contacts = await EmergencyContact.find().populate('studentId');
      if (contacts.length === 0) {
        const Student = mongoose.model('Student');
        const student = await Student.findOne();
        if (student) {
          const defaultContact = await EmergencyContact.create({
            studentId: student._id,
            name: 'Dr. Robert Carter',
            relation: 'Primary Care Physician',
            phone: '+1 (555) 019-4567'
          });
          contacts = [await EmergencyContact.findById(defaultContact._id).populate('studentId')];
        }
      }
      res.json({ success: true, data: contacts });
    } catch (err) {
      res.status(500).json({ message: err.message || 'Server error' });
    }
  }
};

export default emergencyContactController;
