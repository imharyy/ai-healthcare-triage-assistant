const router = require('express').Router();
const LabTest = require('../models/LabTest');
const MedicalRecord = require('../models/MedicalRecord');
const User = require('../models/User');
const Department = require('../models/Department');
const Hospital = require('../models/Hospital');
const { auth } = require('../middleware/auth');

// ============ TEST CATALOG ============
const pathologyTests = [
  // Blood Tests
  { id: 'cbc', name: 'Complete Blood Count (CBC)', category: 'blood', price: 350, duration: '4-6 hours', description: 'Measures red blood cells, white blood cells, hemoglobin, hematocrit, and platelets', preparation: 'No special preparation needed. Fasting not required.' },
  { id: 'lft', name: 'Liver Function Test (LFT)', category: 'blood', price: 600, duration: '6-8 hours', description: 'Evaluates liver health by measuring enzymes, proteins, and bilirubin', preparation: 'Fasting for 8-12 hours recommended.' },
  { id: 'kft', name: 'Kidney Function Test (KFT)', category: 'blood', price: 550, duration: '6-8 hours', description: 'Checks kidney health - BUN, creatinine, uric acid, electrolytes', preparation: 'Fasting for 8-12 hours recommended.' },
  { id: 'thyroid', name: 'Thyroid Profile (T3, T4, TSH)', category: 'hormonal', price: 700, duration: '8-12 hours', description: 'Measures thyroid hormones to evaluate thyroid function', preparation: 'Early morning sample preferred. No fasting required.' },
  { id: 'lipid', name: 'Lipid Profile', category: 'blood', price: 500, duration: '6-8 hours', description: 'Measures cholesterol (total, HDL, LDL) and triglycerides', preparation: 'Fasting for 12 hours required. Only water is allowed.' },
  { id: 'blood-sugar-f', name: 'Fasting Blood Sugar', category: 'blood', price: 100, duration: '2-4 hours', description: 'Measures blood glucose levels after overnight fasting', preparation: 'Fasting for minimum 8 hours. No food or drinks except water.' },
  { id: 'blood-sugar-pp', name: 'Post Prandial Blood Sugar', category: 'blood', price: 100, duration: '2-4 hours', description: 'Measures blood sugar 2 hours after a meal', preparation: 'Test done exactly 2 hours after starting a meal.' },
  { id: 'hba1c', name: 'HbA1c (Glycated Hemoglobin)', category: 'blood', price: 450, duration: '4-6 hours', description: 'Average blood sugar over past 2-3 months for diabetes monitoring', preparation: 'No fasting required.' },
  { id: 'vitamin-d', name: 'Vitamin D (25-OH)', category: 'blood', price: 800, duration: '12-24 hours', description: 'Measures Vitamin D levels to check for deficiency', preparation: 'No special preparation needed.' },
  { id: 'vitamin-b12', name: 'Vitamin B12', category: 'blood', price: 650, duration: '12-24 hours', description: 'Checks Vitamin B12 levels important for nerve and blood health', preparation: 'Fasting for 6-8 hours recommended.' },
  { id: 'iron-profile', name: 'Iron Profile (Serum Iron, TIBC, Ferritin)', category: 'blood', price: 750, duration: '8-12 hours', description: 'Evaluates iron stores and iron-binding capacity', preparation: 'Fasting for 8-12 hours. Morning sample preferred.' },
  { id: 'esr', name: 'ESR (Erythrocyte Sedimentation Rate)', category: 'blood', price: 150, duration: '2-4 hours', description: 'Non-specific test for inflammation in the body', preparation: 'No special preparation needed.' },
  { id: 'crp', name: 'C-Reactive Protein (CRP)', category: 'blood', price: 400, duration: '4-6 hours', description: 'Measures CRP levels indicating inflammation or infection', preparation: 'No fasting required.' },
  { id: 'blood-group', name: 'Blood Group & Rh Typing', category: 'blood', price: 200, duration: '1-2 hours', description: 'Determines ABO blood group and Rh factor', preparation: 'No special preparation needed.' },
  { id: 'dengue', name: 'Dengue NS1 Antigen + IgG/IgM', category: 'blood', price: 800, duration: '2-4 hours', description: 'Detects dengue virus infection', preparation: 'No special preparation needed.' },
  { id: 'malaria', name: 'Malaria Antigen Test', category: 'blood', price: 350, duration: '2-4 hours', description: 'Rapid test for malaria parasite detection', preparation: 'No special preparation needed.' },
  { id: 'widal', name: 'Widal Test (Typhoid)', category: 'blood', price: 300, duration: '4-6 hours', description: 'Detects antibodies against Salmonella typhi', preparation: 'No fasting required.' },
  { id: 'coagulation', name: 'Coagulation Profile (PT, INR, aPTT)', category: 'blood', price: 600, duration: '4-6 hours', description: 'Evaluates blood clotting ability', preparation: 'Inform about any blood thinner medications.' },
  { id: 'psa', name: 'PSA (Prostate Specific Antigen)', category: 'blood', price: 700, duration: '8-12 hours', description: 'Screening test for prostate health', preparation: 'No ejaculation for 48 hours before test.' },

  // Urine Tests
  { id: 'urine-routine', name: 'Urine Routine & Microscopy', category: 'urine', price: 150, duration: '2-4 hours', description: 'Comprehensive urine analysis for infections, kidney issues', preparation: 'Clean midstream sample. Morning sample preferred.' },
  { id: 'urine-culture', name: 'Urine Culture & Sensitivity', category: 'urine', price: 500, duration: '48-72 hours', description: 'Identifies bacteria causing urinary infection and antibiotic sensitivity', preparation: 'Clean catch midstream sample. Before starting antibiotics.' },
  { id: 'microalbumin', name: 'Urine Microalbumin', category: 'urine', price: 450, duration: '4-6 hours', description: 'Early detection of kidney damage, especially in diabetics', preparation: 'First morning void preferred.' },

  // Stool Tests
  { id: 'stool-routine', name: 'Stool Routine & Microscopy', category: 'stool', price: 150, duration: '4-6 hours', description: 'Checks for parasites, blood, and digestive issues', preparation: 'Fresh sample in a clean container.' },
  { id: 'stool-culture', name: 'Stool Culture', category: 'stool', price: 500, duration: '48-72 hours', description: 'Identifies bacterial infections in the intestine', preparation: 'Fresh sample. Before starting antibiotics.' },

  // Allergy
  { id: 'ige-total', name: 'Total IgE (Allergy Screening)', category: 'allergy', price: 600, duration: '12-24 hours', description: 'Screens for allergic tendencies', preparation: 'No special preparation needed.' },

  // Cardiac
  { id: 'troponin', name: 'Troponin I / T', category: 'cardiac', price: 800, duration: '2-4 hours', description: 'Detects heart muscle damage - used for heart attack diagnosis', preparation: 'No special preparation. Urgent test.' },
  { id: 'bnp', name: 'BNP / NT-proBNP', category: 'cardiac', price: 1200, duration: '4-6 hours', description: 'Evaluates heart failure severity', preparation: 'No special preparation needed.' },
];

const radiologyTests = [
  // X-Ray
  { id: 'xray-chest', name: 'X-Ray Chest (PA View)', category: 'imaging', subcategory: 'xray', price: 400, duration: '30 minutes', description: 'Standard chest X-ray for lungs, heart, and ribcage evaluation', preparation: 'Remove metallic objects. Inform if pregnant.' },
  { id: 'xray-hand', name: 'X-Ray Hand / Wrist', category: 'imaging', subcategory: 'xray', price: 350, duration: '30 minutes', description: 'Evaluates bones of hand and wrist for fractures', preparation: 'Remove rings and jewelry.' },
  { id: 'xray-knee', name: 'X-Ray Knee (Both)', category: 'imaging', subcategory: 'xray', price: 500, duration: '30 minutes', description: 'Evaluates knee joints for arthritis, fractures, or deformity', preparation: 'No special preparation.' },
  { id: 'xray-spine', name: 'X-Ray Spine (Cervical/Lumbar)', category: 'imaging', subcategory: 'xray', price: 500, duration: '30 minutes', description: 'Evaluates spinal alignment and vertebral conditions', preparation: 'Remove metallic objects near the area.' },
  { id: 'xray-abdomen', name: 'X-Ray Abdomen', category: 'imaging', subcategory: 'xray', price: 400, duration: '30 minutes', description: 'Checks for kidney stones, bowel obstruction, free gas', preparation: 'No special preparation usually needed.' },

  // Ultrasound
  { id: 'usg-abdomen', name: 'USG Abdomen (Complete)', category: 'imaging', subcategory: 'ultrasound', price: 1000, duration: '45 minutes', description: 'Ultrasound of liver, gallbladder, kidneys, spleen, pancreas, bladder', preparation: 'Fasting for 6-8 hours. Full bladder required.' },
  { id: 'usg-pelvis', name: 'USG Pelvis', category: 'imaging', subcategory: 'ultrasound', price: 800, duration: '30 minutes', description: 'Evaluates uterus, ovaries, and pelvic structures', preparation: 'Full bladder required. Drink 4-5 glasses of water 1 hour before.' },
  { id: 'usg-thyroid', name: 'USG Thyroid / Neck', category: 'imaging', subcategory: 'ultrasound', price: 800, duration: '30 minutes', description: 'Evaluates thyroid gland for nodules, enlargement, or abnormalities', preparation: 'No special preparation needed.' },
  { id: 'usg-breast', name: 'USG Breast (Bilateral)', category: 'imaging', subcategory: 'ultrasound', price: 1000, duration: '30 minutes', description: 'Evaluates breast tissue for lumps, cysts, or abnormalities', preparation: 'No special preparation needed.' },
  { id: 'usg-kub', name: 'USG KUB (Kidney, Ureter, Bladder)', category: 'imaging', subcategory: 'ultrasound', price: 800, duration: '30 minutes', description: 'Focused ultrasound for urinary system evaluation', preparation: 'Full bladder required.' },
  { id: 'echo', name: 'Echocardiography (2D Echo)', category: 'cardiac', subcategory: 'ultrasound', price: 1500, duration: '45 minutes', description: 'Ultrasound of the heart to evaluate structure and function', preparation: 'No special preparation. Wear comfortable clothing.' },

  // CT Scan
  { id: 'ct-brain', name: 'CT Scan Brain (Plain)', category: 'imaging', subcategory: 'ct', price: 2500, duration: '30 minutes', description: 'Detailed imaging of brain for stroke, bleeding, tumors', preparation: 'Remove metallic objects. Inform about allergies.' },
  { id: 'ct-brain-contrast', name: 'CT Scan Brain (with Contrast)', category: 'imaging', subcategory: 'ct', price: 4000, duration: '45 minutes', description: 'Enhanced brain imaging with IV contrast dye', preparation: 'Fasting 4-6 hours. KFT report required. Inform about allergies.' },
  { id: 'ct-chest', name: 'CT Scan Chest (HRCT)', category: 'imaging', subcategory: 'ct', price: 3500, duration: '30 minutes', description: 'High-resolution CT of lungs for infections, fibrosis, nodules', preparation: 'No special preparation for plain CT.' },
  { id: 'ct-abdomen', name: 'CT Scan Abdomen & Pelvis', category: 'imaging', subcategory: 'ct', price: 4500, duration: '45 minutes', description: 'Detailed abdominal imaging for organs, masses, and abnormalities', preparation: 'Fasting 6 hours. KFT report may be needed for contrast.' },
  { id: 'ct-kub', name: 'CT KUB (Non-contrast)', category: 'imaging', subcategory: 'ct', price: 3000, duration: '30 minutes', description: 'Gold standard for kidney and ureteric stone detection', preparation: 'No fasting needed. Full bladder may help.' },

  // MRI
  { id: 'mri-brain', name: 'MRI Brain (Plain)', category: 'imaging', subcategory: 'mri', price: 5000, duration: '45-60 minutes', description: 'Detailed brain imaging for tumors, MS, stroke evaluation', preparation: 'Remove all metallic objects. No pacemakers/implants. Inform about claustrophobia.' },
  { id: 'mri-brain-contrast', name: 'MRI Brain (with Contrast)', category: 'imaging', subcategory: 'mri', price: 7500, duration: '60-75 minutes', description: 'Enhanced brain MRI with gadolinium contrast', preparation: 'KFT report required. No metallic implants.' },
  { id: 'mri-spine', name: 'MRI Spine (Cervical/Lumbar)', category: 'imaging', subcategory: 'mri', price: 5500, duration: '45-60 minutes', description: 'Evaluates disc herniation, spinal cord, nerve compression', preparation: 'Remove metallic objects. Inform about implants.' },
  { id: 'mri-knee', name: 'MRI Knee', category: 'imaging', subcategory: 'mri', price: 5000, duration: '45 minutes', description: 'Evaluates ligaments, meniscus, cartilage of the knee', preparation: 'Remove metallic objects around knee area.' },
  { id: 'mri-abdomen', name: 'MRI Abdomen', category: 'imaging', subcategory: 'mri', price: 7000, duration: '60 minutes', description: 'Detailed abdominal organ imaging', preparation: 'Fasting 4-6 hours. No metallic implants.' },

  // Other Imaging
  { id: 'mammography', name: 'Mammography (Digital)', category: 'imaging', subcategory: 'mammography', price: 1500, duration: '30 minutes', description: 'Breast cancer screening X-ray (for women 40+)', preparation: 'Do not apply deodorant/powder. Best done 1 week after period.' },
  { id: 'dexa', name: 'DEXA Scan (Bone Density)', category: 'imaging', subcategory: 'dexa', price: 2000, duration: '30 minutes', description: 'Measures bone mineral density for osteoporosis screening', preparation: 'No calcium supplements 24 hours before. Wear comfortable clothing.' },
  { id: 'ecg', name: 'ECG (Electrocardiogram)', category: 'cardiac', subcategory: 'ecg', price: 200, duration: '15 minutes', description: 'Records electrical activity of the heart', preparation: 'No special preparation. Wear loose clothing.' },
  { id: 'tmt', name: 'TMT (Treadmill Test / Stress Test)', category: 'cardiac', subcategory: 'stress-test', price: 1500, duration: '45-60 minutes', description: 'Heart stress test while exercising on a treadmill', preparation: 'Wear comfortable shoes. Light meal 2 hours before. Consult doctor about medications.' },
];

// Health Packages
const healthPackages = [
  { id: 'basic', name: 'Basic Health Checkup', price: 1499, tests: ['cbc', 'blood-sugar-f', 'lipid', 'urine-routine', 'lft', 'kft'], description: 'Essential screening for overall health', includes: 'CBC, Fasting Sugar, Lipid Profile, Urine Routine, LFT, KFT' },
  { id: 'comprehensive', name: 'Comprehensive Health Checkup', price: 2999, tests: ['cbc', 'blood-sugar-f', 'hba1c', 'lipid', 'lft', 'kft', 'thyroid', 'urine-routine', 'xray-chest', 'ecg', 'vitamin-d', 'vitamin-b12'], description: 'Complete health evaluation with imaging', includes: 'Basic + HbA1c, Thyroid, Vitamin D, B12, Chest X-Ray, ECG' },
  { id: 'cardiac', name: 'Heart Health Package', price: 3499, tests: ['cbc', 'lipid', 'ecg', 'echo', 'troponin', 'crp', 'blood-sugar-f'], description: 'Complete cardiac risk assessment', includes: 'Lipid Profile, ECG, 2D Echo, Troponin, CRP, CBC, Sugar' },
  { id: 'diabetes', name: 'Diabetes Care Package', price: 1999, tests: ['blood-sugar-f', 'blood-sugar-pp', 'hba1c', 'kft', 'lipid', 'urine-routine', 'microalbumin'], description: 'Complete diabetes monitoring and complication screening', includes: 'Fasting & PP Sugar, HbA1c, KFT, Lipid, Urine, Microalbumin' },
  { id: 'women', name: 'Women Wellness Package', price: 3999, tests: ['cbc', 'thyroid', 'vitamin-d', 'vitamin-b12', 'iron-profile', 'blood-sugar-f', 'lipid', 'urine-routine', 'usg-pelvis', 'mammography'], description: 'Complete women\'s health screening', includes: 'CBC, Thyroid, Iron, Vitamins, Sugar, Lipid, USG Pelvis, Mammography' },
];

// ============ ROUTES ============

// GET /api/diagnostic/tests - Get test catalog
router.get('/tests', auth, (req, res) => {
  const { type, category, search } = req.query;

  let tests = [];
  if (type === 'radiology') {
    tests = radiologyTests;
  } else if (type === 'pathology') {
    tests = pathologyTests;
  } else {
    tests = [...pathologyTests, ...radiologyTests];
  }

  if (category) {
    tests = tests.filter(t => t.category === category || t.subcategory === category);
  }

  if (search) {
    const s = search.toLowerCase();
    tests = tests.filter(t =>
      t.name.toLowerCase().includes(s) ||
      t.description.toLowerCase().includes(s) ||
      t.category.toLowerCase().includes(s)
    );
  }

  res.json({ success: true, data: tests });
});

// GET /api/diagnostic/packages - Get health packages
router.get('/packages', auth, (req, res) => {
  res.json({ success: true, data: healthPackages });
});

// GET /api/diagnostic/time-slots - Get available time slots for lab booking
router.get('/time-slots', auth, (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ success: false, message: 'Date is required' });

  const dayOfWeek = new Date(date).getDay();
  const isSunday = dayOfWeek === 0;
  const isSaturday = dayOfWeek === 6;

  if (isSunday) {
    return res.json({ success: true, data: [] }); // Closed on Sunday
  }

  const slots = [];
  const startHour = 7;
  const endHour = isSaturday ? 14 : 18;

  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += 30) {
      const startTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const endM = m + 30;
      const endH = endM >= 60 ? h + 1 : h;
      const endMin = endM >= 60 ? 0 : endM;
      const endTime = `${String(endH).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

      // Simulate some booked slots randomly based on date hash
      const hash = date.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      const isBooked = (hash + h + m) % 7 === 0;

      slots.push({ startTime, endTime, isBooked });
    }
  }

  res.json({ success: true, data: slots });
});

// POST /api/diagnostic/book - Book a diagnostic test
router.post('/book', auth, async (req, res) => {
  try {
    const { testIds, date, timeSlot, type, notes, packageId } = req.body;

    if ((!testIds || testIds.length === 0) && !packageId) {
      return res.status(400).json({ success: false, message: 'Please select at least one test or package.' });
    }
    if (!date || !timeSlot) {
      return res.status(400).json({ success: false, message: 'Date and time slot are required.' });
    }

    // Resolve tests
    let resolvedTests = [];
    let totalCost = 0;

    if (packageId) {
      const pkg = healthPackages.find(p => p.id === packageId);
      if (!pkg) return res.status(400).json({ success: false, message: 'Invalid package.' });
      const allTests = [...pathologyTests, ...radiologyTests];
      resolvedTests = pkg.tests.map(tid => allTests.find(t => t.id === tid)).filter(Boolean);
      totalCost = pkg.price;
    } else {
      const allTests = [...pathologyTests, ...radiologyTests];
      resolvedTests = testIds.map(tid => allTests.find(t => t.id === tid)).filter(Boolean);
      totalCost = resolvedTests.reduce((sum, t) => sum + t.price, 0);
    }

    if (resolvedTests.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid tests found.' });
    }

    // Get hospital
    const hospital = await Hospital.findOne();
    const hospitalId = hospital?._id;

    // Create LabTest records for each test
    const labTests = [];
    for (const test of resolvedTests) {
      const labTest = await LabTest.create({
        patient: req.user._id,
        hospital: hospitalId,
        testName: test.name,
        testCode: test.id,
        category: test.category === 'imaging' ? 'imaging' : test.category,
        priority: 'normal',
        notes: notes || '',
        cost: test.price,
        orderedDate: new Date(date),
        status: 'ordered'
      });
      labTests.push(labTest);
    }

    res.status(201).json({
      success: true,
      message: `${resolvedTests.length} test(s) booked successfully for ${date}`,
      data: {
        bookingId: labTests[0]._id,
        tests: resolvedTests.map(t => t.name),
        date,
        timeSlot,
        totalCost,
        testCount: resolvedTests.length,
        labTests: labTests.map(lt => ({ id: lt._id, name: lt.testName, status: lt.status }))
      }
    });
  } catch (error) {
    console.error('Diagnostic booking error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/diagnostic/my-bookings - Get my diagnostic bookings
router.get('/my-bookings', auth, async (req, res) => {
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

// POST /api/diagnostic/seed-records - Seed dummy prescription and lab report for the logged-in patient
router.post('/seed-records', auth, async (req, res) => {
  try {
    const hospital = await Hospital.findOne();
    const doctor = await User.findOne({ role: 'doctor', isActive: true });

    if (!hospital || !doctor) {
      return res.status(400).json({ success: false, message: 'No hospital/doctor found. Run seed first.' });
    }

    const existingRecords = await MedicalRecord.countDocuments({ patient: req.user._id });

    const records = [];

    // Dummy Prescription 1
    records.push({
      patient: req.user._id,
      doctor: doctor._id,
      hospital: hospital._id,
      type: 'prescription',
      category: 'general',
      title: 'Prescription - Fever & Cold Treatment',
      description: 'Patient presented with high-grade fever (102°F), running nose, body ache and sore throat for 3 days. Diagnosed with Acute Upper Respiratory Tract Infection (URTI).',
      date: new Date('2026-02-15'),
      diagnosis: ['Acute URTI', 'Viral Fever'],
      symptoms: ['Fever', 'Running Nose', 'Body Ache', 'Sore Throat'],
      vitals: {
        bloodPressure: { systolic: 120, diastolic: 80 },
        heartRate: 92,
        temperature: 39.0,
        weight: 72,
        oxygenSaturation: 97
      },
      visitNotes: `Rx:\n1. Tab. Paracetamol 650mg - 1 tablet three times a day after food x 5 days\n2. Tab. Cetirizine 10mg - 1 tablet at bedtime x 5 days\n3. Syp. Ambroxol 30ml - 2 teaspoons three times a day x 5 days\n4. Tab. Azithromycin 500mg - 1 tablet once daily x 3 days\n5. Steam inhalation 3-4 times a day\n6. Warm salt water gargle 3-4 times a day\n\nAdvice:\n- Plenty of warm fluids (water, soup, tea)\n- Rest for 2-3 days\n- Avoid cold food/drinks\n- Follow up after 5 days if symptoms persist\n\nDr. ${doctor.firstName} ${doctor.lastName}\n${doctor.specialization}\nReg. No: ${doctor.licenseNumber || 'MCI-54321'}`,
      tags: ['fever', 'cold', 'urti', 'prescription'],
      uploadedBy: doctor._id
    });

    // Dummy Prescription 2
    records.push({
      patient: req.user._id,
      doctor: doctor._id,
      hospital: hospital._id,
      type: 'prescription',
      category: 'general',
      title: 'Prescription - Gastritis & Acid Reflux',
      description: 'Patient complains of burning sensation in upper abdomen, acid reflux, and bloating after meals for 1 week.',
      date: new Date('2026-01-28'),
      diagnosis: ['Gastritis', 'GERD (Gastroesophageal Reflux Disease)'],
      symptoms: ['Stomach Burning', 'Acid Reflux', 'Bloating', 'Nausea'],
      vitals: {
        bloodPressure: { systolic: 118, diastolic: 76 },
        heartRate: 78,
        temperature: 37.0,
        weight: 72
      },
      visitNotes: `Rx:\n1. Cap. Pantoprazole 40mg - 1 capsule empty stomach in the morning x 14 days\n2. Syp. Sucralfate 10ml - 2 teaspoons before meals (3 times/day) x 10 days\n3. Tab. Domperidone 10mg - 1 tablet before meals (3 times/day) x 7 days\n4. Tab. Rantac 150mg - 1 tablet at bedtime x 14 days\n\nDiet Advice:\n- Avoid spicy, oily, and fried food\n- Avoid tea, coffee, carbonated drinks\n- Eat small frequent meals (5-6 times/day)\n- Do not lie down immediately after eating\n- Last meal 3 hours before bedtime\n- Avoid smoking and alcohol\n\nFollow up after 2 weeks.\n\nDr. ${doctor.firstName} ${doctor.lastName}\n${doctor.specialization}`,
      tags: ['gastritis', 'gerd', 'acid-reflux', 'prescription'],
      uploadedBy: doctor._id
    });

    // Dummy Lab Report 1 - CBC
    records.push({
      patient: req.user._id,
      doctor: doctor._id,
      hospital: hospital._id,
      type: 'lab-report',
      category: 'blood',
      title: 'Complete Blood Count (CBC) Report',
      description: 'Routine CBC as part of health checkup. Minor findings noted.',
      date: new Date('2026-02-10'),
      labValues: [
        { parameter: 'Hemoglobin', value: 13.5, unit: 'g/dL', normalRange: { min: 13.0, max: 17.0 }, isAbnormal: false, date: new Date('2026-02-10') },
        { parameter: 'RBC Count', value: 4.8, unit: 'million/µL', normalRange: { min: 4.5, max: 5.5 }, isAbnormal: false, date: new Date('2026-02-10') },
        { parameter: 'WBC Count', value: 11200, unit: '/µL', normalRange: { min: 4000, max: 11000 }, isAbnormal: true, date: new Date('2026-02-10') },
        { parameter: 'Platelet Count', value: 250000, unit: '/µL', normalRange: { min: 150000, max: 400000 }, isAbnormal: false, date: new Date('2026-02-10') },
        { parameter: 'Hematocrit (PCV)', value: 42, unit: '%', normalRange: { min: 38.3, max: 48.6 }, isAbnormal: false, date: new Date('2026-02-10') },
        { parameter: 'MCV', value: 87, unit: 'fL', normalRange: { min: 80, max: 100 }, isAbnormal: false, date: new Date('2026-02-10') },
        { parameter: 'MCH', value: 28.5, unit: 'pg', normalRange: { min: 27, max: 33 }, isAbnormal: false, date: new Date('2026-02-10') },
        { parameter: 'MCHC', value: 33, unit: 'g/dL', normalRange: { min: 31.5, max: 34.5 }, isAbnormal: false, date: new Date('2026-02-10') },
        { parameter: 'Neutrophils', value: 68, unit: '%', normalRange: { min: 40, max: 70 }, isAbnormal: false, date: new Date('2026-02-10') },
        { parameter: 'Lymphocytes', value: 25, unit: '%', normalRange: { min: 20, max: 40 }, isAbnormal: false, date: new Date('2026-02-10') },
        { parameter: 'Eosinophils', value: 4, unit: '%', normalRange: { min: 1, max: 6 }, isAbnormal: false, date: new Date('2026-02-10') },
        { parameter: 'ESR', value: 18, unit: 'mm/hr', normalRange: { min: 0, max: 15 }, isAbnormal: true, date: new Date('2026-02-10') }
      ],
      visitNotes: 'CBC Report Interpretation:\n\n• Hemoglobin: Normal\n• WBC Count: Slightly elevated (11,200/µL) - suggestive of mild infection\n• ESR: Mildly raised (18 mm/hr) - correlates with recent fever\n• Platelet count, RBC indices: Within normal limits\n\nConclusion: Mild leukocytosis with raised ESR suggestive of recent/ongoing infection. Correlate clinically. Repeat after 1 week if symptoms persist.',
      tags: ['cbc', 'blood-test', 'lab-report'],
      uploadedBy: doctor._id
    });

    // Dummy Lab Report 2 - Lipid Profile
    records.push({
      patient: req.user._id,
      doctor: doctor._id,
      hospital: hospital._id,
      type: 'lab-report',
      category: 'blood',
      title: 'Lipid Profile Report',
      description: 'Fasting lipid profile for cardiovascular risk assessment.',
      date: new Date('2026-02-10'),
      labValues: [
        { parameter: 'Total Cholesterol', value: 215, unit: 'mg/dL', normalRange: { min: 0, max: 200 }, isAbnormal: true, date: new Date('2026-02-10') },
        { parameter: 'HDL Cholesterol', value: 48, unit: 'mg/dL', normalRange: { min: 40, max: 100 }, isAbnormal: false, date: new Date('2026-02-10') },
        { parameter: 'LDL Cholesterol', value: 138, unit: 'mg/dL', normalRange: { min: 0, max: 130 }, isAbnormal: true, date: new Date('2026-02-10') },
        { parameter: 'Triglycerides', value: 165, unit: 'mg/dL', normalRange: { min: 0, max: 150 }, isAbnormal: true, date: new Date('2026-02-10') },
        { parameter: 'VLDL', value: 33, unit: 'mg/dL', normalRange: { min: 5, max: 40 }, isAbnormal: false, date: new Date('2026-02-10') },
        { parameter: 'Total Cholesterol / HDL Ratio', value: 4.5, unit: '', normalRange: { min: 0, max: 4.5 }, isAbnormal: false, date: new Date('2026-02-10') }
      ],
      visitNotes: 'Lipid Profile Interpretation:\n\n• Total Cholesterol: Borderline high (215 mg/dL)\n• LDL: Above optimal (138 mg/dL)\n• Triglycerides: Borderline high (165 mg/dL)\n• HDL: Within normal range\n\nConclusion: Mild dyslipidemia. Recommend dietary modifications, regular exercise, and follow-up lipid profile in 3 months. Consider statin therapy if lifestyle changes insufficient.',
      tags: ['lipid-profile', 'cholesterol', 'lab-report'],
      uploadedBy: doctor._id
    });

    // Dummy Lab Report 3 - Thyroid
    records.push({
      patient: req.user._id,
      doctor: doctor._id,
      hospital: hospital._id,
      type: 'lab-report',
      category: 'blood',
      title: 'Thyroid Function Test Report',
      description: 'Thyroid profile ordered for fatigue and weight gain complaints.',
      date: new Date('2026-01-20'),
      labValues: [
        { parameter: 'TSH', value: 5.8, unit: 'mIU/L', normalRange: { min: 0.4, max: 4.5 }, isAbnormal: true, date: new Date('2026-01-20') },
        { parameter: 'Free T3', value: 2.4, unit: 'pg/mL', normalRange: { min: 2.0, max: 4.4 }, isAbnormal: false, date: new Date('2026-01-20') },
        { parameter: 'Free T4', value: 0.9, unit: 'ng/dL', normalRange: { min: 0.8, max: 1.8 }, isAbnormal: false, date: new Date('2026-01-20') }
      ],
      visitNotes: 'Thyroid Report Interpretation:\n\n• TSH: Elevated (5.8 mIU/L) - suggestive of subclinical hypothyroidism\n• Free T3 & T4: Within normal range\n\nConclusion: Subclinical hypothyroidism. Recommend repeat thyroid profile in 6-8 weeks. If persistently elevated, may need to start Levothyroxine. Correlate with symptoms (fatigue, weight gain, cold intolerance).',
      tags: ['thyroid', 'tsh', 'lab-report', 'hypothyroidism'],
      uploadedBy: doctor._id
    });

    // Dummy Imaging Report
    records.push({
      patient: req.user._id,
      doctor: doctor._id,
      hospital: hospital._id,
      type: 'imaging',
      category: 'xray',
      title: 'X-Ray Chest PA View Report',
      description: 'Routine chest X-ray as part of health checkup.',
      date: new Date('2026-02-10'),
      visitNotes: 'CHEST X-RAY PA VIEW REPORT\n\nFindings:\n• Heart size: Normal. Cardiothoracic ratio within normal limits.\n• Both lung fields are clear. No focal consolidation, pleural effusion, or pneumothorax.\n• Mediastinum: Normal in width. Trachea central.\n• Both hemidiaphragms: Normal position and shape.\n• Costophrenic angles: Clear bilaterally.\n• Bony thorax: No fracture or lytic lesion seen.\n\nImpression:\n✅ Normal chest X-ray.\nNo significant cardiopulmonary abnormality detected.\n\nReported by: Dr. Radiologist\nDate: Feb 10, 2026',
      tags: ['xray', 'chest', 'imaging', 'normal'],
      uploadedBy: doctor._id
    });

    await MedicalRecord.insertMany(records);

    res.json({
      success: true,
      message: `${records.length} dummy medical records created (2 prescriptions, 3 lab reports, 1 imaging report)`,
      data: { count: records.length }
    });
  } catch (error) {
    console.error('Seed records error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
