const router = require('express').Router();
const LabTest = require('../models/LabTest');
const NotificationService = require('../utils/notificationService');
const { auth, authorize } = require('../middleware/auth');
const { upload, setUploadType } = require('../middleware/upload');

// Book lab test
router.post('/', auth, async (req, res) => {
  try {
    const { patientId, doctorId, hospitalId, testName, testCode, category, priority, notes, cost } = req.body;
    const labTest = await LabTest.create({
      patient: patientId || req.user._id,
      doctor: doctorId,
      hospital: hospitalId,
      testName,
      testCode,
      category,
      priority,
      notes,
      cost
    });
    res.status(201).json({ success: true, data: labTest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get lab tests for patient
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const tests = await LabTest.find({ patient: req.params.patientId })
      .populate('doctor', 'firstName lastName')
      .populate('hospital', 'name')
      .sort({ orderedDate: -1 });
    res.json({ success: true, data: tests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get my lab tests
router.get('/my', auth, async (req, res) => {
  try {
    const tests = await LabTest.find({ patient: req.user._id })
      .populate('doctor', 'firstName lastName')
      .populate('hospital', 'name')
      .sort({ orderedDate: -1 });
    res.json({ success: true, data: tests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update test status
router.put('/:id/status', auth, authorize('doctor', 'receptionist', 'admin'), async (req, res) => {
  try {
    const update = { status: req.body.status };
    if (req.body.status === 'sample-collected') update.sampleCollectedAt = new Date();
    if (req.body.status === 'completed') update.completedAt = new Date();

    const test = await LabTest.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, data: test });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upload lab results
router.put('/:id/results', auth, authorize('doctor', 'admin'), setUploadType('lab'), upload.array('files', 5), async (req, res) => {
  try {
    const { results, interpretation } = req.body;
    const files = (req.files || []).map(f => ({
      filename: f.filename,
      originalName: f.originalname,
      path: `/uploads/lab-reports/${f.filename}`,
      mimetype: f.mimetype
    }));

    const test = await LabTest.findByIdAndUpdate(req.params.id, {
      results: results ? JSON.parse(results) : [],
      files,
      interpretation,
      status: 'completed',
      completedAt: new Date()
    }, { new: true });

    // Notify doctor
    if (test.doctor) {
      const io = req.app.get('io');
      await NotificationService.createAndSend(io, test.doctor, 'lab-result',
        'Lab Result Available',
        `Lab results for ${test.testName} are now available`,
        { labTestId: test._id }
      );
      test.doctorNotified = true;
      test.doctorNotifiedAt = new Date();
      await test.save();
    }

    // Notify patient
    const io = req.app.get('io');
    await NotificationService.labResult(io, test.patient, test.testName);

    res.json({ success: true, data: test });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single test
router.get('/:id', auth, async (req, res) => {
  try {
    const test = await LabTest.findById(req.params.id)
      .populate('patient', 'firstName lastName dateOfBirth gender')
      .populate('doctor', 'firstName lastName specialization')
      .populate('hospital', 'name');
    if (!test) return res.status(404).json({ success: false, message: 'Test not found' });
    res.json({ success: true, data: test });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Lab result trend analysis
router.get('/trends/:patientId', auth, async (req, res) => {
  try {
    const { testName, parameter } = req.query;
    const tests = await LabTest.find({
      patient: req.params.patientId,
      testName: { $regex: testName, $options: 'i' },
      status: 'completed'
    }).sort({ completedAt: 1 });

    const trends = tests.map(t => {
      const result = parameter ? t.results.find(r => r.parameter === parameter) : t.results[0];
      return { date: t.completedAt, parameter: result?.parameter, value: result?.value, unit: result?.unit, flag: result?.flag };
    }).filter(t => t.value !== undefined);

    res.json({ success: true, data: trends });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
