const router = require('express').Router();
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const Department = require('../models/Department');
const AuditLog = require('../models/AuditLog');
const { auth, authorize, audit } = require('../middleware/auth');

// CRUD Users
router.get('/users', auth, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { role, search, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (search) filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
    if (req.user.hospital) filter.hospital = req.user.hospital;

    const users = await User.find(filter)
      .populate('hospital', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);
    res.json({ success: true, data: users, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/users', auth, authorize('admin', 'superadmin'), audit('create', 'user'), async (req, res) => {
  try {
    const user = await User.create({
      ...req.body,
      hospital: req.body.hospital || req.user.hospital
    });
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/users/:id', auth, authorize('admin', 'superadmin'), audit('update', 'user'), async (req, res) => {
  try {
    const { password, ...updates } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/users/:id', auth, authorize('admin', 'superadmin'), audit('delete', 'user'), async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'User deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Role management
router.put('/users/:id/role', auth, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Hospital management
router.get('/hospitals', auth, authorize('superadmin'), async (req, res) => {
  try {
    const hospitals = await Hospital.find().populate('owner', 'firstName lastName email');
    res.json({ success: true, data: hospitals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/hospitals', auth, authorize('superadmin'), async (req, res) => {
  try {
    const hospital = await Hospital.create({ ...req.body, owner: req.user._id });
    res.status(201).json({ success: true, data: hospital });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Configure services
router.put('/hospitals/:id/services', auth, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(req.params.id, {
      services: req.body.services,
      facilities: req.body.facilities
    }, { new: true });
    res.json({ success: true, data: hospital });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Policies
router.put('/hospitals/:id/policies', auth, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(req.params.id, {
      policies: req.body.policies
    }, { new: true });
    res.json({ success: true, data: hospital });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Audit logs
router.get('/audit-logs', auth, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { page = 1, limit = 50, action, resource, userId } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (resource) filter.resource = resource;
    if (userId) filter.user = userId;
    if (req.user.hospital) filter.hospital = req.user.hospital;

    const logs = await AuditLog.find(filter)
      .populate('user', 'firstName lastName email role')
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(filter);
    res.json({ success: true, data: logs, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Access logs
router.get('/access-logs', auth, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const logs = await AuditLog.find({
      action: { $in: ['login', 'logout', 'access'] },
      ...(req.user.hospital && { hospital: req.user.hospital })
    })
      .populate('user', 'firstName lastName email role')
      .sort({ timestamp: -1 })
      .limit(100);

    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Subscription management
router.put('/hospitals/:id/subscription', auth, authorize('superadmin'), async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(req.params.id, {
      subscription: req.body.subscription
    }, { new: true });
    res.json({ success: true, data: hospital });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
