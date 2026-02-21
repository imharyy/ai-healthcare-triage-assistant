const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  type: { type: String, enum: ['hospital', 'clinic', 'pathology', 'multispecialty'], default: 'hospital' },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  website: String,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' },
    coordinates: { lat: Number, lng: Number }
  },
  departments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
  services: [String],
  facilities: [String],
  logo: String,
  images: [String],
  policies: {
    cancellationPolicy: String,
    noShowPolicy: String,
    refundPolicy: String,
    consentRequired: { type: Boolean, default: true }
  },
  operatingHours: {
    monday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    tuesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    wednesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    thursday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    friday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    saturday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    sunday: { open: String, close: String, isOpen: { type: Boolean, default: false } }
  },
  beds: {
    icu: { total: { type: Number, default: 0 }, available: { type: Number, default: 0 } },
    general: { total: { type: Number, default: 0 }, available: { type: Number, default: 0 } },
    emergency: { total: { type: Number, default: 0 }, available: { type: Number, default: 0 } },
    pediatric: { total: { type: Number, default: 0 }, available: { type: Number, default: 0 } },
    maternity: { total: { type: Number, default: 0 }, available: { type: Number, default: 0 } }
  },
  subscription: {
    plan: { type: String, enum: ['free', 'basic', 'premium', 'enterprise'], default: 'free' },
    validUntil: Date,
    maxDoctors: { type: Number, default: 5 },
    maxPatients: { type: Number, default: 500 },
    features: [String]
  },
  emergencyServices: { type: Boolean, default: true },
  ambulanceAvailable: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  rating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

hospitalSchema.index({ 'address.coordinates': '2dsphere' });
hospitalSchema.index({ code: 1 });

module.exports = mongoose.model('Hospital', hospitalSchema);
