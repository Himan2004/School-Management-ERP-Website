import StaffMeeting from '../../models/HRM/StaffMeeting.model.js';
import User from '../../models/users/user.model.js';

// ════════════════════════ STAFF MEETINGS ════════════════════════

// Get all meetings
export const getAllMeetings = async (req, res) => {
  try {
    const { school, organization, status } = req.query;
    const filter = {};

    if (school) filter.school = school;
    if (organization) filter.organization = organization;
    if (status) filter.status = status;

    const meetings = await StaffMeeting.find(filter)
      .populate('attendees.staffId', 'name email')
      .populate('school', 'schoolName')
      .sort({ scheduledTime: -1 });

    res.status(200).json({ 
      success: true, 
      data: meetings,
      count: meetings.length 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get meeting by ID
export const getMeetingById = async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await StaffMeeting.findById(id)
      .populate('attendees.staffId')
      .populate('school');

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    res.status(200).json({ success: true, data: meeting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create meeting
export const createMeeting = async (req, res) => {
  try {
    const {
      school,
      organization,
      title,
      agenda,
      meetingType,
      description,
      attendeeIds,
      scheduledTime,
      location,
      duration,
      remarks
    } = req.body;

    if (!school || !title || !scheduledTime || !attendeeIds || attendeeIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: school, title, scheduledTime, attendeeIds' 
      });
    }

    // Verify attendees exist
    const attendees = await User.find({ _id: { $in: attendeeIds } });
    if (attendees.length !== attendeeIds.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'Some attendees not found' 
      });
    }

    const attendeesList = attendeeIds.map(id => ({
      staffId: id,
      acknowledged: false
    }));

    const meeting = await StaffMeeting.create({
      school,
      organization,
      title,
      agenda: agenda || '',
      description: description || '',
      meetingType: meetingType || 'general',
      attendees: attendeesList,
      scheduledTime,
      location: location || 'TBD',
      duration: duration || 60,
      remarks,
      status: 'scheduled'
    });

    res.status(201).json({ 
      success: true, 
      message: 'Meeting created successfully',
      data: meeting 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update meeting
export const updateMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow changing status through this endpoint
    if (updates.status) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot change status through update endpoint' 
      });
    }

    const meeting = await StaffMeeting.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('attendees.staffId');

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Meeting updated successfully',
      data: meeting 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Acknowledge meeting
export const acknowledgeMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const { staffId } = req.body;

    if (!staffId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Staff ID is required' 
      });
    }

    const meeting = await StaffMeeting.findById(id);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const attendee = meeting.attendees.find(a => a.staffId.toString() === staffId);
    if (!attendee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Staff member is not an attendee of this meeting' 
      });
    }

    attendee.acknowledged = true;
    attendee.acknowledgedAt = new Date();
    await meeting.save();

    res.status(200).json({ 
      success: true, 
      message: 'Meeting acknowledged successfully',
      data: meeting 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Complete meeting
export const completeMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks, minutesOfMeeting } = req.body;

    const meeting = await StaffMeeting.findByIdAndUpdate(
      id,
      {
        status: 'completed',
        remarks,
        minutesOfMeeting: minutesOfMeeting || ''
      },
      { new: true }
    );

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Meeting marked as completed',
      data: meeting 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cancel meeting
export const cancelMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const meeting = await StaffMeeting.findByIdAndUpdate(
      id,
      {
        status: 'cancelled',
        cancellationReason: reason || ''
      },
      { new: true }
    );

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Meeting cancelled successfully',
      data: meeting 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get meeting acknowledgement status
export const getMeetingAcknowledgements = async (req, res) => {
  try {
    const { id } = req.params;

    const meeting = await StaffMeeting.findById(id)
      .populate('attendees.staffId', 'name email');

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const stats = {
      total: meeting.attendees.length,
      acknowledged: meeting.attendees.filter(a => a.acknowledged).length,
      pending: meeting.attendees.filter(a => !a.acknowledged).length,
      details: meeting.attendees
    };

    res.status(200).json({ 
      success: true, 
      data: stats 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get upcoming meetings for a staff
export const getUpcomingMeetings = async (req, res) => {
  try {
    const { staffId, school } = req.query;

    if (!staffId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Staff ID is required' 
      });
    }

    const filter = {
      'attendees.staffId': staffId,
      scheduledTime: { $gte: new Date() },
      status: { $in: ['scheduled', 'rescheduled'] }
    };

    if (school) filter.school = school;

    const meetings = await StaffMeeting.find(filter)
      .populate('attendees.staffId', 'name email')
      .sort({ scheduledTime: 1 });

    res.status(200).json({ 
      success: true, 
      data: meetings,
      count: meetings.length 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
