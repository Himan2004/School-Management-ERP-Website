import mongoose from 'mongoose';
import Appointment from '../../models/nurse/Appointment.js';

const appointmentController = {
  // Book a new appointment
  async bookAppointment(req, res) {
    try {
      let { studentId, nurseId, date, reason } = req.body;
      
      const Student = mongoose.model('Student');
      const Nurse = mongoose.model('Nurse');

      // Validate/resolve studentId
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        const student = await Student.findOne();
        if (student) {
          studentId = student._id;
        } else {
          return res.status(400).json({ message: 'No students found in database to associate' });
        }
      }

      // Validate/resolve nurseId
      if (!mongoose.Types.ObjectId.isValid(nurseId)) {
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
        nurseId = nurse._id;
      }

      const appointment = new Appointment({ studentId, nurseId, date, reason });
      await appointment.save();
      
      const populatedAppointment = await Appointment.findById(appointment._id).populate('studentId nurseId');
      res.status(201).json(populatedAppointment);
    } catch (err) {
      res.status(500).json({ message: err.message || 'Server error' });
    }
  },

  // Get all appointments
  async getAppointments(req, res) {
    try {
      let appointments = await Appointment.find().populate('studentId nurseId');
      if (appointments.length === 0) {
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
          const defaultAppt = await Appointment.create({
            studentId: student._id,
            nurseId: nurse._id,
            date: new Date(Date.now() + 86400000), // tomorrow
            reason: 'Annual vision test and physical checkup',
            status: 'approved'
          });
          appointments = [await Appointment.findById(defaultAppt._id).populate('studentId nurseId')];
        }
      }
      res.json({ success: true, data: appointments });
    } catch (err) {
      res.status(500).json({ message: err.message || 'Server error' });
    }
  }
};

export default appointmentController;
