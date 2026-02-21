const router = require('express').Router();
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Billing = require('../models/Billing');
const Feedback = require('../models/Feedback');
const Queue = require('../models/Queue');
const Bed = require('../models/Bed');
const Hospital = require('../models/Hospital');
const { auth, authorize } = require('../middleware/auth');

// Admin analytics dashboard
router.get('/', auth, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const hospitalId = req.query.hospitalId || req.user.hospital;
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();

    const hospitalFilter = hospitalId ? { hospital: hospitalId } : {};

    const [
      totalPatients,
      totalDoctors,
      appointments,
      billing,
      feedbacks,
      beds
    ] = await Promise.all([
      User.countDocuments({ role: 'patient', ...hospitalFilter }),
      User.countDocuments({ role: 'doctor', ...hospitalFilter }),
      Appointment.find({ ...hospitalFilter, date: { $gte: start, $lte: end } }),
      Billing.find({ ...hospitalFilter, date: { $gte: start, $lte: end } }),
      Feedback.find({ ...hospitalFilter, createdAt: { $gte: start, $lte: end } }),
      hospitalId ? Bed.find({ hospital: hospitalId }) : []
    ]);

    // Calculate metrics
    const totalAppointments = appointments.length;
    const completedAppts = appointments.filter(a => a.status === 'completed').length;
    const noShows = appointments.filter(a => a.status === 'no-show').length;
    const cancelled = appointments.filter(a => a.status === 'cancelled').length;

    // Peak hours
    const hourCounts = {};
    appointments.forEach(a => {
      const hour = a.timeSlot?.startTime?.split(':')[0];
      if (hour) hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];

    // Average wait time from queues
    const queues = await Queue.find({ ...hospitalFilter, date: { $gte: start, $lte: end } });
    let totalWait = 0, waitCount = 0;
    queues.forEach(q => {
      q.entries.forEach(e => {
        if (e.calledAt && e.checkedInAt) {
          totalWait += (e.calledAt - e.checkedInAt) / 60000;
          waitCount++;
        }
      });
    });

    // Revenue
    const totalRevenue = billing.reduce((sum, b) => sum + (b.paidAmount || 0), 0);

    // Bed occupancy
    const totalBeds = beds.length;
    const occupiedBeds = beds.filter(b => b.status === 'occupied').length;

    // Doctor performance
    const doctorStats = await Appointment.aggregate([
      { $match: { ...hospitalFilter, date: { $gte: start, $lte: end }, status: 'completed' } },
      { $group: { _id: '$doctor', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users', localField: '_id', foreignField: '_id',
          as: 'doctor'
        }
      },
      { $unwind: '$doctor' },
      { $project: { name: { $concat: ['$doctor.firstName', ' ', '$doctor.lastName'] }, specialization: '$doctor.specialization', count: 1, rating: '$doctor.averageRating' } }
    ]);

    // Daily trend
    const dailyTrend = {};
    appointments.forEach(a => {
      const day = a.date.toISOString().split('T')[0];
      dailyTrend[day] = (dailyTrend[day] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        totalPatients,
        totalDoctors,
        totalAppointments,
        completedAppointments: completedAppts,
        noShowRate: totalAppointments ? ((noShows / totalAppointments) * 100).toFixed(1) : 0,
        cancellationRate: totalAppointments ? ((cancelled / totalAppointments) * 100).toFixed(1) : 0,
        peakHour: peakHour ? `${peakHour[0]}:00` : 'N/A',
        averageWaitTime: waitCount ? Math.round(totalWait / waitCount) : 0,
        totalRevenue,
        bedOccupancyRate: totalBeds ? ((occupiedBeds / totalBeds) * 100).toFixed(1) : 0,
        doctorPerformance: doctorStats,
        averageRating: feedbacks.length ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1) : 0,
        dailyTrend
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
