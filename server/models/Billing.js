const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  invoiceNumber: { type: String, unique: true },
  date: { type: Date, default: Date.now },
  items: [{
    description: String,
    category: { type: String, enum: ['consultation', 'procedure', 'lab', 'pharmacy', 'room', 'surgery', 'other'] },
    quantity: { type: Number, default: 1 },
    unitPrice: Number,
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: Number
  }],
  subtotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  dueAmount: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'refunded', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: { type: String, enum: ['cash', 'card', 'upi', 'netbanking', 'insurance', 'wallet', 'other'] },
  paymentDate: Date,
  transactionId: String,
  // Insurance
  insurance: {
    provider: String,
    policyNumber: String,
    claimNumber: String,
    claimStatus: { type: String, enum: ['not-filed', 'submitted', 'pre-authorized', 'approved', 'rejected', 'settled'], default: 'not-filed' },
    claimAmount: Number,
    approvedAmount: Number,
    preAuthorizationId: String,
    documents: [{ name: String, path: String }]
  },
  notes: String,
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  pdfPath: String
}, { timestamps: true });

billingSchema.index({ patient: 1, date: -1 });
billingSchema.index({ hospital: 1, date: -1 });
billingSchema.index({ invoiceNumber: 1 });

// Generate invoice number
billingSchema.pre('save', async function(next) {
  if (this.isNew && !this.invoiceNumber) {
    const date = new Date();
    const prefix = `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const count = await mongoose.model('Billing').countDocuments({
      invoiceNumber: { $regex: `^${prefix}` }
    });
    this.invoiceNumber = `${prefix}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Billing', billingSchema);
