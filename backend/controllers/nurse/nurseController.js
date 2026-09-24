import Nurse from '../../models/nurse/Nurse.js';

const nurseController = {
  // Get nurse details
  async getNurseDetails(req, res) {
    try {
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
      res.json(nurse);
    } catch (err) {
      res.status(500).json({ message: err.message || 'Server error' });
    }
  }
};

export default nurseController;
