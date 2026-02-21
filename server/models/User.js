const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const familyMemberSchema = new mongoose.Schema({
  name: String,
  relationship: { type: String, enum: ['spouse', 'parent', 'child', 'sibling', 'dependent', 'other'] },
  dateOfBirth: Date,
  phone: String,
  bloodGroup: String
});

const emergencyContactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  relationship: String,
  phone: { type: String, required: true },
  email: String
});

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true },
  password: { type: String, required: true, minlength: 6 },
  role: {
    type: String,
    enum: ['patient', 'doctor', 'receptionist', 'admin', 'superadmin'],
    default: 'patient'
  },
  profilePhoto: { type: String, default: '' },
  dateOfBirth: Date,
  gender: { type: String, enum: ['male', 'female', 'other'] },
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''] },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' }
  },
  // Patient-specific
  allergies: [{ name: String, severity: { type: String, enum: ['mild', 'moderate', 'severe'] }, notes: String }],
  ongoingMedications: [{ name: String, dosage: String, frequency: String, startDate: Date }],
  chronicConditions: [String],
  emergencyContacts: [emergencyContactSchema],
  familyMembers: [familyMemberSchema],
  insuranceInfo: {
    provider: String,
    policyNumber: String,
    groupNumber: String,
    validTill: Date
  },
  // Doctor-specific
  specialization: String,
  qualifications: [String],
  experience: Number,
  licenseNumber: String,
  consultationFee: { type: Number, default: 0 },
  consultationDuration: { type: Number, default: 15 }, // minutes
  maxPatientsPerDay: { type: Number, default: 40 },
  departments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
  digitalSignature: String,
  bio: String,
  // Hospital association
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  hospitals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' }],
  // 2FA
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: String,
  // OTP
  otp: String,
  otpExpiry: Date,
  // Status
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  lastLogin: Date,
  // Ratings (doctor)
  averageRating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
  // Subscription / Tenant
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' }
}, { timestamps: true });

userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ role: 1 });
userSchema.index({ hospital: 1 });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.twoFactorSecret;
  delete obj.otp;
  delete obj.otpExpiry;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
