const router = require('express').Router();
const Prescription = require('../models/Prescription');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const { generatePrescriptionPDF } = require('../utils/pdfGenerator');

// Drug database for templates
const drugDatabase = [
  { name: 'Paracetamol', genericName: 'Acetaminophen', dosages: ['500mg', '650mg'], frequencies: ['1-0-1', '1-1-1'], route: 'oral' },
  { name: 'Amoxicillin', genericName: 'Amoxicillin', dosages: ['250mg', '500mg'], frequencies: ['1-1-1'], route: 'oral' },
  { name: 'Omeprazole', genericName: 'Omeprazole', dosages: ['20mg', '40mg'], frequencies: ['1-0-0'], route: 'oral' },
  { name: 'Cetirizine', genericName: 'Cetirizine', dosages: ['10mg'], frequencies: ['0-0-1'], route: 'oral' },
  { name: 'Azithromycin', genericName: 'Azithromycin', dosages: ['250mg', '500mg'], frequencies: ['1-0-0'], route: 'oral' },
  { name: 'Metformin', genericName: 'Metformin', dosages: ['500mg', '850mg', '1000mg'], frequencies: ['1-0-1'], route: 'oral' },
  { name: 'Amlodipine', genericName: 'Amlodipine', dosages: ['2.5mg', '5mg', '10mg'], frequencies: ['1-0-0'], route: 'oral' },
  { name: 'Atorvastatin', genericName: 'Atorvastatin', dosages: ['10mg', '20mg', '40mg'], frequencies: ['0-0-1'], route: 'oral' },
  { name: 'Pantoprazole', genericName: 'Pantoprazole', dosages: ['20mg', '40mg'], frequencies: ['1-0-0'], route: 'oral' },
  { name: 'Ibuprofen', genericName: 'Ibuprofen', dosages: ['200mg', '400mg', '600mg'], frequencies: ['1-0-1', '1-1-1'], route: 'oral' },
  { name: 'Dolo 650', genericName: 'Paracetamol', dosages: ['650mg'], frequencies: ['1-0-1', '1-1-1'], route: 'oral' },
  { name: 'Montelukast', genericName: 'Montelukast', dosages: ['10mg'], frequencies: ['0-0-1'], route: 'oral' },
  { name: 'Levocetrizine', genericName: 'Levocetirizine', dosages: ['5mg'], frequencies: ['0-0-1'], route: 'oral' },
  { name: 'Clopidogrel', genericName: 'Clopidogrel', dosages: ['75mg'], frequencies: ['1-0-0'], route: 'oral' }
];

// Drug interaction checker
const interactions = {
  'Metformin-Ibuprofen': { severity: 'moderate', description: 'May increase risk of lactic acidosis' },
  'Amlodipine-Atorvastatin': { severity: 'mild', description: 'May increase statin levels' },
  'Clopidogrel-Omeprazole': { severity: 'major', description: 'Omeprazole may reduce effectiveness of Clopidogrel' },
  'Amoxicillin-Metformin': { severity: 'mild', description: 'May slightly increase Metformin effect' }
};

function checkInteractions(medications) {
  const found = [];
  for (let i = 0; i < medications.length; i++) {
    for (let j = i + 1; j < medications.length; j++) {
      const key1 = `${medications[i].name}-${medications[j].name}`;
      const key2 = `${medications[j].name}-${medications[i].name}`;
      if (interactions[key1]) found.push({ drugs: [medications[i].name, medications[j].name], ...interactions[key1] });
      else if (interactions[key2]) found.push({ drugs: [medications[j].name, medications[i].name], ...interactions[key2] });
    }
  }
  return found;
}

// Get drug database
router.get('/drugs', auth, authorize('doctor'), async (req, res) => {
  const { search } = req.query;
  let drugs = drugDatabase;
  if (search) {
    drugs = drugDatabase.filter(d =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.genericName.toLowerCase().includes(search.toLowerCase())
    );
  }
  res.json({ success: true, data: drugs });
});

// Check drug interactions
router.post('/check-interactions', auth, authorize('doctor'), async (req, res) => {
  const { medications } = req.body;
  // Also check against patient's ongoing medications
  const { patientId } = req.body;
  let allMeds = [...medications];

  if (patientId) {
    const patient = await User.findById(patientId);
    if (patient?.ongoingMedications) {
      allMeds = [...allMeds, ...patient.ongoingMedications.map(m => ({ name: m.name }))];
    }
  }

  const found = checkInteractions(allMeds);
  res.json({ success: true, data: { interactions: found, hasInteractions: found.length > 0 } });
});

// Create prescription
router.post('/', auth, authorize('doctor'), async (req, res) => {
  try {
    const { patientId, appointmentId, diagnosis, medications, investigations, advice, notes, followUpDate, followUpInstructions } = req.body;

    // Check interactions
    const interactionResults = checkInteractions(medications);

    const prescription = await Prescription.create({
      patient: patientId,
      doctor: req.user._id,
      hospital: req.user.hospital,
      appointment: appointmentId,
      diagnosis,
      medications: medications.map(m => ({
        ...m,
        interactions: interactionResults.filter(i => i.drugs.includes(m.name))
      })),
      investigations,
      advice,
      notes,
      followUpDate,
      followUpInstructions,
      digitalSignature: req.user.digitalSignature || `Dr. ${req.user.firstName} ${req.user.lastName}`,
      signedAt: new Date()
    });

    const populated = await prescription.populate([
      { path: 'patient', select: 'firstName lastName dateOfBirth gender bloodGroup allergies' },
      { path: 'doctor', select: 'firstName lastName specialization licenseNumber' },
      { path: 'hospital', select: 'name address phone email' }
    ]);

    // Generate PDF
    try {
      const pdfResult = await generatePrescriptionPDF(populated, populated.doctor, populated.patient, populated.hospital);
      prescription.pdfPath = pdfResult.filepath;
      await prescription.save();
    } catch (pdfErr) {
      console.error('PDF generation error:', pdfErr);
    }

    res.status(201).json({
      success: true,
      data: populated,
      interactions: interactionResults
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get prescriptions for patient
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ patient: req.params.patientId })
      .populate('doctor', 'firstName lastName specialization')
      .populate('hospital', 'name')
      .sort({ date: -1 });

    res.json({ success: true, data: prescriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get my prescriptions
router.get('/my', auth, async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ patient: req.user._id })
      .populate('doctor', 'firstName lastName specialization')
      .populate('hospital', 'name')
      .sort({ date: -1 });

    res.json({ success: true, data: prescriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single prescription
router.get('/:id', auth, async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('patient', 'firstName lastName dateOfBirth gender bloodGroup allergies ongoingMedications')
      .populate('doctor', 'firstName lastName specialization licenseNumber digitalSignature')
      .populate('hospital', 'name address phone email');

    if (!prescription) return res.status(404).json({ success: false, message: 'Prescription not found' });
    res.json({ success: true, data: prescription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Download prescription PDF
router.get('/:id/download', auth, async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('patient doctor hospital');

    if (!prescription) return res.status(404).json({ success: false, message: 'Prescription not found' });

    if (prescription.pdfPath) {
      return res.json({ success: true, data: { downloadUrl: prescription.pdfPath } });
    }

    // Generate PDF on-the-fly
    const pdfResult = await generatePrescriptionPDF(prescription, prescription.doctor, prescription.patient, prescription.hospital);
    prescription.pdfPath = pdfResult.filepath;
    await prescription.save();

    res.json({ success: true, data: { downloadUrl: pdfResult.filepath } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send to pharmacy
router.post('/:id/send-pharmacy', auth, authorize('doctor'), async (req, res) => {
  try {
    const prescription = await Prescription.findByIdAndUpdate(req.params.id, {
      sentToPharmacy: true,
      pharmacyId: req.body.pharmacyId,
      pharmacyStatus: 'pending'
    }, { new: true });

    const io = req.app.get('io');
    io.to(`hospital_${prescription.hospital}`).emit('newPrescriptionOrder', { prescriptionId: prescription._id });

    res.json({ success: true, data: prescription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
