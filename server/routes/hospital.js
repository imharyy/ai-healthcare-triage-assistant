const router = require('express').Router();
const Hospital = require('../models/Hospital');
const Department = require('../models/Department');
const { auth, authorize } = require('../middleware/auth');

// List hospitals
router.get('/', async (req, res) => {
  try {
    const { city, type, search } = req.query;
    const filter = { isActive: true };
    if (city) filter['address.city'] = { $regex: city, $options: 'i' };
    if (type) filter.type = type;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const hospitals = await Hospital.find(filter).select('-subscription');
    res.json({ success: true, data: hospitals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get hospital details
router.get('/:id', async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id).populate('departments');
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });
    res.json({ success: true, data: hospital });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create hospital (admin/superadmin)
router.post('/', auth, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const hospital = await Hospital.create({ ...req.body, owner: req.user._id });
    res.status(201).json({ success: true, data: hospital });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update hospital
router.put('/:id', auth, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: hospital });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add department
router.post('/:id/departments', auth, authorize('admin'), async (req, res) => {
  try {
    const department = await Department.create({ ...req.body, hospital: req.params.id });
    await Hospital.findByIdAndUpdate(req.params.id, { $push: { departments: department._id } });
    res.status(201).json({ success: true, data: department });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get departments
router.get('/:id/departments', async (req, res) => {
  try {
    const departments = await Department.find({ hospital: req.params.id, isActive: true })
      .populate('head', 'firstName lastName')
      .populate('doctors', 'firstName lastName specialization');
    res.json({ success: true, data: departments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update department
router.put('/:id/departments/:deptId', auth, authorize('admin'), async (req, res) => {
  try {
    const dept = await Department.findOneAndUpdate(
      { _id: req.params.deptId, hospital: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });
    res.json({ success: true, data: dept });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete department
router.delete('/:id/departments/:deptId', auth, authorize('admin'), async (req, res) => {
  try {
    const dept = await Department.findOneAndUpdate(
      { _id: req.params.deptId, hospital: req.params.id },
      { isActive: false },
      { new: true }
    );
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });
    res.json({ success: true, message: 'Department deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update beds
router.put('/:id/beds', auth, authorize('receptionist', 'admin'), async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(req.params.id, { beds: req.body.beds }, { new: true });
    res.json({ success: true, data: hospital.beds });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
