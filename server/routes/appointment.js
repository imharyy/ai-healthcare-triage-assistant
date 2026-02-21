const router = require('express').Router();
const Appointment = require('../models/Appointment');
const Schedule = require('../models/Schedule');
const Queue = require('../models/Queue');
const QueueEngine = require('../utils/queueEngine');
const NotificationService = require('../utils/notificationService');
const { auth, authorize } = require('../middleware/auth');

// Get available slots
router.get('/available-slots', auth, async (req, res) => {
  try {
    const { doctorId, date, hospitalId } = req.query;
    if (!doctorId || !date) return res.status(400).json({ success: false, message: 'doctorId and date required' });

    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.getDay();

    const schedule = await Schedule.findOne({
      doctor: doctorId,
      dayOfWeek,
      ...(hospitalId && { hospital: hospitalId })
    });

    if (!schedule || !schedule.isActive) {
      return res.json({ success: true, data: { available: false, slots: [], message: 'Doctor not available on this day' } });
    }

    // Check if date is blocked
    const isBlocked = schedule.blockedDates.some(bd => {
      const bDate = new Date(bd.date);
      return bDate.toDateString() === appointmentDate.toDateString() && bd.isFullDay;
    });
    if (isBlocked) return res.json({ success: true, data: { available: false, slots: [], message: 'Doctor is unavailable on this date' } });

    // Check if on leave
    const isOnLeave = schedule.leaves.some(l =>
      l.status === 'approved' && appointmentDate >= new Date(l.startDate) && appointmentDate <= new Date(l.endDate)
    );
    if (isOnLeave) return res.json({ success: true, data: { available: false, slots: [], message: 'Doctor is on leave' } });

    // Generate slots
    const slots = generateTimeSlots(schedule.startTime, schedule.endTime, schedule.slotDuration);

    // Get existing appointments for the day
    const dayStart = new Date(appointmentDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const existingAppointments = await Appointment.find({
      doctor: doctorId,
      date: { $gte: dayStart, $lt: dayEnd },
      status: { $nin: ['cancelled'] }
    });

    const bookedSlots = existingAppointments.map(a => a.timeSlot.startTime);

    const availableSlots = slots.map(slot => ({
      ...slot,
      isBooked: bookedSlots.includes(slot.startTime),
      isEmergencyOnly: schedule.emergencySlots.some(es => es.startTime === slot.startTime)
    }));

    // Check max patients
    const bookedCount = existingAppointments.length;
    const maxPatients = schedule.maxPatients;

    res.json({
      success: true,
      data: {
        available: true,
        slots: availableSlots,
        bookedCount,
        maxPatients,
        remainingSlots: maxPatients - bookedCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Book appointment
router.post('/', auth, async (req, res) => {
  try {
    const {
      doctorId, hospitalId, departmentId, date, startTime, endTime,
      type, reason, symptoms, priority, isWalkIn
    } = req.body;

    const patientId = req.body.patientId || req.user._id;

    // Check for conflicts
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const conflict = await Appointment.findOne({
      doctor: doctorId,
      date: { $gte: dayStart, $lt: dayEnd },
      'timeSlot.startTime': startTime,
      status: { $nin: ['cancelled', 'rescheduled'] }
    });

    if (conflict) return res.status(400).json({ success: false, message: 'This time slot is already booked' });

    const appointment = await Appointment.create({
      patient: patientId,
      doctor: doctorId,
      hospital: hospitalId,
      department: departmentId,
      date: dayStart,
      timeSlot: { startTime, endTime },
      type: type || 'clinic',
      reason,
      symptoms,
      priority: priority || 'normal',
      isWalkIn: isWalkIn || false,
      addedBy: isWalkIn ? req.user._id : undefined,
      status: 'scheduled'
    });

    const populated = await appointment.populate([
      { path: 'doctor', select: 'firstName lastName specialization' },
      { path: 'hospital', select: 'name' },
      { path: 'patient', select: 'firstName lastName phone' }
    ]);

    // Send notification
    const io = req.app.get('io');
    await NotificationService.createAndSend(io, patientId, 'appointment-confirmed',
      'Appointment Booked',
      `Appointment booked with Dr. ${populated.doctor.firstName} ${populated.doctor.lastName} on ${new Date(date).toLocaleDateString()} at ${startTime}`,
      { appointmentId: appointment._id }
    );

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reschedule appointment
router.put('/reschedule/:id', auth, async (req, res) => {
  try {
    const { date, startTime, endTime, reason } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    appointment.rescheduleHistory.push({
      previousDate: appointment.date,
      previousSlot: appointment.timeSlot,
      rescheduledAt: new Date(),
      reason
    });

    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    appointment.date = newDate;
    appointment.timeSlot = { startTime, endTime };
    appointment.status = 'rescheduled';

    // Regenerate token
    appointment.tokenNumber = undefined;
    await appointment.save();

    // Set status back to scheduled
    appointment.status = 'scheduled';
    await appointment.save();

    const io = req.app.get('io');
    await NotificationService.createAndSend(io, appointment.patient, 'appointment-confirmed',
      'Appointment Rescheduled',
      `Your appointment has been rescheduled to ${newDate.toLocaleDateString()} at ${startTime}`,
      { appointmentId: appointment._id }
    );

    res.json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cancel appointment
router.put('/cancel/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, {
      status: 'cancelled',
      cancelReason: req.body.reason,
      cancelledAt: new Date()
    }, { new: true });

    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    const io = req.app.get('io');
    await NotificationService.createAndSend(io, appointment.patient, 'appointment-cancelled',
      'Appointment Cancelled',
      'Your appointment has been cancelled',
      { appointmentId: appointment._id }
    );

    res.json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Confirm attendance (anti no-show)
router.put('/confirm/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, {
      confirmedByPatient: true,
      confirmationTime: new Date(),
      status: 'confirmed'
    }, { new: true });
    res.json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Check-in (arrive at hospital)
router.put('/check-in/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, {
      status: 'checked-in'
    }, { new: true });

    // Add to queue
    await QueueEngine.addToQueue(
      appointment.doctor, appointment.hospital,
      appointment._id, appointment.patient,
      appointment.tokenNumber, appointment.priority
    );

    const io = req.app.get('io');
    io.to(`queue_${appointment.doctor}_${appointment.date.toISOString().split('T')[0]}`).emit('patientCheckedIn', { tokenNumber: appointment.tokenNumber });

    res.json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get upcoming appointments
router.get('/upcoming', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointments = await Appointment.find({
      [req.user.role === 'doctor' ? 'doctor' : 'patient']: req.user._id,
      date: { $gte: today },
      status: { $in: ['scheduled', 'confirmed', 'checked-in'] }
    })
      .populate('doctor', 'firstName lastName specialization profilePhoto consultationFee')
      .populate('patient', 'firstName lastName phone profilePhoto')
      .populate('hospital', 'name address')
      .sort({ date: 1 });

    res.json({ success: true, data: appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get appointment history
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const filter = {
      [req.user.role === 'doctor' ? 'doctor' : 'patient']: req.user._id,
      status: { $in: ['completed', 'cancelled', 'no-show'] }
    };

    const appointments = await Appointment.find(filter)
      .populate('doctor', 'firstName lastName specialization')
      .populate('patient', 'firstName lastName')
      .populate('hospital', 'name')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Appointment.countDocuments(filter);

    res.json({ success: true, data: appointments, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single appointment
router.get('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctor', 'firstName lastName specialization phone profilePhoto consultationFee')
      .populate('patient', 'firstName lastName phone dateOfBirth gender bloodGroup allergies ongoingMedications chronicConditions profilePhoto')
      .populate('hospital', 'name address phone')
      .populate('department', 'name');

    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    res.json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get doctor's appointments (for doctor view)
router.get('/doctor-appointments', auth, authorize('doctor'), async (req, res) => {
  try {
    const { date } = req.query;
    const filter = { doctor: req.user._id };
    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      filter.date = { $gte: dayStart, $lt: dayEnd };
    }
    const appointments = await Appointment.find(filter)
      .populate('patient', 'firstName lastName phone dateOfBirth gender bloodGroup allergies profilePhoto')
      .populate('department', 'name')
      .sort({ date: 1, startTime: 1 });
    res.json({ success: true, data: appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

function generateTimeSlots(startTime, endTime, duration) {
  const slots = [];
  let [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const endMinutes = endH * 60 + endM;

  while (startH * 60 + startM + duration <= endMinutes) {
    const slotStart = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
    startM += duration;
    if (startM >= 60) { startH += Math.floor(startM / 60); startM %= 60; }
    const slotEnd = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
    slots.push({ startTime: slotStart, endTime: slotEnd });
  }
  return slots;
}

module.exports = router;
