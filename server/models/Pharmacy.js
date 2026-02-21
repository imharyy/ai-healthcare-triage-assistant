const mongoose = require('mongoose');

const pharmacySchema = new mongoose.Schema({
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  name: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  inventory: [{
    medicine: {
      name: { type: String, required: true },
      genericName: String,
      manufacturer: String,
      category: String,
      dosageForm: { type: String, enum: ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'inhaler', 'other'] }
    },
    batchNumber: String,
    expiryDate: Date,
    quantity: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 10 },
    isAvailable: { type: Boolean, default: true }
  }],
  orders: [{
    prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [{
      medicineName: String,
      quantity: Number,
      dosage: String,
      price: Number,
      isAvailable: Boolean
    }],
    status: {
      type: String,
      enum: ['received', 'processing', 'ready', 'dispensed', 'cancelled'],
      default: 'received'
    },
    totalAmount: Number,
    orderedAt: { type: Date, default: Date.now },
    completedAt: Date,
    notes: String
  }]
}, { timestamps: true });

pharmacySchema.index({ hospital: 1 });

module.exports = mongoose.model('Pharmacy', pharmacySchema);
