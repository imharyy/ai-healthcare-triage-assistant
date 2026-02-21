const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Department = require('../models/Department');
const { symptomDatabase } = require('../utils/triage');

// In-memory conversation store (per user session)
const conversations = new Map();

// Comprehensive symptom-to-specialty mapping
const symptomSpecialtyMap = {
  // Cardiology
  'chest pain': { specialties: ['Cardiology', 'Emergency Medicine'], urgency: 'emergency', departments: ['cardiology', 'emergency'] },
  'heart palpitation': { specialties: ['Cardiology'], urgency: 'urgent', departments: ['cardiology'] },
  'irregular heartbeat': { specialties: ['Cardiology'], urgency: 'urgent', departments: ['cardiology'] },
  'shortness of breath': { specialties: ['Cardiology', 'Pulmonology'], urgency: 'urgent', departments: ['cardiology', 'pulmonology'] },
  'high blood pressure': { specialties: ['Cardiology', 'Internal Medicine'], urgency: 'non-urgent', departments: ['cardiology', 'internal-medicine'] },
  'swollen legs': { specialties: ['Cardiology', 'Nephrology'], urgency: 'non-urgent', departments: ['cardiology', 'nephrology'] },

  // Pulmonology
  'breathing difficulty': { specialties: ['Pulmonology', 'Emergency Medicine'], urgency: 'emergency', departments: ['pulmonology', 'emergency'] },
  'chronic cough': { specialties: ['Pulmonology'], urgency: 'non-urgent', departments: ['pulmonology'] },
  'cough': { specialties: ['Pulmonology', 'General Medicine'], urgency: 'self-care', departments: ['pulmonology', 'general'] },
  'wheezing': { specialties: ['Pulmonology', 'Allergy'], urgency: 'urgent', departments: ['pulmonology'] },
  'asthma': { specialties: ['Pulmonology'], urgency: 'urgent', departments: ['pulmonology'] },

  // Neurology
  'headache': { specialties: ['Neurology', 'General Medicine'], urgency: 'non-urgent', departments: ['neurology', 'general'] },
  'severe headache': { specialties: ['Neurology', 'Emergency Medicine'], urgency: 'urgent', departments: ['neurology', 'emergency'] },
  'migraine': { specialties: ['Neurology'], urgency: 'non-urgent', departments: ['neurology'] },
  'dizziness': { specialties: ['Neurology', 'ENT'], urgency: 'non-urgent', departments: ['neurology', 'ent'] },
  'numbness': { specialties: ['Neurology'], urgency: 'urgent', departments: ['neurology'] },
  'seizure': { specialties: ['Neurology', 'Emergency Medicine'], urgency: 'emergency', departments: ['neurology', 'emergency'] },
  'fainting': { specialties: ['Neurology', 'Cardiology'], urgency: 'urgent', departments: ['neurology', 'cardiology'] },
  'memory loss': { specialties: ['Neurology'], urgency: 'non-urgent', departments: ['neurology'] },
  'tremor': { specialties: ['Neurology'], urgency: 'non-urgent', departments: ['neurology'] },

  // Orthopedics
  'back pain': { specialties: ['Orthopedics', 'Neurology'], urgency: 'non-urgent', departments: ['orthopedics', 'neurology'] },
  'joint pain': { specialties: ['Orthopedics', 'Rheumatology'], urgency: 'non-urgent', departments: ['orthopedics'] },
  'fracture': { specialties: ['Orthopedics', 'Emergency Medicine'], urgency: 'emergency', departments: ['orthopedics', 'emergency'] },
  'knee pain': { specialties: ['Orthopedics'], urgency: 'non-urgent', departments: ['orthopedics'] },
  'neck pain': { specialties: ['Orthopedics', 'Neurology'], urgency: 'non-urgent', departments: ['orthopedics'] },
  'muscle pain': { specialties: ['Orthopedics', 'General Medicine'], urgency: 'self-care', departments: ['orthopedics'] },
  'sprain': { specialties: ['Orthopedics'], urgency: 'non-urgent', departments: ['orthopedics'] },

  // Gastroenterology
  'abdominal pain': { specialties: ['Gastroenterology', 'General Medicine'], urgency: 'non-urgent', departments: ['gastroenterology', 'general'] },
  'stomach pain': { specialties: ['Gastroenterology'], urgency: 'non-urgent', departments: ['gastroenterology'] },
  'nausea': { specialties: ['Gastroenterology', 'General Medicine'], urgency: 'self-care', departments: ['gastroenterology'] },
  'vomiting': { specialties: ['Gastroenterology', 'General Medicine'], urgency: 'non-urgent', departments: ['gastroenterology'] },
  'diarrhea': { specialties: ['Gastroenterology'], urgency: 'self-care', departments: ['gastroenterology'] },
  'constipation': { specialties: ['Gastroenterology'], urgency: 'self-care', departments: ['gastroenterology'] },
  'bloating': { specialties: ['Gastroenterology'], urgency: 'self-care', departments: ['gastroenterology'] },
  'acid reflux': { specialties: ['Gastroenterology'], urgency: 'self-care', departments: ['gastroenterology'] },
  'blood in stool': { specialties: ['Gastroenterology', 'General Surgery'], urgency: 'urgent', departments: ['gastroenterology'] },

  // Dermatology
  'skin rash': { specialties: ['Dermatology'], urgency: 'non-urgent', departments: ['dermatology'] },
  'acne': { specialties: ['Dermatology'], urgency: 'self-care', departments: ['dermatology'] },
  'itching': { specialties: ['Dermatology', 'Allergy'], urgency: 'self-care', departments: ['dermatology'] },
  'skin infection': { specialties: ['Dermatology'], urgency: 'non-urgent', departments: ['dermatology'] },
  'hair loss': { specialties: ['Dermatology'], urgency: 'self-care', departments: ['dermatology'] },

  // ENT
  'ear pain': { specialties: ['ENT'], urgency: 'non-urgent', departments: ['ent'] },
  'sore throat': { specialties: ['ENT', 'General Medicine'], urgency: 'self-care', departments: ['ent', 'general'] },
  'hearing loss': { specialties: ['ENT'], urgency: 'non-urgent', departments: ['ent'] },
  'nasal congestion': { specialties: ['ENT'], urgency: 'self-care', departments: ['ent'] },
  'sinusitis': { specialties: ['ENT'], urgency: 'non-urgent', departments: ['ent'] },
  'tonsillitis': { specialties: ['ENT'], urgency: 'non-urgent', departments: ['ent'] },

  // Ophthalmology
  'eye pain': { specialties: ['Ophthalmology'], urgency: 'non-urgent', departments: ['ophthalmology'] },
  'blurred vision': { specialties: ['Ophthalmology'], urgency: 'urgent', departments: ['ophthalmology'] },
  'eye redness': { specialties: ['Ophthalmology'], urgency: 'non-urgent', departments: ['ophthalmology'] },
  'vision loss': { specialties: ['Ophthalmology', 'Emergency Medicine'], urgency: 'emergency', departments: ['ophthalmology', 'emergency'] },

  // General / Internal Medicine
  'fever': { specialties: ['General Medicine', 'Internal Medicine'], urgency: 'non-urgent', departments: ['general', 'internal-medicine'] },
  'high fever': { specialties: ['General Medicine', 'Internal Medicine'], urgency: 'urgent', departments: ['general', 'internal-medicine'] },
  'cold': { specialties: ['General Medicine'], urgency: 'self-care', departments: ['general'] },
  'flu': { specialties: ['General Medicine'], urgency: 'self-care', departments: ['general'] },
  'fatigue': { specialties: ['General Medicine', 'Internal Medicine'], urgency: 'self-care', departments: ['general'] },
  'weight loss': { specialties: ['Endocrinology', 'General Medicine'], urgency: 'non-urgent', departments: ['endocrinology'] },
  'weight gain': { specialties: ['Endocrinology'], urgency: 'self-care', departments: ['endocrinology'] },
  'weakness': { specialties: ['General Medicine', 'Internal Medicine'], urgency: 'non-urgent', departments: ['general'] },
  'dehydration': { specialties: ['General Medicine'], urgency: 'urgent', departments: ['general'] },

  // Emergency / Critical
  'unconscious': { specialties: ['Emergency Medicine'], urgency: 'emergency', departments: ['emergency'] },
  'bleeding': { specialties: ['Emergency Medicine', 'General Surgery'], urgency: 'emergency', departments: ['emergency', 'surgery'] },
  'severe bleeding': { specialties: ['Emergency Medicine'], urgency: 'emergency', departments: ['emergency'] },
  'allergic reaction': { specialties: ['Emergency Medicine', 'Allergy'], urgency: 'emergency', departments: ['emergency', 'allergy'] },
  'anaphylaxis': { specialties: ['Emergency Medicine'], urgency: 'emergency', departments: ['emergency'] },
  'burn': { specialties: ['Emergency Medicine', 'Dermatology'], urgency: 'urgent', departments: ['emergency'] },
  'poisoning': { specialties: ['Emergency Medicine'], urgency: 'emergency', departments: ['emergency'] },
  'snake bite': { specialties: ['Emergency Medicine'], urgency: 'emergency', departments: ['emergency'] },
  'difficulty swallowing': { specialties: ['ENT', 'Emergency Medicine'], urgency: 'urgent', departments: ['ent', 'emergency'] },

  // Psychiatry
  'anxiety': { specialties: ['Psychiatry', 'Psychology'], urgency: 'non-urgent', departments: ['psychiatry'] },
  'depression': { specialties: ['Psychiatry', 'Psychology'], urgency: 'non-urgent', departments: ['psychiatry'] },
  'insomnia': { specialties: ['Psychiatry', 'Neurology'], urgency: 'self-care', departments: ['psychiatry'] },
  'panic attack': { specialties: ['Psychiatry'], urgency: 'urgent', departments: ['psychiatry'] },
  'stress': { specialties: ['Psychiatry', 'Psychology'], urgency: 'self-care', departments: ['psychiatry'] },

  // Urology / Nephrology
  'urination problem': { specialties: ['Urology', 'Nephrology'], urgency: 'non-urgent', departments: ['urology'] },
  'blood in urine': { specialties: ['Urology', 'Nephrology'], urgency: 'urgent', departments: ['urology'] },
  'kidney pain': { specialties: ['Nephrology', 'Urology'], urgency: 'urgent', departments: ['nephrology'] },

  // OB/GYN
  'pregnancy': { specialties: ['Obstetrics', 'Gynecology'], urgency: 'non-urgent', departments: ['obstetrics', 'gynecology'] },
  'menstrual problems': { specialties: ['Gynecology'], urgency: 'non-urgent', departments: ['gynecology'] },
  'pelvic pain': { specialties: ['Gynecology'], urgency: 'non-urgent', departments: ['gynecology'] },

  // Pediatrics
  'child fever': { specialties: ['Pediatrics'], urgency: 'urgent', departments: ['pediatrics'] },
  'child cough': { specialties: ['Pediatrics'], urgency: 'non-urgent', departments: ['pediatrics'] },

  // Endocrinology
  'diabetes': { specialties: ['Endocrinology', 'Internal Medicine'], urgency: 'non-urgent', departments: ['endocrinology'] },
  'thyroid problems': { specialties: ['Endocrinology'], urgency: 'non-urgent', departments: ['endocrinology'] },

  // Dental
  'dental pain': { specialties: ['Dental'], urgency: 'non-urgent', departments: ['dental'] },
  'toothache': { specialties: ['Dental'], urgency: 'non-urgent', departments: ['dental'] },
  'gum bleeding': { specialties: ['Dental'], urgency: 'non-urgent', departments: ['dental'] },
};

// Urgency level definitions
const urgencyInfo = {
  'emergency': {
    level: 'Emergency',
    color: '#dc3545',
    icon: '🚨',
    description: 'Requires immediate medical attention. Please visit the emergency department or call emergency services right away.',
    actionRequired: 'GO TO EMERGENCY ROOM IMMEDIATELY or call ambulance'
  },
  'urgent': {
    level: 'Urgent',
    color: '#fd7e14',
    icon: '⚠️',
    description: 'Needs medical attention within a few hours. Please schedule an urgent appointment or visit a clinic today.',
    actionRequired: 'See a doctor within 24 hours'
  },
  'non-urgent': {
    level: 'Non-Urgent',
    color: '#ffc107',
    icon: '📋',
    description: 'Should be evaluated by a healthcare professional, but not immediately life-threatening. Schedule an appointment at your convenience.',
    actionRequired: 'Schedule an appointment within a few days'
  },
  'self-care': {
    level: 'Self-Care',
    color: '#28a745',
    icon: '🏠',
    description: 'Can likely be managed at home with self-care measures. See a doctor if symptoms persist or worsen.',
    actionRequired: 'Monitor at home, see doctor if symptoms persist beyond 3-5 days'
  }
};

// Build AI prompt for symptom analysis
function buildSymptomAnalysisPrompt(userMessage, conversationHistory) {
  const historyText = conversationHistory
    .map(m => `${m.role === 'user' ? 'Patient' : 'Assistant'}: ${m.content}`)
    .join('\n');

  return `You are HealHub AI Health Assistant, a medical symptom analysis assistant integrated into a hospital management system. You provide preliminary health assessments to help patients understand the urgency of their symptoms.

IMPORTANT RULES:
1. You are NOT a replacement for a real doctor. Always include a disclaimer.
2. Be empathetic and clear in your responses.
3. Ask follow-up questions if needed to better assess the situation.
4. Respond in a structured JSON format when you have enough information to assess.

Previous conversation:
${historyText}

Current patient message: "${userMessage}"

Based on the conversation, analyze the symptoms and respond with ONLY a valid JSON object (no markdown, no code blocks, no extra text):

{
  "type": "assessment" or "followup",
  "message": "Your empathetic response to the patient",
  "followUpQuestions": ["question1", "question2"] (only if type is "followup"),
  "assessment": {
    "urgencyLevel": "emergency" or "urgent" or "non-urgent" or "self-care",
    "identifiedSymptoms": ["symptom1", "symptom2"],
    "possibleConditions": ["condition1", "condition2"],
    "recommendedSpecialties": ["specialty1", "specialty2"],
    "medications": [
      {"name": "medication name", "purpose": "what it helps with", "dosage": "suggested dosage", "note": "important note"}
    ],
    "selfCareTips": ["tip1", "tip2"],
    "warningSignsToWatch": ["sign1", "sign2"],
    "disclaimer": "This is an AI-based preliminary assessment and not a medical diagnosis. Please consult a qualified healthcare professional for proper diagnosis and treatment."
  } (only if type is "assessment")
}

If the patient hasn't provided enough information about their symptoms yet, use type "followup" to ask clarifying questions about:
- Duration of symptoms
- Severity (1-10 scale)
- Associated symptoms
- Medical history relevance
- Any medications already taken

If you have enough information, provide a complete assessment with type "assessment".`;
}

// Fallback analysis when AI API is not available
function fallbackAnalysis(userMessage) {
  const messageLower = userMessage.toLowerCase();
  let matchedSymptoms = [];
  let maxUrgency = 'self-care';
  let specialties = new Set();
  let departments = new Set();

  const urgencyPriority = { 'emergency': 4, 'urgent': 3, 'non-urgent': 2, 'self-care': 1 };

  // Match symptoms from the map
  for (const [symptom, data] of Object.entries(symptomSpecialtyMap)) {
    if (messageLower.includes(symptom)) {
      matchedSymptoms.push(symptom);
      data.specialties.forEach(s => specialties.add(s));
      data.departments.forEach(d => departments.add(d));
      if (urgencyPriority[data.urgency] > urgencyPriority[maxUrgency]) {
        maxUrgency = data.urgency;
      }
    }
  }

  // Emergency keywords check
  const emergencyKeywords = ['can\'t breathe', 'unconscious', 'severe bleeding', 'heart attack', 'stroke', 'choking', 'suicide', 'overdose'];
  if (emergencyKeywords.some(kw => messageLower.includes(kw))) {
    maxUrgency = 'emergency';
    specialties.add('Emergency Medicine');
    departments.add('emergency');
  }

  if (matchedSymptoms.length === 0) {
    return null; // No symptoms detected
  }

  // Generate medication suggestions based on urgency and symptoms
  const medications = generateMedicationSuggestions(matchedSymptoms, maxUrgency);
  const selfCareTips = generateSelfCareTips(matchedSymptoms);

  return {
    type: 'assessment',
    message: `Based on your described symptoms (${matchedSymptoms.join(', ')}), here is my preliminary assessment:`,
    assessment: {
      urgencyLevel: maxUrgency,
      identifiedSymptoms: matchedSymptoms,
      possibleConditions: getPossibleConditions(matchedSymptoms),
      recommendedSpecialties: [...specialties],
      medications,
      selfCareTips,
      warningSignsToWatch: getWarningSignsForSymptoms(matchedSymptoms),
      disclaimer: 'This is an AI-based preliminary assessment and not a medical diagnosis. Please consult a qualified healthcare professional for proper diagnosis and treatment.'
    }
  };
}

function generateMedicationSuggestions(symptoms, urgency) {
  const medications = [];
  const symptomSet = new Set(symptoms.map(s => s.toLowerCase()));

  if (urgency === 'emergency') {
    return [{ name: 'Do not self-medicate', purpose: 'Emergency condition', dosage: 'N/A', note: 'Seek immediate emergency medical care. Do not take any medication without professional guidance.' }];
  }

  if (symptomSet.has('fever') || symptomSet.has('high fever')) {
    medications.push({ name: 'Paracetamol (Acetaminophen)', purpose: 'Fever reduction and pain relief', dosage: '500-1000mg every 4-6 hours (max 4g/day)', note: 'Take with water. Avoid if you have liver problems.' });
  }
  if (symptomSet.has('headache') || symptomSet.has('severe headache') || symptomSet.has('migraine')) {
    medications.push({ name: 'Ibuprofen', purpose: 'Pain relief and anti-inflammatory', dosage: '200-400mg every 4-6 hours with food', note: 'Avoid on empty stomach. Not suitable if you have stomach ulcers or kidney problems.' });
  }
  if (symptomSet.has('cold') || symptomSet.has('nasal congestion') || symptomSet.has('flu')) {
    medications.push({ name: 'Cetirizine', purpose: 'Antihistamine for cold/allergy symptoms', dosage: '10mg once daily', note: 'May cause drowsiness. Avoid driving after taking.' });
  }
  if (symptomSet.has('cough') || symptomSet.has('sore throat')) {
    medications.push({ name: 'Honey & warm water', purpose: 'Natural cough and throat relief', dosage: '1-2 teaspoons honey in warm water, 2-3 times daily', note: 'Not suitable for children under 1 year.' });
  }
  if (symptomSet.has('acid reflux') || symptomSet.has('stomach pain') || symptomSet.has('bloating')) {
    medications.push({ name: 'Antacid (Aluminum/Magnesium hydroxide)', purpose: 'Stomach acid neutralization', dosage: 'As per package directions, after meals', note: 'If symptoms persist more than 2 weeks, see a doctor.' });
  }
  if (symptomSet.has('diarrhea')) {
    medications.push({ name: 'ORS (Oral Rehydration Salts)', purpose: 'Prevent dehydration', dosage: 'Mix with clean water as per instructions, sip frequently', note: 'Critical to stay hydrated. See a doctor if bloody diarrhea or lasting > 2 days.' });
  }
  if (symptomSet.has('nausea') || symptomSet.has('vomiting')) {
    medications.push({ name: 'Ondansetron / Domperidone', purpose: 'Anti-nausea medication', dosage: 'As directed by pharmacist', note: 'Take 30 minutes before meals. See doctor if vomiting persists > 24 hours.' });
  }
  if (symptomSet.has('muscle pain') || symptomSet.has('back pain') || symptomSet.has('joint pain')) {
    medications.push({ name: 'Diclofenac gel (topical)', purpose: 'Topical pain relief', dosage: 'Apply to affected area 3-4 times daily', note: 'For external use only. Wash hands after application.' });
  }
  if (symptomSet.has('anxiety') || symptomSet.has('stress') || symptomSet.has('insomnia')) {
    medications.push({ name: 'Lifestyle measures', purpose: 'Stress and anxiety management', dosage: 'Daily practice', note: 'Deep breathing exercises, regular exercise, limit caffeine. Consult a mental health professional if symptoms persist.' });
  }
  if (symptomSet.has('skin rash') || symptomSet.has('itching')) {
    medications.push({ name: 'Calamine lotion / Hydrocortisone cream', purpose: 'Skin irritation relief', dosage: 'Apply thin layer to affected area 2-3 times daily', note: 'Do not use on open wounds. See a dermatologist if it spreads or persists.' });
  }
  if (symptomSet.has('acne')) {
    medications.push({ name: 'Benzoyl peroxide (2.5-5%)', purpose: 'Acne treatment', dosage: 'Apply thin layer once daily at bedtime', note: 'May cause dryness. Use sunscreen during the day. Results take 4-6 weeks.' });
  }

  if (medications.length === 0) {
    medications.push({ name: 'General advice', purpose: 'Symptom management', dosage: 'N/A', note: 'Stay hydrated, rest well, and monitor your symptoms. Consult a healthcare professional for personalized medication advice.' });
  }

  return medications;
}

function generateSelfCareTips(symptoms) {
  const tips = new Set();
  tips.add('Stay well hydrated - drink at least 8 glasses of water daily');
  tips.add('Get adequate rest and sleep (7-9 hours)');

  const symptomSet = new Set(symptoms.map(s => s.toLowerCase()));

  if (symptomSet.has('fever') || symptomSet.has('cold') || symptomSet.has('flu')) {
    tips.add('Use a cool compress on your forehead for fever');
    tips.add('Drink warm fluids like soup or herbal tea');
    tips.add('Avoid cold drinks and stay in a comfortable room temperature');
  }
  if (symptomSet.has('headache') || symptomSet.has('migraine')) {
    tips.add('Rest in a quiet, dark room');
    tips.add('Apply a cold or warm compress to your head/neck');
    tips.add('Avoid screen time and bright lights');
  }
  if (symptomSet.has('back pain') || symptomSet.has('muscle pain') || symptomSet.has('joint pain')) {
    tips.add('Apply hot or cold pack to the affected area');
    tips.add('Gentle stretching exercises can help');
    tips.add('Maintain good posture while sitting and standing');
  }
  if (symptomSet.has('cough') || symptomSet.has('sore throat')) {
    tips.add('Gargle with warm salt water');
    tips.add('Use throat lozenges for comfort');
    tips.add('Avoid smoking and polluted environments');
  }
  if (symptomSet.has('stomach pain') || symptomSet.has('nausea') || symptomSet.has('diarrhea')) {
    tips.add('Eat bland foods (BRAT diet: bananas, rice, applesauce, toast)');
    tips.add('Avoid spicy, oily, or heavy foods');
    tips.add('Eat small, frequent meals instead of large ones');
  }
  if (symptomSet.has('insomnia') || symptomSet.has('stress') || symptomSet.has('anxiety')) {
    tips.add('Practice relaxation techniques like deep breathing or meditation');
    tips.add('Maintain a regular sleep schedule');
    tips.add('Limit caffeine intake, especially after 2 PM');
    tips.add('Exercise regularly but not close to bedtime');
  }
  if (symptomSet.has('skin rash') || symptomSet.has('itching')) {
    tips.add('Avoid scratching the affected area');
    tips.add('Wear loose, cotton clothing');
    tips.add('Keep the area clean and dry');
  }

  return [...tips];
}

function getPossibleConditions(symptoms) {
  const conditions = new Set();
  const symptomSet = new Set(symptoms.map(s => s.toLowerCase()));

  if (symptomSet.has('fever') && symptomSet.has('cough')) conditions.add('Upper respiratory infection');
  if (symptomSet.has('fever') && symptomSet.has('headache')) conditions.add('Viral infection');
  if (symptomSet.has('chest pain')) conditions.add('Cardiac evaluation needed');
  if (symptomSet.has('headache') && symptomSet.has('dizziness')) conditions.add('Possible migraine or vestibular issue');
  if (symptomSet.has('stomach pain') && symptomSet.has('nausea')) conditions.add('Gastritis or food poisoning');
  if (symptomSet.has('cough') && symptomSet.has('breathing difficulty')) conditions.add('Possible bronchitis or asthma');
  if (symptomSet.has('joint pain') && symptomSet.has('fatigue')) conditions.add('Possible arthritis or autoimmune condition');
  if (symptomSet.has('fever')) conditions.add('Possible viral/bacterial infection');
  if (symptomSet.has('headache')) conditions.add('Tension headache / Migraine');
  if (symptomSet.has('skin rash')) conditions.add('Dermatitis / Allergic reaction');
  if (symptomSet.has('back pain')) conditions.add('Muscle strain / Disc issue');
  if (symptomSet.has('anxiety') || symptomSet.has('depression')) conditions.add('Mental health evaluation recommended');

  if (conditions.size === 0) conditions.add('Further medical evaluation needed');
  return [...conditions];
}

function getWarningSignsForSymptoms(symptoms) {
  const signs = new Set();
  signs.add('Sudden worsening of symptoms');
  signs.add('Development of new, severe symptoms');

  const symptomSet = new Set(symptoms.map(s => s.toLowerCase()));

  if (symptomSet.has('fever') || symptomSet.has('high fever')) {
    signs.add('Temperature above 103°F (39.4°C) that doesn\'t respond to medication');
    signs.add('Fever lasting more than 3 days');
  }
  if (symptomSet.has('headache') || symptomSet.has('severe headache')) {
    signs.add('Sudden severe "worst headache of your life"');
    signs.add('Headache with stiff neck, confusion, or vision changes');
  }
  if (symptomSet.has('chest pain')) {
    signs.add('Pain spreading to arm, jaw, or back');
    signs.add('Accompanied by sweating, nausea, or shortness of breath');
  }
  if (symptomSet.has('abdominal pain') || symptomSet.has('stomach pain')) {
    signs.add('Severe, sudden abdominal pain');
    signs.add('Abdominal rigidity or tenderness');
  }
  if (symptomSet.has('vomiting') || symptomSet.has('diarrhea')) {
    signs.add('Signs of dehydration (dry mouth, dark urine, dizziness)');
    signs.add('Blood in vomit or stool');
  }
  signs.add('Difficulty breathing or chest tightness');
  signs.add('Loss of consciousness or confusion');

  return [...signs];
}

// ============ ROUTES ============

// POST /api/ai-assistant/analyze - Analyze symptoms
router.post('/analyze', auth, async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Please describe your symptoms.' });
    }

    const userId = req.user._id.toString();
    const convKey = conversationId || `${userId}_${Date.now()}`;

    // Get or create conversation
    if (!conversations.has(convKey)) {
      conversations.set(convKey, []);
    }
    const history = conversations.get(convKey);
    history.push({ role: 'user', content: message });

    let aiResponse = null;

    // Try Google Gemini API first
    if (process.env.GEMINI_API_KEY) {
      try {
        const fetch = (await import('node-fetch')).default;
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

        const prompt = buildSymptomAnalysisPrompt(message, history.slice(0, -1));

        const geminiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              topP: 0.8,
              maxOutputTokens: 2048
            }
          })
        });

        const geminiData = await geminiResponse.json();

        if (geminiData.candidates && geminiData.candidates[0]?.content?.parts?.[0]?.text) {
          let responseText = geminiData.candidates[0].content.parts[0].text;
          // Clean up potential markdown code blocks
          responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          aiResponse = JSON.parse(responseText);
        }
      } catch (aiError) {
        console.error('Gemini API error:', aiError.message);
        // Fall through to fallback
      }
    }

    // Fallback to rule-based analysis
    if (!aiResponse) {
      aiResponse = fallbackAnalysis(message);

      if (!aiResponse) {
        // Couldn't detect symptoms — ask follow-up
        aiResponse = {
          type: 'followup',
          message: "I'd like to help you better. Could you please describe your symptoms in more detail? For example:\n\n• What symptoms are you experiencing?\n• How long have you had these symptoms?\n• How severe are they on a scale of 1-10?\n• Do you have any other associated symptoms?",
          followUpQuestions: [
            'What specific symptoms are you experiencing?',
            'How long have you been feeling this way?',
            'On a scale of 1-10, how severe are your symptoms?',
            'Are you currently taking any medications?'
          ]
        };
      }
    }

    // Store assistant response in conversation
    history.push({ role: 'assistant', content: JSON.stringify(aiResponse) });

    // If assessment is complete, find matching doctors
    let recommendedDoctors = [];
    if (aiResponse.type === 'assessment' && aiResponse.assessment?.recommendedSpecialties) {
      try {
        const specialties = aiResponse.assessment.recommendedSpecialties;

        // Search for doctors matching the recommended specialties
        const searchRegexes = specialties.map(s => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));

        const doctors = await User.find({
          role: 'doctor',
          isActive: true,
          $or: [
            { specialization: { $in: searchRegexes } },
            { 'departments': { $exists: true } }
          ]
        })
          .select('firstName lastName specialization qualifications experience consultationFee averageRating totalRatings profilePhoto hospital departments consultationDuration')
          .populate('departments', 'name')
          .populate('hospital', 'name address')
          .limit(10)
          .sort({ averageRating: -1, experience: -1 });

        // Filter and rank doctors
        recommendedDoctors = doctors
          .filter(doc => {
            const specLower = (doc.specialization || '').toLowerCase();
            const deptNames = (doc.departments || []).map(d => (d.name || '').toLowerCase());
            return specialties.some(s => {
              const sLower = s.toLowerCase();
              return specLower.includes(sLower) ||
                sLower.includes(specLower) ||
                deptNames.some(d => d.includes(sLower) || sLower.includes(d));
            }) || specLower.includes('general');
          })
          .slice(0, 6)
          .map(doc => ({
            id: doc._id,
            name: `Dr. ${doc.firstName} ${doc.lastName}`,
            specialization: doc.specialization || 'General Medicine',
            qualifications: doc.qualifications || [],
            experience: doc.experience || 0,
            fee: doc.consultationFee || 0,
            rating: doc.averageRating || 0,
            totalRatings: doc.totalRatings || 0,
            profilePhoto: doc.profilePhoto || '',
            hospital: doc.hospital ? { name: doc.hospital.name, address: doc.hospital.address } : null,
            departments: (doc.departments || []).map(d => d.name),
            consultationDuration: doc.consultationDuration || 15
          }));

        // If no matching specialists found, get general doctors
        if (recommendedDoctors.length === 0) {
          const generalDocs = await User.find({
            role: 'doctor',
            isActive: true
          })
            .select('firstName lastName specialization qualifications experience consultationFee averageRating totalRatings profilePhoto hospital departments consultationDuration')
            .populate('departments', 'name')
            .populate('hospital', 'name address')
            .limit(5)
            .sort({ averageRating: -1 });

          recommendedDoctors = generalDocs.map(doc => ({
            id: doc._id,
            name: `Dr. ${doc.firstName} ${doc.lastName}`,
            specialization: doc.specialization || 'General Medicine',
            qualifications: doc.qualifications || [],
            experience: doc.experience || 0,
            fee: doc.consultationFee || 0,
            rating: doc.averageRating || 0,
            totalRatings: doc.totalRatings || 0,
            profilePhoto: doc.profilePhoto || '',
            hospital: doc.hospital ? { name: doc.hospital.name, address: doc.hospital.address } : null,
            departments: (doc.departments || []).map(d => d.name),
            consultationDuration: doc.consultationDuration || 15
          }));
        }
      } catch (docError) {
        console.error('Error fetching doctors:', docError.message);
      }
    }

    // Clean up old conversations (older than 1 hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [key, val] of conversations.entries()) {
      const keyTime = parseInt(key.split('_').pop());
      if (keyTime && keyTime < oneHourAgo) {
        conversations.delete(key);
      }
    }

    res.json({
      success: true,
      data: {
        conversationId: convKey,
        response: aiResponse,
        urgencyInfo: aiResponse.assessment ? urgencyInfo[aiResponse.assessment.urgencyLevel] : null,
        recommendedDoctors,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('AI Assistant error:', error);
    res.status(500).json({ success: false, message: 'Failed to analyze symptoms. Please try again.' });
  }
});

// GET /api/ai-assistant/symptom-list - Get list of common symptoms
router.get('/symptom-list', auth, async (req, res) => {
  try {
    const symptoms = Object.entries(symptomSpecialtyMap).map(([name, data]) => ({
      name: name.replace(/\b\w/g, l => l.toUpperCase()),
      urgency: data.urgency,
      specialties: data.specialties
    }));

    // Group by category
    const categories = {
      'Heart & Chest': symptoms.filter(s => ['Cardiology', 'Pulmonology'].some(sp => s.specialties.includes(sp))),
      'Head & Brain': symptoms.filter(s => s.specialties.includes('Neurology')),
      'Bones & Joints': symptoms.filter(s => ['Orthopedics', 'Rheumatology'].some(sp => s.specialties.includes(sp))),
      'Stomach & Digestion': symptoms.filter(s => s.specialties.includes('Gastroenterology')),
      'Skin': symptoms.filter(s => s.specialties.includes('Dermatology')),
      'Ear, Nose & Throat': symptoms.filter(s => s.specialties.includes('ENT')),
      'Eyes': symptoms.filter(s => s.specialties.includes('Ophthalmology')),
      'Mental Health': symptoms.filter(s => ['Psychiatry', 'Psychology'].some(sp => s.specialties.includes(sp))),
      'General': symptoms.filter(s => ['General Medicine', 'Internal Medicine'].some(sp => s.specialties.includes(sp))),
      'Emergency': symptoms.filter(s => s.specialties.includes('Emergency Medicine')),
    };

    res.json({ success: true, data: { symptoms, categories } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch symptom list.' });
  }
});

// DELETE /api/ai-assistant/conversation/:id - Clear conversation
router.delete('/conversation/:id', auth, (req, res) => {
  conversations.delete(req.params.id);
  res.json({ success: true, message: 'Conversation cleared.' });
});

module.exports = router;
