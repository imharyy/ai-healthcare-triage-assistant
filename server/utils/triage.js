// Smart Triage System - Symptom-based intake and department suggestion

const symptomDatabase = {
  'chest-pain': { departments: ['cardiology', 'emergency'], severity: 'high', isEmergency: true },
  'breathing-difficulty': { departments: ['pulmonology', 'emergency'], severity: 'high', isEmergency: true },
  'headache': { departments: ['neurology', 'general'], severity: 'medium', isEmergency: false },
  'fever': { departments: ['general', 'internal-medicine'], severity: 'medium', isEmergency: false },
  'abdominal-pain': { departments: ['gastroenterology', 'general'], severity: 'medium', isEmergency: false },
  'fracture': { departments: ['orthopedics', 'emergency'], severity: 'high', isEmergency: true },
  'skin-rash': { departments: ['dermatology'], severity: 'low', isEmergency: false },
  'eye-pain': { departments: ['ophthalmology'], severity: 'medium', isEmergency: false },
  'ear-pain': { departments: ['ent'], severity: 'low', isEmergency: false },
  'dental-pain': { departments: ['dental'], severity: 'low', isEmergency: false },
  'pregnancy': { departments: ['obstetrics', 'gynecology'], severity: 'medium', isEmergency: false },
  'child-fever': { departments: ['pediatrics'], severity: 'medium', isEmergency: false },
  'urination-problem': { departments: ['urology', 'nephrology'], severity: 'medium', isEmergency: false },
  'joint-pain': { departments: ['orthopedics', 'rheumatology'], severity: 'low', isEmergency: false },
  'anxiety': { departments: ['psychiatry', 'psychology'], severity: 'medium', isEmergency: false },
  'depression': { departments: ['psychiatry', 'psychology'], severity: 'medium', isEmergency: false },
  'unconscious': { departments: ['emergency'], severity: 'critical', isEmergency: true },
  'bleeding': { departments: ['emergency', 'surgery'], severity: 'high', isEmergency: true },
  'allergic-reaction': { departments: ['emergency', 'allergy'], severity: 'high', isEmergency: true },
  'back-pain': { departments: ['orthopedics', 'neurology'], severity: 'low', isEmergency: false },
  'cough': { departments: ['pulmonology', 'general'], severity: 'low', isEmergency: false },
  'vomiting': { departments: ['gastroenterology', 'general'], severity: 'medium', isEmergency: false },
  'dizziness': { departments: ['neurology', 'ent'], severity: 'medium', isEmergency: false },
  'diabetes-checkup': { departments: ['endocrinology', 'internal-medicine'], severity: 'low', isEmergency: false },
  'heart-palpitation': { departments: ['cardiology'], severity: 'high', isEmergency: false },
  'weight-loss': { departments: ['endocrinology', 'general'], severity: 'low', isEmergency: false },
  'fatigue': { departments: ['general', 'internal-medicine'], severity: 'low', isEmergency: false }
};

const severityOrder = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };

function performTriage(symptoms) {
  if (!symptoms || symptoms.length === 0) {
    return {
      severity: 'low',
      suggestedDepartment: 'general',
      isEmergency: false,
      suggestTeleconsultation: true,
      departmentOptions: ['general'],
      triageScore: 1
    };
  }

  let maxSeverity = 'low';
  let isEmergency = false;
  let departmentScores = {};
  let triageScore = 0;

  symptoms.forEach(symptom => {
    const key = symptom.name?.toLowerCase().replace(/\s+/g, '-') || symptom;
    const data = symptomDatabase[key];
    if (data) {
      if (severityOrder[data.severity] > severityOrder[maxSeverity]) {
        maxSeverity = data.severity;
      }
      if (data.isEmergency) isEmergency = true;
      data.departments.forEach(dept => {
        departmentScores[dept] = (departmentScores[dept] || 0) + severityOrder[data.severity];
      });
      triageScore += severityOrder[data.severity];
    }

    // Factor in duration
    if (symptom.duration) {
      const durationDays = parseDuration(symptom.duration);
      if (durationDays > 7) triageScore += 1;
      if (durationDays > 30) triageScore += 2;
    }

    // Factor in user-reported severity
    if (symptom.severity === 'severe') triageScore += 2;
    else if (symptom.severity === 'moderate') triageScore += 1;
  });

  const sortedDepts = Object.entries(departmentScores).sort((a, b) => b[1] - a[1]);
  const suggestedDepartment = sortedDepts.length > 0 ? sortedDepts[0][0] : 'general';

  // Teleconsultation suggestion
  const suggestTeleconsultation = !isEmergency && severityOrder[maxSeverity] <= 2;

  return {
    severity: maxSeverity,
    suggestedDepartment,
    isEmergency,
    suggestTeleconsultation,
    departmentOptions: sortedDepts.map(d => d[0]),
    triageScore
  };
}

function parseDuration(duration) {
  const str = duration.toLowerCase();
  const num = parseInt(str) || 1;
  if (str.includes('hour')) return num / 24;
  if (str.includes('day')) return num;
  if (str.includes('week')) return num * 7;
  if (str.includes('month')) return num * 30;
  if (str.includes('year')) return num * 365;
  return num;
}

function getAvailableSymptoms() {
  return Object.keys(symptomDatabase).map(key => ({
    id: key,
    name: key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    severity: symptomDatabase[key].severity,
    departments: symptomDatabase[key].departments
  }));
}

module.exports = { performTriage, getAvailableSymptoms, symptomDatabase };
