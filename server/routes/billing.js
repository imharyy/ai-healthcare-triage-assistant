const router = require('express').Router();
const Billing = require('../models/Billing');
const { auth, authorize } = require('../middleware/auth');
const { generateInvoicePDF } = require('../utils/pdfGenerator');

// Create bill
router.post('/', auth, authorize('receptionist', 'admin', 'doctor'), async (req, res) => {
  try {
    const billing = await Billing.create({
      ...req.body,
      generatedBy: req.user._id,
      dueAmount: req.body.totalAmount - (req.body.paidAmount || 0)
    });
    res.status(201).json({ success: true, data: billing });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get bills for patient
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const bills = await Billing.find({ patient: req.params.patientId })
      .populate('hospital', 'name')
      .sort({ date: -1 });
    res.json({ success: true, data: bills });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get today's bills
router.get('/today', auth, authorize('receptionist', 'admin'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const bills = await Billing.find({
      createdAt: { $gte: today, $lt: tomorrow },
      ...(req.user.hospital && { hospital: req.user.hospital })
    })
      .populate('patient', 'firstName lastName phone')
      .populate('generatedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: bills });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get my bills
router.get('/my', auth, async (req, res) => {
  try {
    const bills = await Billing.find({ patient: req.user._id })
      .populate('hospital', 'name')
      .sort({ date: -1 });
    res.json({ success: true, data: bills });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Process payment
router.put('/:id/pay', auth, async (req, res) => {
  try {
    const { amount, paymentMethod, transactionId } = req.body;
    const billing = await Billing.findById(req.params.id);
    if (!billing) return res.status(404).json({ success: false, message: 'Bill not found' });

    billing.paidAmount += amount;
    billing.dueAmount = billing.totalAmount - billing.paidAmount;
    billing.paymentMethod = paymentMethod;
    billing.paymentDate = new Date();
    billing.transactionId = transactionId;
    billing.paymentStatus = billing.dueAmount <= 0 ? 'paid' : 'partial';

    await billing.save();
    res.json({ success: true, data: billing });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Insurance claim
router.put('/:id/insurance', auth, authorize('receptionist', 'admin'), async (req, res) => {
  try {
    const billing = await Billing.findByIdAndUpdate(req.params.id, {
      insurance: req.body.insurance
    }, { new: true });
    res.json({ success: true, data: billing });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Pre-authorization
router.post('/:id/pre-auth', auth, authorize('receptionist', 'admin'), async (req, res) => {
  try {
    const billing = await Billing.findByIdAndUpdate(req.params.id, {
      'insurance.claimStatus': 'pre-authorized',
      'insurance.preAuthorizationId': req.body.preAuthId,
      'insurance.claimAmount': req.body.claimAmount
    }, { new: true });
    res.json({ success: true, data: billing });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Download invoice
router.get('/:id/download', auth, async (req, res) => {
  try {
    const billing = await Billing.findById(req.params.id)
      .populate('patient', 'firstName lastName')
      .populate('hospital', 'name address phone email');
    if (!billing) return res.status(404).json({ success: false, message: 'Bill not found' });

    if (billing.pdfPath) return res.json({ success: true, data: { downloadUrl: billing.pdfPath } });

    const pdfResult = await generateInvoicePDF(billing, billing.patient, billing.hospital);
    billing.pdfPath = pdfResult.filepath;
    await billing.save();
    res.json({ success: true, data: { downloadUrl: pdfResult.filepath } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single bill
router.get('/:id', auth, async (req, res) => {
  try {
    const billing = await Billing.findById(req.params.id)
      .populate('patient', 'firstName lastName phone email')
      .populate('hospital', 'name address phone')
      .populate('appointment')
      .populate('generatedBy', 'firstName lastName');
    if (!billing) return res.status(404).json({ success: false, message: 'Bill not found' });
    res.json({ success: true, data: billing });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
