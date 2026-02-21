const router = require('express').Router();
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const MedicalRecord = require('../models/MedicalRecord');
const { auth, authorize } = require('../middleware/auth');

// Get patient profile
router.get('/profile', auth, authorize('patient'), async (req, res) => {
  try {
    const patient = await User.findById(req.user._id).populate('hospital');
    res.json({ success: true, data: patient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get patient dashboard
router.get('/dashboard', auth, authorize('patient'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [upcomingAppointments, recentRecords, activeRx] = await Promise.all([
      Appointment.find({
        patient: req.user._id,
        date: { $gte: today },
        status: { $in: ['scheduled', 'confirmed'] }
      }).populate('doctor', 'firstName lastName specialization profilePhoto')
        .populate('hospital', 'name')
        .sort({ date: 1 }).limit(5),
      MedicalRecord.find({ patient: req.user._id })
        .sort({ date: -1 }).limit(5),
      User.findById(req.user._id).select('ongoingMedications allergies chronicConditions')
    ]);

    res.json({
      success: true,
      data: {
        upcomingAppointments,
        recentRecords,
        medications: activeRx?.ongoingMedications || [],
        allergies: activeRx?.allergies || [],
        chronicConditions: activeRx?.chronicConditions || []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Search doctors
router.get('/search-doctors', auth, async (req, res) => {
  try {
    const { specialization, name, hospital, department } = req.query;
    const filter = { role: 'doctor', isActive: true };
    if (specialization) filter.specialization = { $regex: specialization, $options: 'i' };
    if (name) filter.$or = [
      { firstName: { $regex: name, $options: 'i' } },
      { lastName: { $regex: name, $options: 'i' } }
    ];
    if (hospital) filter.hospital = hospital;

    // If department is specified, find doctors in that department
    if (department) {
      const Department = require('../models/Department');
      const dept = await Department.findById(department);
      if (dept && dept.doctors && dept.doctors.length > 0) {
        filter._id = { $in: dept.doctors };
      } else {
        // fallback: doctors with this department in their departments array
        filter.departments = department;
      }
    }

    const doctors = await User.find(filter)
      .select('firstName lastName specialization qualifications experience consultationFee averageRating profilePhoto hospital')
      .populate('hospital', 'name address');

    res.json({ success: true, data: doctors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get visit history
router.get('/visit-history', auth, authorize('patient'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const appointments = await Appointment.find({
      patient: req.user._id,
      status: 'completed'
    })
      .populate('doctor', 'firstName lastName specialization')
      .populate('hospital', 'name')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Appointment.countDocuments({
      patient: req.user._id, status: 'completed'
    });

    res.json({ success: true, data: appointments, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
