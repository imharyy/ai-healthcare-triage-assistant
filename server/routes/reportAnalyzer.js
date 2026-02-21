const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const MedicalRecord = require('../models/MedicalRecord');
const LabTest = require('../models/LabTest');

// ─── Fallback report analysis engine ─────────────────────────────────────────

const labReferenceDB = {
  hemoglobin: { unit: 'g/dL', male: { min: 13.5, max: 17.5 }, female: { min: 12.0, max: 15.5 }, critical_low: 7, critical_high: 20,
    low_advice: { severity: 'moderate', medication: ['Iron supplements (Ferrous Sulfate 325mg daily)', 'Folic Acid 5mg daily', 'Vitamin B12 supplements'], homeCure: ['Iron-rich foods: spinach, red meat, lentils, beans', 'Vitamin C rich foods to aid iron absorption', 'Beetroot juice daily', 'Pomegranate and dates'], estimatedCost: { consultation: 500, medication: '300-800/month', tests: '500-1500' }},
    high_advice: { severity: 'mild', medication: ['Hydration therapy', 'Phlebotomy if polycythemia'], homeCure: ['Increase water intake', 'Avoid iron-rich supplements', 'Regular exercise'], estimatedCost: { consultation: 500, medication: '200-500', tests: '800-2000' }}
  },
  wbc: { unit: 'cells/mcL', min: 4000, max: 11000, critical_low: 2000, critical_high: 30000,
    low_advice: { severity: 'moderate', medication: ['Filgrastim (G-CSF) if prescribed', 'Antibiotics prophylaxis', 'Vitamin B complex'], homeCure: ['Protein-rich diet', 'Garlic and ginger regularly', 'Turmeric milk', 'Adequate sleep 7-8 hours'], estimatedCost: { consultation: 500, medication: '500-3000/month', tests: '800-2000' }},
    high_advice: { severity: 'moderate', medication: ['Antibiotics if infection', 'Anti-inflammatory drugs', 'Corticosteroids for allergic reactions'], homeCure: ['Turmeric and ginger tea', 'Omega-3 fatty acids (fish oil)', 'Green leafy vegetables', 'Stress management'], estimatedCost: { consultation: 500, medication: '300-1500', tests: '1000-3000' }}
  },
  platelet: { unit: 'lakh/mcL', min: 1.5, max: 4.0, critical_low: 0.5, critical_high: 10,
    low_advice: { severity: 'severe', medication: ['Platelet transfusion if < 10,000', 'Eltrombopag if chronic', 'Corticosteroids'], homeCure: ['Papaya leaf extract juice', 'Wheatgrass juice', 'Pumpkin', 'Avoid aspirin & blood thinners'], estimatedCost: { consultation: 800, medication: '1000-5000/month', tests: '1500-4000' }},
    high_advice: { severity: 'mild', medication: ['Low-dose aspirin', 'Hydroxyurea if very high'], homeCure: ['Omega-3 foods', 'Garlic', 'Ginger tea', 'Regular exercise'], estimatedCost: { consultation: 500, medication: '200-800', tests: '1000-2500' }}
  },
  rbc: { unit: 'million/mcL', min: 4.5, max: 5.5, critical_low: 3.0, critical_high: 7.0,
    low_advice: { severity: 'moderate', medication: ['Iron supplements', 'Erythropoietin injections if severe', 'Vitamin B12'], homeCure: ['Red meat and liver', 'Beetroot and carrot juice', 'Green leafy vegetables', 'Dates and raisins'], estimatedCost: { consultation: 500, medication: '400-2000/month', tests: '600-1500' }},
    high_advice: { severity: 'mild', medication: ['Therapeutic phlebotomy', 'Low-dose aspirin'], homeCure: ['Stay well hydrated', 'Avoid smoking', 'Limit iron intake'], estimatedCost: { consultation: 500, medication: '200-600', tests: '800-2000' }}
  },
  'blood sugar fasting': { unit: 'mg/dL', min: 70, max: 100, critical_low: 50, critical_high: 300,
    low_advice: { severity: 'moderate', medication: ['Glucose tablets immediately', 'Glucagon injection for severe cases'], homeCure: ['Frequent small meals', 'Complex carbs (oats, whole wheat)', 'Avoid skipping meals', 'Carry candy/juice for emergencies'], estimatedCost: { consultation: 500, medication: '200-500', tests: '300-800' }},
    high_advice: { severity: 'moderate', medication: ['Metformin 500mg BD', 'Glimepiride 1-2mg OD', 'Insulin if HbA1c > 9%'], homeCure: ['Bitter gourd (karela) juice', 'Fenugreek seeds soaked overnight', 'Cinnamon tea', 'Walk 30 min daily', 'Reduce sugar & refined carbs'], estimatedCost: { consultation: 500, medication: '300-2000/month', tests: '500-1500' }}
  },
  'total cholesterol': { unit: 'mg/dL', min: 0, max: 200, critical_high: 300,
    high_advice: { severity: 'moderate', medication: ['Atorvastatin 10-20mg at bedtime', 'Omega-3 supplements', 'Ezetimibe if statin intolerant'], homeCure: ['Oats and barley daily', 'Almonds and walnuts', 'Flaxseeds', 'Garlic cloves on empty stomach', 'Avoid fried and processed food', '30 min brisk walking daily'], estimatedCost: { consultation: 500, medication: '200-800/month', tests: '600-1500' }}
  },
  ldl: { unit: 'mg/dL', min: 0, max: 100, critical_high: 190,
    high_advice: { severity: 'moderate', medication: ['Atorvastatin / Rosuvastatin', 'PCSK9 inhibitors for very high', 'Fenofibrate'], homeCure: ['Soluble fiber (oats, beans, lentils)', 'Plant sterols', 'Green tea', 'Avoid trans fats'], estimatedCost: { consultation: 500, medication: '300-1200/month', tests: '600-1500' }}
  },
  hdl: { unit: 'mg/dL', min: 40, max: 200,
    low_advice: { severity: 'mild', medication: ['Niacin supplements', 'Exercise is the best medicine'], homeCure: ['Olive oil and avocado', 'Fatty fish (salmon, mackerel)', 'Purple/red fruits', 'Quit smoking', 'Regular aerobic exercise'], estimatedCost: { consultation: 500, medication: '200-600', tests: '600-1200' }}
  },
  triglycerides: { unit: 'mg/dL', min: 0, max: 150, critical_high: 500,
    high_advice: { severity: 'moderate', medication: ['Fenofibrate 145mg', 'Omega-3 fatty acid capsules', 'Nicotinic acid'], homeCure: ['Cut sugar completely', 'No alcohol', 'Fish oil supplements', 'Reduce refined carbs', 'Weight loss if overweight'], estimatedCost: { consultation: 500, medication: '300-1000/month', tests: '600-1200' }}
  },
  creatinine: { unit: 'mg/dL', min: 0.7, max: 1.3, critical_high: 4.0,
    high_advice: { severity: 'severe', medication: ['ACE inhibitors for kidney protection', 'Sodium bicarbonate', 'Erythropoietin if anemia present', 'Dialysis if GFR < 15'], homeCure: ['Reduce protein intake', 'Avoid NSAIDs', 'Stay hydrated', 'Reduce salt intake', 'Avoid processed foods'], estimatedCost: { consultation: 800, medication: '500-3000/month', tests: '2000-5000', dialysis: '15000-25000/session' }}
  },
  urea: { unit: 'mg/dL', min: 7, max: 20, critical_high: 100,
    high_advice: { severity: 'moderate', medication: ['Low protein diet prescription', 'Sodium polystyrene if potassium high'], homeCure: ['Limit protein to 0.6-0.8 g/kg/day', 'Increase water intake', 'Avoid red meat', 'Fresh fruits and vegetables'], estimatedCost: { consultation: 500, medication: '300-1000', tests: '800-2000' }}
  },
  tsh: { unit: 'mIU/L', min: 0.4, max: 4.0, critical_low: 0.1, critical_high: 10,
    low_advice: { severity: 'moderate', medication: ['Methimazole / Carbimazole', 'Propranolol for symptoms', 'Radioactive iodine therapy'], homeCure: ['Avoid excess iodine', 'Lemon balm tea', 'Bugleweed herb', 'Stress reduction'], estimatedCost: { consultation: 800, medication: '300-1500/month', tests: '1000-3000' }},
    high_advice: { severity: 'moderate', medication: ['Levothyroxine (Thyronorm) 25-100mcg', 'Take empty stomach 30 min before breakfast'], homeCure: ['Selenium-rich foods (Brazil nuts)', 'Zinc-rich foods', 'Avoid goitrogens (raw cabbage, soy)', 'Ashwagandha supplements', 'Regular exercise'], estimatedCost: { consultation: 800, medication: '100-400/month', tests: '800-2000' }}
  },
  't3': { unit: 'ng/dL', min: 80, max: 200,
    low_advice: { severity: 'moderate', medication: ['Levothyroxine', 'Liothyronine if needed'], homeCure: ['Selenium supplements', 'Zinc-rich diet', 'Exercise regularly'], estimatedCost: { consultation: 800, medication: '200-800/month', tests: '800-2000' }},
    high_advice: { severity: 'moderate', medication: ['Methimazole', 'Beta blockers for symptoms'], homeCure: ['Limit iodine intake', 'Lemon balm tea', 'Cold compresses for thyroid'], estimatedCost: { consultation: 800, medication: '300-1200/month', tests: '800-2000' }}
  },
  't4': { unit: 'mcg/dL', min: 5.0, max: 12.0,
    low_advice: { severity: 'moderate', medication: ['Levothyroxine replacement'], homeCure: ['Iodine-rich foods', 'Selenium', 'Regular exercise'], estimatedCost: { consultation: 800, medication: '100-400/month', tests: '800-2000' }},
    high_advice: { severity: 'moderate', medication: ['Anti-thyroid drugs', 'Beta blockers'], homeCure: ['Low iodine diet', 'Stress management', 'Cool environment'], estimatedCost: { consultation: 800, medication: '300-1200/month', tests: '800-2000' }}
  },
  'uric acid': { unit: 'mg/dL', min: 3.5, max: 7.2, critical_high: 12,
    high_advice: { severity: 'moderate', medication: ['Allopurinol 100-300mg daily', 'Febuxostat', 'Colchicine for acute gout'], homeCure: ['Cherry juice daily', 'Apple cider vinegar', 'Drink 3L water daily', 'Avoid red meat, seafood, alcohol, organ meat', 'Reduce purine-rich foods'], estimatedCost: { consultation: 500, medication: '200-800/month', tests: '400-1000' }}
  },
  'vitamin d': { unit: 'ng/mL', min: 30, max: 100, critical_low: 10,
    low_advice: { severity: 'mild', medication: ['Cholecalciferol 60,000 IU weekly x 8 weeks', 'Then 60,000 IU monthly maintenance', 'Calcium supplements 500mg BD'], homeCure: ['15-20 min morning sunlight daily', 'Egg yolks, fatty fish, mushrooms', 'Fortified milk and cereals', 'Cod liver oil'], estimatedCost: { consultation: 500, medication: '200-600/month', tests: '800-1500' }}
  },
  'vitamin b12': { unit: 'pg/mL', min: 200, max: 900, critical_low: 150,
    low_advice: { severity: 'moderate', medication: ['Methylcobalamin 1500mcg daily', 'B12 injections weekly if severe deficiency', 'Folic acid 5mg daily'], homeCure: ['Dairy products, eggs, meat', 'Fortified cereals', 'Nutritional yeast', 'Fermented foods (curd, idli)'], estimatedCost: { consultation: 500, medication: '200-800/month', tests: '800-1500' }}
  },
  'hba1c': { unit: '%', min: 4.0, max: 5.7, critical_high: 10,
    high_advice: { severity: 'moderate', medication: ['Metformin 500mg BD (if 5.7-6.4)', 'Metformin + Glimepiride (if > 6.5)', 'Insulin (if > 9%)', 'SGLT2 inhibitors'], homeCure: ['Bitter gourd, fenugreek, cinnamon', '30 min walk after every meal', 'Low glycemic index diet', 'Reduce portion sizes', 'Stress management (yoga, meditation)'], estimatedCost: { consultation: 500, medication: '300-3000/month', tests: '500-1500' }}
  },
  esr: { unit: 'mm/hr', min: 0, max: 20, critical_high: 100,
    high_advice: { severity: 'mild', medication: ['Treat underlying cause', 'NSAIDs for inflammation', 'Corticosteroids if autoimmune'], homeCure: ['Anti-inflammatory foods (turmeric, ginger)', 'Omega-3 fatty acids', 'Adequate rest', 'Stay hydrated'], estimatedCost: { consultation: 500, medication: '200-800', tests: '300-800' }}
  }
};

const imagingAnalysisDB = {
  'chest x-ray': {
    normal_findings: ['clear lung fields', 'normal cardiac silhouette', 'no active lesions', 'normal mediastinum'],
    abnormal_map: {
      'consolidation': { severity: 'moderate', condition: 'Pneumonia / Lung Infection', medication: ['Amoxicillin-Clavulanate 625mg TDS x 7 days', 'Azithromycin 500mg OD x 5 days', 'Paracetamol for fever', 'Cough syrup (Dextromethorphan)'], homeCure: ['Steam inhalation 3-4 times/day', 'Warm fluids', 'Rest', 'Honey + Ginger tea'], estimatedCost: { consultation: 500, medication: '500-1500', tests: '800-2000', hospitalization: '15000-50000 if severe' }},
      'cardiomegaly': { severity: 'severe', condition: 'Enlarged Heart', medication: ['ACE inhibitors (Enalapril)', 'Beta blockers (Metoprolol)', 'Diuretics (Furosemide)', 'Low-salt diet strict'], homeCure: ['Strict salt restriction < 2g/day', 'Fluid intake monitoring', 'Daily weight monitoring', 'Light walking only'], estimatedCost: { consultation: 800, medication: '500-2000/month', tests: '3000-8000', treatment: '50000-500000' }},
      'pleural effusion': { severity: 'severe', condition: 'Fluid in Lungs', medication: ['Diuretics', 'Thoracentesis procedure', 'Treat underlying cause (TB, cancer, heart failure)'], homeCure: ['Elevated sleeping position', 'Low salt diet', 'Monitor breathing'], estimatedCost: { consultation: 800, medication: '500-2000', tests: '2000-5000', procedure: '5000-20000' }},
      'normal': { severity: 'none', condition: 'Normal Study', medication: [], homeCure: ['Continue healthy lifestyle'], estimatedCost: { consultation: 300 }}
    }
  },
  'mri': {
    abnormal_map: {
      'disc herniation': { severity: 'moderate', condition: 'Spinal Disc Herniation', medication: ['Pregabalin 75mg BD', 'Methylprednisolone taper', 'Muscle relaxants (Tizanidine)', 'Physiotherapy'], homeCure: ['Hot/cold compress alternating', 'Core strengthening exercises', 'Avoid heavy lifting', 'Maintain posture', 'Sleep on firm mattress'], estimatedCost: { consultation: 800, medication: '500-1500/month', tests: '5000-12000', surgery: '100000-300000' }},
      'ligament tear': { severity: 'moderate', condition: 'Ligament Injury', medication: ['NSAIDs (Diclofenac)', 'Muscle relaxants', 'Physiotherapy', 'Knee brace'], homeCure: ['RICE protocol (Rest, Ice, Compression, Elevation)', 'Gentle range of motion exercises', 'Avoid weight bearing'], estimatedCost: { consultation: 800, medication: '400-1000', tests: '5000-12000', surgery: '80000-250000' }},
      'normal': { severity: 'none', condition: 'Normal Study', medication: [], homeCure: ['Continue healthy lifestyle'], estimatedCost: { consultation: 500 }}
    }
  },
  'ct scan': {
    abnormal_map: {
      'kidney stone': { severity: 'moderate', condition: 'Renal Calculi', medication: ['Tamsulosin 0.4mg OD', 'Diclofenac for pain', 'Potassium Citrate', 'Lithotripsy for large stones'], homeCure: ['Drink 3-4L water daily', 'Lemon juice in warm water', 'Barley water', 'Reduce oxalate foods (spinach, chocolate)', 'Banana stem juice'], estimatedCost: { consultation: 500, medication: '300-800', tests: '3000-8000', lithotripsy: '20000-50000' }},
      'normal': { severity: 'none', condition: 'Normal Study', medication: [], homeCure: ['Continue healthy lifestyle'], estimatedCost: { consultation: 500 }}
    }
  },
  'ultrasound': {
    abnormal_map: {
      'fatty liver': { severity: 'mild', condition: 'Fatty Liver (NAFLD)', medication: ['Ursodeoxycholic acid 300mg BD', 'Vitamin E supplements', 'Silymarin (Milk Thistle)'], homeCure: ['Weight loss (even 5-10% helps)', 'No alcohol', 'Avoid sugar & fried foods', 'Green tea daily', 'Exercise 30 min daily', 'Bitter gourd and turmeric'], estimatedCost: { consultation: 500, medication: '300-800/month', tests: '1500-3000' }},
      'gallstones': { severity: 'moderate', condition: 'Cholelithiasis', medication: ['Ursodeoxycholic acid for small stones', 'Antispasmodics for pain', 'Surgery (Cholecystectomy) if recurrent'], homeCure: ['Low fat diet', 'Apple cider vinegar', 'Peppermint tea', 'Avoid oily/spicy food'], estimatedCost: { consultation: 500, medication: '400-1000', tests: '1500-3000', surgery: '40000-80000' }},
      'normal': { severity: 'none', condition: 'Normal Study', medication: [], homeCure: ['Continue healthy lifestyle'], estimatedCost: { consultation: 300 }}
    }
  }
};

function analyzeLabValuesLocally(labValues) {
  const findings = [];
  for (const lv of labValues) {
    const param = lv.parameter?.toLowerCase().trim();
    let matched = null;
    for (const [key, ref] of Object.entries(labReferenceDB)) {
      if (param.includes(key) || key.includes(param)) { matched = { key, ref }; break; }
    }
    if (!matched) {
      findings.push({
        parameter: lv.parameter,
        value: lv.value,
        unit: lv.unit || '',
        status: lv.isAbnormal ? 'abnormal' : 'normal',
        severity: lv.isAbnormal ? 'unknown' : 'none',
        advice: lv.isAbnormal ? 'Consult a specialist for further evaluation.' : 'Within normal range.',
        medication: [],
        homeCure: [],
        estimatedCost: {}
      });
      continue;
    }

    const ref = matched.ref;
    const val = parseFloat(lv.value);
    const min = ref.min ?? ref.male?.min ?? 0;
    const max = ref.max ?? ref.male?.max ?? 999;
    let status = 'normal', direction = null;

    if (val < min) { status = 'low'; direction = 'low'; }
    else if (val > max) { status = 'high'; direction = 'high'; }

    // Check critical
    if (ref.critical_low && val < ref.critical_low) status = 'critical_low';
    if (ref.critical_high && val > ref.critical_high) status = 'critical_high';

    const isCritical = status.startsWith('critical');
    const advice = direction === 'low' ? ref.low_advice : direction === 'high' ? ref.high_advice : null;

    findings.push({
      parameter: lv.parameter,
      value: lv.value,
      unit: lv.unit || ref.unit,
      normalRange: `${min} - ${max}`,
      status: isCritical ? `CRITICAL (${direction})` : status,
      severity: isCritical ? 'severe' : (advice?.severity || 'none'),
      advice: isCritical
        ? `⚠️ CRITICAL VALUE — Immediate medical attention required for ${lv.parameter}.`
        : direction ? `${lv.parameter} is ${direction}. ${advice ? '' : 'Consult a specialist.'}` : 'Within normal range. No action needed.',
      medication: advice?.medication || [],
      homeCure: advice?.homeCure || [],
      estimatedCost: advice?.estimatedCost || {}
    });
  }
  return findings;
}

function analyzeImagingLocally(record) {
  const title = (record.title || '').toLowerCase();
  const notes = (record.visitNotes || record.description || '').toLowerCase();
  let matchedType = null;

  for (const key of Object.keys(imagingAnalysisDB)) {
    if (title.includes(key) || notes.includes(key)) { matchedType = key; break; }
  }
  if (!matchedType) {
    return {
      imagingType: title,
      overallSeverity: 'unknown',
      findings: [{ finding: 'Unable to auto-analyze this imaging type. Please consult a radiologist.', severity: 'unknown' }],
      medication: [],
      homeCure: [],
      estimatedCost: {}
    };
  }

  const db = imagingAnalysisDB[matchedType];
  // Try to match abnormal findings in the notes
  for (const [key, info] of Object.entries(db.abnormal_map)) {
    if (key !== 'normal' && notes.includes(key)) {
      return {
        imagingType: matchedType,
        finding: key,
        condition: info.condition,
        overallSeverity: info.severity,
        medication: info.medication,
        homeCure: info.homeCure,
        estimatedCost: info.estimatedCost
      };
    }
  }

  // Check if notes indicate normal
  if (db.normal_findings && db.normal_findings.some(f => notes.includes(f))) {
    const norm = db.abnormal_map['normal'];
    return { imagingType: matchedType, finding: 'normal', condition: 'Normal Study', overallSeverity: 'none', medication: [], homeCure: norm?.homeCure || [], estimatedCost: norm?.estimatedCost || {} };
  }

  return {
    imagingType: matchedType,
    overallSeverity: 'unknown',
    findings: [{ finding: 'Could not determine specific findings from report text. A radiologist review is recommended.', severity: 'unknown' }],
    medication: [],
    homeCure: [],
    estimatedCost: {}
  };
}

// ─── Build Gemini prompt ─────────────────────────────────────────────────────

function buildReportAnalysisPrompt(record) {
  let reportContent = '';

  if (record.labValues && record.labValues.length > 0) {
    reportContent += 'LAB TEST RESULTS:\n';
    for (const lv of record.labValues) {
      reportContent += `- ${lv.parameter}: ${lv.value} ${lv.unit || ''} (Normal Range: ${lv.normalRange ? `${lv.normalRange.min}-${lv.normalRange.max}` : 'N/A'}) ${lv.isAbnormal ? '[ABNORMAL]' : '[NORMAL]'}\n`;
    }
  }

  if (record.visitNotes) reportContent += `\nREPORT NOTES:\n${record.visitNotes}\n`;
  if (record.description) reportContent += `\nDESCRIPTION:\n${record.description}\n`;
  if (record.diagnosis?.length) reportContent += `\nDIAGNOSIS: ${record.diagnosis.join(', ')}\n`;
  if (record.symptoms?.length) reportContent += `SYMPTOMS: ${record.symptoms.join(', ')}\n`;

  if (record.vitals) {
    const v = record.vitals;
    reportContent += '\nVITALS:\n';
    if (v.bloodPressure?.systolic) reportContent += `- Blood Pressure: ${v.bloodPressure.systolic}/${v.bloodPressure.diastolic} mmHg\n`;
    if (v.heartRate) reportContent += `- Heart Rate: ${v.heartRate} bpm\n`;
    if (v.temperature) reportContent += `- Temperature: ${v.temperature}°C\n`;
    if (v.oxygenSaturation) reportContent += `- SpO2: ${v.oxygenSaturation}%\n`;
  }

  return `You are an expert medical laboratory and radiology report analyzer. Analyze the following medical report and provide a comprehensive assessment.

REPORT TYPE: ${record.type} (${record.category || 'general'})
REPORT TITLE: ${record.title}
DATE: ${record.date}

${reportContent}

IMPORTANT: Respond ONLY with a valid JSON object (no markdown, no code blocks). The JSON must follow this exact structure:
{
  "overallSeverity": "none|mild|moderate|severe|critical",
  "severityScore": <1-10 number>,
  "summary": "<2-3 sentence summary of the report findings>",
  "findings": [
    {
      "parameter": "<test name or finding>",
      "value": "<value if applicable>",
      "status": "normal|low|high|critical_low|critical_high|abnormal",
      "severity": "none|mild|moderate|severe|critical",
      "interpretation": "<what this means in simple terms>"
    }
  ],
  "medications": [
    {
      "name": "<medicine name with dosage>",
      "purpose": "<what it treats>",
      "duration": "<how long to take>",
      "note": "<any important note>"
    }
  ],
  "homeCure": [
    "<specific home remedy or lifestyle change>"
  ],
  "dietRecommendations": [
    "<specific food or diet advice>"
  ],
  "estimatedCost": {
    "consultation": "<cost range in INR>",
    "medication": "<monthly medication cost range in INR>",
    "furtherTests": "<additional test costs in INR>",
    "treatment": "<treatment cost if applicable in INR>",
    "totalEstimate": "<total estimated range in INR>"
  },
  "urgencyLevel": "routine|soon|urgent|emergency",
  "followUpAdvice": "<when to get re-tested or follow up>",
  "specialistRecommendation": "<which specialist to consult if needed>",
  "warningSignsToWatch": ["<symptom to watch for>"]
}`;
}

// ─── API ROUTES ──────────────────────────────────────────────────────────────

// GET /api/report-analyzer/records - Get patient's analyzable records
router.get('/records', auth, async (req, res) => {
  try {
    const records = await MedicalRecord.find({
      patient: req.user._id
    })
      .populate('doctor', 'firstName lastName specialization')
      .populate('hospital', 'name')
      .sort({ date: -1 })
      .lean();

    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/report-analyzer/analyze - Analyze a specific record
router.post('/analyze', auth, async (req, res) => {
  try {
    const { recordId } = req.body;
    if (!recordId) return res.status(400).json({ success: false, message: 'recordId is required.' });

    const record = await MedicalRecord.findOne({ _id: recordId, patient: req.user._id })
      .populate('doctor', 'firstName lastName specialization')
      .lean();

    if (!record) return res.status(404).json({ success: false, message: 'Record not found.' });

    let analysis = null;

    // Try Gemini API
    if (process.env.GEMINI_API_KEY) {
      try {
        const fetch = (await import('node-fetch')).default;
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

        const prompt = buildReportAnalysisPrompt(record);

        const geminiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, topP: 0.8, maxOutputTokens: 3000 }
          })
        });

        const geminiData = await geminiResponse.json();
        if (geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
          let text = geminiData.candidates[0].content.parts[0].text;
          text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          analysis = JSON.parse(text);
          analysis.source = 'ai';
        }
      } catch (aiErr) {
        console.error('Gemini report analysis error:', aiErr.message);
      }
    }

    // Fallback to local analysis
    if (!analysis) {
      const isImaging = record.type === 'imaging';
      const hasLabValues = record.labValues && record.labValues.length > 0;

      if (hasLabValues) {
        const labFindings = analyzeLabValuesLocally(record.labValues);
        const severities = labFindings.map(f => f.severity);
        const sevOrder = ['none', 'unknown', 'mild', 'moderate', 'severe', 'critical'];
        const maxSev = severities.reduce((a, b) => sevOrder.indexOf(a) > sevOrder.indexOf(b) ? a : b, 'none');
        const abnormalCount = labFindings.filter(f => f.status !== 'normal').length;

        analysis = {
          source: 'local',
          overallSeverity: maxSev,
          severityScore: maxSev === 'none' ? 1 : maxSev === 'mild' ? 3 : maxSev === 'moderate' ? 5 : maxSev === 'severe' ? 7 : 9,
          summary: `Analysis of ${labFindings.length} parameters: ${abnormalCount} abnormal finding(s) detected. Overall severity: ${maxSev}.`,
          findings: labFindings.map(f => ({
            parameter: f.parameter, value: `${f.value}`, status: f.status,
            severity: f.severity, interpretation: f.advice
          })),
          medications: labFindings.flatMap(f => f.medication.map(m => ({ name: m, purpose: `For ${f.status} ${f.parameter}` }))),
          homeCure: [...new Set(labFindings.flatMap(f => f.homeCure))],
          dietRecommendations: [],
          estimatedCost: labFindings.reduce((acc, f) => {
            if (f.estimatedCost.consultation) acc.consultation = f.estimatedCost.consultation;
            if (f.estimatedCost.medication) acc.medication = f.estimatedCost.medication;
            if (f.estimatedCost.tests) acc.furtherTests = f.estimatedCost.tests;
            return acc;
          }, {}),
          urgencyLevel: maxSev === 'severe' || maxSev === 'critical' ? 'urgent' : maxSev === 'moderate' ? 'soon' : 'routine',
          followUpAdvice: abnormalCount > 0 ? 'Retest abnormal parameters in 4-6 weeks. Consult a specialist if values don\'t improve.' : 'Routine follow-up in 6-12 months.',
          specialistRecommendation: abnormalCount > 0 ? 'Consult a physician or relevant specialist based on abnormal parameters.' : 'No specialist needed at this time.',
          warningSignsToWatch: abnormalCount > 0 ? ['Unusual fatigue', 'Sudden weight changes', 'Persistent symptoms', 'Dizziness or weakness'] : []
        };
      } else if (isImaging) {
        const imgResult = analyzeImagingLocally(record);
        analysis = {
          source: 'local',
          overallSeverity: imgResult.overallSeverity,
          severityScore: imgResult.overallSeverity === 'none' ? 1 : imgResult.overallSeverity === 'mild' ? 3 : imgResult.overallSeverity === 'moderate' ? 5 : imgResult.overallSeverity === 'severe' ? 7 : 5,
          summary: imgResult.condition ? `${imgResult.imagingType.toUpperCase()}: ${imgResult.condition} detected.` : `${imgResult.imagingType.toUpperCase()} analysis completed.`,
          findings: imgResult.findings || [{ parameter: imgResult.imagingType, value: imgResult.finding || 'analyzed', status: imgResult.overallSeverity === 'none' ? 'normal' : 'abnormal', severity: imgResult.overallSeverity, interpretation: imgResult.condition || 'See details.' }],
          medications: (imgResult.medication || []).map(m => ({ name: m, purpose: `For ${imgResult.condition || 'treatment'}` })),
          homeCure: imgResult.homeCure || [],
          dietRecommendations: [],
          estimatedCost: imgResult.estimatedCost || {},
          urgencyLevel: imgResult.overallSeverity === 'severe' ? 'urgent' : imgResult.overallSeverity === 'moderate' ? 'soon' : 'routine',
          followUpAdvice: imgResult.overallSeverity !== 'none' ? 'Follow up with the specialist within 1-2 weeks.' : 'No immediate follow-up needed.',
          specialistRecommendation: imgResult.overallSeverity !== 'none' ? 'Consult a specialist for further evaluation.' : 'No specialist needed.',
          warningSignsToWatch: imgResult.overallSeverity !== 'none' ? ['Worsening symptoms', 'New symptoms', 'Difficulty breathing or severe pain'] : []
        };
      } else {
        // Prescription or general record
        analysis = {
          source: 'local',
          overallSeverity: record.diagnosis?.length ? 'mild' : 'none',
          severityScore: record.diagnosis?.length ? 3 : 1,
          summary: `${record.type.replace('-', ' ')} record for: ${record.title}. ${record.diagnosis?.length ? `Diagnoses: ${record.diagnosis.join(', ')}` : 'No specific diagnoses recorded.'}`,
          findings: (record.diagnosis || []).map(d => ({ parameter: d, status: 'noted', severity: 'mild', interpretation: `Diagnosed condition: ${d}` })),
          medications: [],
          homeCure: record.symptoms?.length ? ['Rest adequately', 'Stay hydrated', 'Follow prescribed medication', 'Monitor symptoms'] : [],
          dietRecommendations: ['Balanced diet with fruits and vegetables', 'Adequate water intake (2-3L daily)'],
          estimatedCost: { consultation: '500-800' },
          urgencyLevel: 'routine',
          followUpAdvice: 'Follow up as per doctor\'s advice on the prescription.',
          specialistRecommendation: record.doctor ? `Follow up with Dr. ${record.doctor.firstName} ${record.doctor.lastName}` : 'Consult your doctor.',
          warningSignsToWatch: ['Symptoms worsening', 'New symptoms appearing', 'Medication side effects']
        };
      }
    }

    res.json({
      success: true,
      data: {
        record: {
          _id: record._id,
          title: record.title,
          type: record.type,
          category: record.category,
          date: record.date,
          doctor: record.doctor
        },
        analysis
      }
    });
  } catch (error) {
    console.error('Report analysis error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
