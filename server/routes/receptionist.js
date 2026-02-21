const router = require('express').Router();
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Bed = require('../models/Bed');
const Schedule = require('../models/Schedule');
const Billing = require('../models/Billing');
const QueueEngine = require('../utils/queueEngine');
const { auth, authorize } = require('../middleware/auth');

// Receptionist dashboard
router.get('/dashboard', auth, authorize('receptionist'), async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayAppointments, walkIns, beds, doctors] = await Promise.all([
      Appointment.find({ hospital: hospitalId, date: { $gte: today, $lt: tomorrow } })
        .populate('patient', 'firstName lastName phone')
        .populate('doctor', 'firstName lastName specialization')
        .sort({ tokenNumber: 1 }),
      Appointment.countDocuments({ hospital: hospitalId, date: { $gte: today, $lt: tomorrow }, isWalkIn: true }),
      Bed.find({ hospital: hospitalId }),
      User.find({ hospital: hospitalId, role: 'doctor', isActive: true })
        .select('firstName lastName specialization')
    ]);

    const totalBeds = beds.length;
    const availableBeds = beds.filter(b => b.status === 'available').length;

    res.json({
      success: true,
      data: {
        todayAppointments,
        stats: {
          totalAppointments: todayAppointments.length,
          completed: todayAppointments.filter(a => a.status === 'completed').length,
          waiting: todayAppointments.filter(a => ['confirmed', 'checked-in'].includes(a.status)).length,
          walkIns,
          totalBeds,
          availableBeds
        },
        doctors
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all appointments for receptionist view
router.get('/appointments', auth, authorize('receptionist'), async (req, res) => {
  try {
    const Appointment = require('../models/Appointment');
    const { date } = req.query;
    const filter = {};
    if (req.user.hospital) filter.hospital = req.user.hospital;
    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      filter.date = { $gte: dayStart, $lt: dayEnd };
    }
    const appointments = await Appointment.find(filter)
      .populate('patient', 'firstName lastName phone')
      .populate('doctor', 'firstName lastName specialization')
      .populate('department', 'name')
      .sort({ date: 1, startTime: 1 });
    res.json({ success: true, data: appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all queues for receptionist view
router.get('/queues', auth, authorize('receptionist'), async (req, res) => {
  try {
    const Queue = require('../models/Queue');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const queues = await Queue.find({
      date: { $gte: today },
      ...(req.user.hospital && { hospital: req.user.hospital })
    })
      .populate('doctor', 'firstName lastName specialization profilePhoto')
      .populate('entries.patient', 'firstName lastName phone');
    res.json({ success: true, data: queues });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add walk-in patient
router.post('/walk-in', auth, authorize('receptionist'), async (req, res) => {
  try {
    const { patientId, doctorId, reason, priority, isEmergency } = req.body;
    const hospitalId = req.user.hospital;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find next available slot or add to end
    const existingAppts = await Appointment.countDocuments({
      doctor: doctorId, date: { $gte: today, $lt: new Date(today.getTime() + 86400000) },
      status: { $nin: ['cancelled'] }
    });

    const appointment = await Appointment.create({
      patient: patientId,
      doctor: doctorId,
      hospital: hospitalId,
      date: today,
      timeSlot: { startTime: 'Walk-in', endTime: 'Walk-in' },
      type: isEmergency ? 'emergency' : 'walk-in',
      reason,
      priority: isEmergency ? 'emergency' : (priority || 'normal'),
      isWalkIn: true,
      addedBy: req.user._id,
      status: 'checked-in'
    });

    // Add to queue
    await QueueEngine.addToQueue(
      doctorId, hospitalId,
      appointment._id, patientId,
      appointment.tokenNumber,
      appointment.priority
    );

    const populated = await appointment.populate([
      { path: 'patient', select: 'firstName lastName phone' },
      { path: 'doctor', select: 'firstName lastName' }
    ]);

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update doctor schedule
router.put('/doctor-schedule', auth, authorize('receptionist'), async (req, res) => {
  try {
    const { doctorId, schedules } = req.body;
    const results = [];
    for (const sched of schedules) {
      const existing = await Schedule.findOne({ doctor: doctorId, dayOfWeek: sched.dayOfWeek });
      if (existing) {
        Object.assign(existing, sched);
        await existing.save();
        results.push(existing);
      } else {
        results.push(await Schedule.create({ ...sched, doctor: doctorId }));
      }
    }
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Approve leave
router.put('/approve-leave', auth, authorize('receptionist', 'admin'), async (req, res) => {
  try {
    const { doctorId, leaveId, status } = req.body;
    const schedules = await Schedule.find({ doctor: doctorId });
    for (const sched of schedules) {
      const leave = sched.leaves.id(leaveId);
      if (leave) {
        leave.status = status;
        leave.approvedBy = req.user._id;
        await sched.save();
      }
    }
    res.json({ success: true, message: `Leave ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Bed management
router.get('/beds', auth, authorize('receptionist', 'admin'), async (req, res) => {
  try {
    const beds = await Bed.find({ hospital: req.user.hospital })
      .populate('patient', 'firstName lastName phone');
    res.json({ success: true, data: beds });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/beds', auth, authorize('receptionist', 'admin'), async (req, res) => {
  try {
    const bed = await Bed.create({ ...req.body, hospital: req.user.hospital });
    res.status(201).json({ success: true, data: bed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/beds/:id', auth, authorize('receptionist', 'admin'), async (req, res) => {
  try {
    const bed = await Bed.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: bed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Emergency bed allocation
router.post('/beds/:id/emergency-allocate', auth, authorize('receptionist', 'admin'), async (req, res) => {
  try {
    const bed = await Bed.findByIdAndUpdate(req.params.id, {
      status: 'occupied',
      patient: req.body.patientId,
      admittedAt: new Date(),
      isEmergencyAllocated: true
    }, { new: true });
    res.json({ success: true, data: bed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Daily reports
router.get('/reports/daily', auth, authorize('receptionist', 'admin'), async (req, res) => {
  try {
    const { date } = req.query;
    const reportDate = date ? new Date(date) : new Date();
    reportDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(reportDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const hospitalId = req.user.hospital;

    const [appointments, bills, beds, doctors] = await Promise.all([
      Appointment.find({ hospital: hospitalId, date: { $gte: reportDate, $lt: nextDay } })
        .populate('doctor', 'firstName lastName'),
      Billing.find({ hospital: hospitalId, date: { $gte: reportDate, $lt: nextDay } }),
      Bed.find({ hospital: hospitalId }),
      User.find({ hospital: hospitalId, role: 'doctor', isActive: true }).select('firstName lastName')
    ]);

    res.json({
      success: true,
      data: {
        date: reportDate,
        patientReport: {
          total: appointments.length,
          completed: appointments.filter(a => a.status === 'completed').length,
          noShow: appointments.filter(a => a.status === 'no-show').length,
          cancelled: appointments.filter(a => a.status === 'cancelled').length,
          walkIns: appointments.filter(a => a.isWalkIn).length
        },
        bedUtilization: {
          total: beds.length,
          occupied: beds.filter(b => b.status === 'occupied').length,
          available: beds.filter(b => b.status === 'available').length,
          maintenance: beds.filter(b => b.status === 'maintenance').length
        },
        revenue: {
          total: bills.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
          collected: bills.reduce((sum, b) => sum + (b.paidAmount || 0), 0),
          pending: bills.reduce((sum, b) => sum + (b.dueAmount || 0), 0)
        },
        doctorAttendance: doctors.map(d => ({
          name: `${d.firstName} ${d.lastName}`,
          appointments: appointments.filter(a => a.doctor?._id?.toString() === d._id.toString()).length
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
