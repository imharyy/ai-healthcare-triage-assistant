const router = require('express').Router();
const EmergencyRequest = require('../models/EmergencyRequest');
const Hospital = require('../models/Hospital');
const NotificationService = require('../utils/notificationService');
const { auth } = require('../middleware/auth');

// One-tap emergency
router.post('/', auth, async (req, res) => {
  try {
    const { type, description, latitude, longitude, address, contactNumber, hospitalId } = req.body;

    const emergency = await EmergencyRequest.create({
      patient: req.user._id,
      hospital: hospitalId,
      type: type || 'medical',
      description,
      location: { latitude, longitude, address },
      contactNumber: contactNumber || req.user.phone,
      priority: type === 'cardiac' || type === 'stroke' ? 'critical' : 'high'
    });

    // Notify hospital
    if (hospitalId) {
      const io = req.app.get('io');
      await NotificationService.emergencyAlert(io, hospitalId, {
        emergencyId: emergency._id,
        patientName: `${req.user.firstName} ${req.user.lastName}`,
        type: emergency.type,
        location: emergency.location,
        priority: emergency.priority
      });
    }

    res.status(201).json({ success: true, data: emergency });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Find nearest hospitals
router.get('/nearest-hospitals', auth, async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query;

    // If coordinates stored with 2dsphere index
    let hospitals;
    if (latitude && longitude) {
      hospitals = await Hospital.find({
        emergencyServices: true,
        isActive: true
      }).select('name address phone emergencyServices ambulanceAvailable beds').limit(10);
    } else {
      hospitals = await Hospital.find({
        emergencyServices: true,
        isActive: true
      }).select('name address phone emergencyServices ambulanceAvailable beds').limit(10);
    }

    res.json({ success: true, data: hospitals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update emergency status
router.put('/:id', auth, async (req, res) => {
  try {
    const { status, notes, ambulanceStatus } = req.body;
    const updates = {};
    if (status) updates.status = status;
    if (notes) updates.notes = notes;
    if (ambulanceStatus) updates.ambulanceStatus = ambulanceStatus;
    if (status === 'acknowledged') {
      updates.respondedBy = req.user._id;
      updates.respondedAt = new Date();
    }
    if (status === 'resolved') updates.resolvedAt = new Date();

    const emergency = await EmergencyRequest.findByIdAndUpdate(req.params.id, updates, { new: true });

    // Notify patient of status change
    const io = req.app.get('io');
    io.to(`user_${emergency.patient}`).emit('emergencyUpdate', { status: emergency.status, ambulanceStatus: emergency.ambulanceStatus });

    res.json({ success: true, data: emergency });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get active emergencies for hospital
router.get('/hospital/:hospitalId', auth, async (req, res) => {
  try {
    const emergencies = await EmergencyRequest.find({
      hospital: req.params.hospitalId,
      status: { $nin: ['resolved', 'cancelled'] }
    }).populate('patient', 'firstName lastName phone bloodGroup allergies')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: emergencies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get my emergencies
router.get('/my', auth, async (req, res) => {
  try {
    const emergencies = await EmergencyRequest.find({ patient: req.user._id })
      .populate('hospital', 'name phone address')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: emergencies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Request ambulance
router.post('/:id/ambulance', auth, async (req, res) => {
  try {
    const emergency = await EmergencyRequest.findByIdAndUpdate(req.params.id, {
      ambulanceRequested: true,
      ambulanceStatus: 'dispatched'
    }, { new: true });

    const io = req.app.get('io');
    io.to(`hospital_${emergency.hospital}`).emit('ambulanceRequested', { emergencyId: emergency._id });

    res.json({ success: true, data: emergency });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Share live location
router.put('/:id/location', auth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const emergency = await EmergencyRequest.findByIdAndUpdate(req.params.id, {
      'location.latitude': latitude,
      'location.longitude': longitude
    }, { new: true });

    const io = req.app.get('io');
    io.to(`hospital_${emergency.hospital}`).emit('locationUpdate', {
      emergencyId: emergency._id,
      location: { latitude, longitude }
    });

    res.json({ success: true, data: emergency });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
