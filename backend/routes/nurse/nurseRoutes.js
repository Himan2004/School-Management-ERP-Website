
import { Router } from 'express';
import nurseController from '../../controllers/nurse/nurseController.js';
import medicalRecordController from '../../controllers/nurse/medicalRecordController.js';
import emergencyContactController from '../../controllers/nurse/emergencyContactController.js';
import appointmentController from '../../controllers/nurse/appointmentController.js';

const router = Router();

// Get Nurse Details
router.get('/details', nurseController.getNurseDetails);

// Get Medical Records
router.get('/medical-records', medicalRecordController.getMedicalRecords);

// Get Emergency Contacts
router.get('/emergency-contacts', emergencyContactController.getEmergencyContacts);

// Book Appointment
router.post('/appointments', appointmentController.bookAppointment);

// Get Appointments
router.get('/appointments', appointmentController.getAppointments);

export default router;
