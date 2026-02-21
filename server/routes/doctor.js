const router = require('express').Router();
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Schedule = require('../models/Schedule');
const Queue = require('../models/Queue');
const Feedback = require('../models/Feedback');
const QueueEngine = require('../utils/queueEngine');
const { auth, authorize } = require('../middleware/auth');

// Doctor dashboard
router.get('/dashboard', auth, authorize('doctor'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayAppointments, pendingCases, queue, ratings] = await Promise.all([
      Appointment.find({
        doctor: req.user._id,
        date: { $gte: today, $lt: tomorrow },
        status: { $nin: ['cancelled'] }
      }).populate('patient', 'firstName lastName phone profilePhoto dateOfBirth gender bloodGroup allergies')
        .sort({ tokenNumber: 1 }),
      Appointment.countDocuments({
        doctor: req.user._id,
        status: 'in-progress'
      }),
      Queue.findOne({
        doctor: req.user._id,
        date: { $gte: today, $lt: tomorrow }
      }),
      Feedback.aggregate([
        { $match: { doctor: req.user._id } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
      ])
    ]);

    const completed = todayAppointments.filter(a => a.status === 'completed').length;
    const waiting = todayAppointments.filter(a => a.status === 'confirmed' || a.status === 'checked-in').length;

    res.json({
      success: true,
      data: {
        todayAppointments,
        stats: {
          total: todayAppointments.length,
          completed,
          waiting,
          pendingCases,
          averageRating: ratings[0]?.avg || 0,
          totalRatings: ratings[0]?.count || 0
        },
        queue
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get schedule
router.get('/schedule', auth, authorize('doctor', 'receptionist', 'admin'), async (req, res) => {
  try {
    const doctorId = req.query.doctorId || req.user._id;
    const schedules = await Schedule.find({ doctor: doctorId }).populate('hospital', 'name');
    res.json({ success: true, data: schedules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Set availability
router.post('/schedule', auth, authorize('doctor', 'receptionist', 'admin'), async (req, res) => {
  try {
    const { doctorId, schedules } = req.body;
    const targetDoctorId = doctorId || req.user._id;

    const results = [];
    for (const sched of schedules) {
      const existing = await Schedule.findOne({ doctor: targetDoctorId, dayOfWeek: sched.dayOfWeek, hospital: sched.hospital });
      if (existing) {
        Object.assign(existing, sched);
        await existing.save();
        results.push(existing);
      } else {
        const newSched = await Schedule.create({ ...sched, doctor: targetDoctorId });
        results.push(newSched);
      }
    }
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Block time slots
router.post('/block-slots', auth, authorize('doctor', 'receptionist'), async (req, res) => {
  try {
    const { doctorId, date, reason, isFullDay, startTime, endTime } = req.body;
    const targetId = doctorId || req.user._id;
    const dayOfWeek = new Date(date).getDay();

    const schedule = await Schedule.findOne({ doctor: targetId, dayOfWeek });
    if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });

    schedule.blockedDates.push({ date, reason, isFullDay, startTime, endTime });
    await schedule.save();
    res.json({ success: true, data: schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Set emergency-only slots
router.post('/emergency-slots', auth, authorize('doctor'), async (req, res) => {
  try {
    const { dayOfWeek, slots } = req.body;
    const schedule = await Schedule.findOne({ doctor: req.user._id, dayOfWeek });
    if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });

    schedule.emergencySlots = slots;
    await schedule.save();
    res.json({ success: true, data: schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Start consultation
router.post('/start-consultation/:appointmentId', auth, authorize('doctor'), async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(req.params.appointmentId, {
      status: 'in-progress',
      consultationStartTime: new Date()
    }, { new: true }).populate('patient');

    await QueueEngine.startConsultation(req.user._id, appointment.patient._id);

    const io = req.app.get('io');
    io.to(`queue_${req.user._id}_${new Date().toISOString().split('T')[0]}`).emit('queueUpdate', { currentToken: appointment.tokenNumber });

    res.json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Complete consultation
router.post('/complete-consultation/:appointmentId', auth, authorize('doctor'), async (req, res) => {
  try {
    const { diagnosis, consultationNotes, followUpDate, followUpNotes } = req.body;
    const appointment = await Appointment.findByIdAndUpdate(req.params.appointmentId, {
      status: 'completed',
      consultationEndTime: new Date(),
      diagnosis,
      consultationNotes,
      followUpDate,
      followUpNotes
    }, { new: true }).populate('patient');

    await QueueEngine.completeConsultation(req.user._id, appointment.patient._id);

    const io = req.app.get('io');
    io.to(`queue_${req.user._id}_${new Date().toISOString().split('T')[0]}`).emit('queueUpdate', { action: 'completed' });

    res.json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Skip patient
router.post('/skip-patient/:appointmentId', auth, authorize('doctor'), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId);
    await QueueEngine.skipPatient(req.user._id, appointment.patient);
    appointment.status = 'no-show';
    await appointment.save();
    res.json({ success: true, message: 'Patient skipped' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Pause queue
router.post('/pause-queue', auth, authorize('doctor'), async (req, res) => {
  try {
    const queue = await QueueEngine.pauseQueue(req.user._id, req.body.reason);
    const io = req.app.get('io');
    io.to(`queue_${req.user._id}_${new Date().toISOString().split('T')[0]}`).emit('queuePaused', { reason: req.body.reason });
    res.json({ success: true, data: queue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Resume queue
router.post('/resume-queue', auth, authorize('doctor'), async (req, res) => {
  try {
    const queue = await QueueEngine.resumeQueue(req.user._id);
    const io = req.app.get('io');
    io.to(`queue_${req.user._id}_${new Date().toISOString().split('T')[0]}`).emit('queueResumed', {});
    res.json({ success: true, data: queue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Doctor analytics
router.get('/analytics', auth, authorize('doctor'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();

    const [appointments, feedbacks] = await Promise.all([
      Appointment.find({
        doctor: req.user._id,
        date: { $gte: start, $lte: end }
      }),
      Feedback.find({ doctor: req.user._id, createdAt: { $gte: start, $lte: end } })
    ]);

    const completed = appointments.filter(a => a.status === 'completed');
    const totalRevenue = completed.length * (req.user.consultationFee || 0);
    const avgConsultTime = completed.reduce((sum, a) => {
      if (a.consultationStartTime && a.consultationEndTime) {
        return sum + (a.consultationEndTime - a.consultationStartTime) / 60000;
      }
      return sum;
    }, 0) / (completed.length || 1);

    const followUps = appointments.filter(a => a.type === 'follow-up');
    const avgRating = feedbacks.reduce((s, f) => s + f.rating, 0) / (feedbacks.length || 1);

    // Patients per day
    const dailyStats = {};
    appointments.forEach(a => {
      const day = a.date.toISOString().split('T')[0];
      dailyStats[day] = (dailyStats[day] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        totalPatients: appointments.length,
        completedConsultations: completed.length,
        averageConsultationTime: Math.round(avgConsultTime),
        followUpRate: ((followUps.length / (appointments.length || 1)) * 100).toFixed(1),
        averageRating: avgRating.toFixed(1),
        totalRevenue,
        patientsPerDay: dailyStats,
        noShowRate: ((appointments.filter(a => a.status === 'no-show').length / (appointments.length || 1)) * 100).toFixed(1)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Follow-up tracking
router.get('/follow-ups', auth, authorize('doctor'), async (req, res) => {
  try {
    const followUps = await Appointment.find({
      doctor: req.user._id,
      followUpDate: { $exists: true, $ne: null },
      followUpCompleted: false
    }).populate('patient', 'firstName lastName phone')
      .sort({ followUpDate: 1 });

    res.json({ success: true, data: followUps });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get doctor's patients
router.get('/my-patients', auth, authorize('doctor'), async (req, res) => {
  try {
    const appointments = await Appointment.find({
      doctor: req.user._id,
      status: { $in: ['completed', 'in-progress', 'confirmed', 'checked-in'] }
    }).distinct('patient');

    const User = require('../models/User');
    const patients = await User.find({ _id: { $in: appointments } })
      .select('firstName lastName phone email dateOfBirth gender bloodGroup allergies ongoingMedications chronicConditions profilePhoto')
      .sort({ firstName: 1 });

    res.json({ success: true, data: patients });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Leave management
router.post('/leave', auth, authorize('doctor'), async (req, res) => {
  try {
    const { startDate, endDate, reason } = req.body;
    const schedules = await Schedule.find({ doctor: req.user._id });
    for (const sched of schedules) {
      sched.leaves.push({ startDate, endDate, reason, status: 'pending' });
      await sched.save();
    }
    res.json({ success: true, message: 'Leave request submitted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
