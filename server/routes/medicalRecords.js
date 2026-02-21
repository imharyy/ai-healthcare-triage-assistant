const router = require('express').Router();
const MedicalRecord = require('../models/MedicalRecord');
const { auth, authorize } = require('../middleware/auth');
const { upload, setUploadType } = require('../middleware/upload');

// Get patient medical records
router.get('/', auth, async (req, res) => {
  try {
    const { patientId, type, category, page = 1, limit = 20 } = req.query;
    const targetId = patientId || req.user._id;

    // Check access
    if (patientId && req.user.role === 'patient' && patientId !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const filter = { patient: targetId };
    if (type) filter.type = type;
    if (category) filter.category = category;

    const records = await MedicalRecord.find(filter)
      .populate('doctor', 'firstName lastName specialization')
      .populate('hospital', 'name')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await MedicalRecord.countDocuments(filter);

    res.json({ success: true, data: records, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single record
router.get('/:id', auth, async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id)
      .populate('doctor', 'firstName lastName specialization')
      .populate('hospital', 'name')
      .populate('patient', 'firstName lastName dateOfBirth gender bloodGroup');

    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create medical record (doctor/system)
router.post('/', auth, authorize('doctor', 'admin', 'receptionist'), async (req, res) => {
  try {
    const record = await MedicalRecord.create({
      ...req.body,
      uploadedBy: req.user._id
    });
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upload medical reports (patient or doctor)
router.post('/upload', auth, setUploadType('record'), upload.array('files', 10), async (req, res) => {
  try {
    const { patientId, type, category, title, description, date } = req.body;
    const targetPatientId = patientId || req.user._id;
    const files = req.files.map(f => ({
      filename: f.filename,
      originalName: f.originalname,
      path: `/uploads/records/${f.filename}`,
      mimetype: f.mimetype,
      size: f.size
    }));

    const record = await MedicalRecord.create({
      patient: targetPatientId,
      type: type || 'lab-report',
      category: category || 'general',
      title: title || 'Uploaded Report',
      description,
      date: date || new Date(),
      files,
      uploadedBy: req.user._id
    });

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get graph data for chronic parameters
router.get('/graph/:patientId', auth, async (req, res) => {
  try {
    const { parameter } = req.query;
    const records = await MedicalRecord.find({
      patient: req.params.patientId,
      'labValues.parameter': parameter
    }).sort({ date: 1 });

    const graphData = records.map(r => {
      const val = r.labValues.find(v => v.parameter === parameter);
      return { date: r.date, value: val?.value, unit: val?.unit, normalRange: val?.normalRange };
    }).filter(d => d.value !== undefined);

    res.json({ success: true, data: graphData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add vitals to record
router.put('/:id/vitals', auth, authorize('doctor', 'receptionist'), async (req, res) => {
  try {
    const record = await MedicalRecord.findByIdAndUpdate(req.params.id,
      { vitals: req.body.vitals },
      { new: true }
    );
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
