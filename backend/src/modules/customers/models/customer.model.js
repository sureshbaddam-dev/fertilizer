import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, index: true },
    mobile: { type: String, required: true },
    village: { type: String, default: 'Narketpally' },
    mandal: { type: String, default: 'Narketpally' },
    district: { type: String, default: 'Nalgonda' },
    address: { type: String, default: '' },
    customerType: { type: String, enum: ['ADDED', 'GENERAL', 'Registered', 'Walk-in', 'regular', 'walkin'], default: 'ADDED', index: true },
    type: { type: String, default: 'Regular' }, // Regular, Wholesale
    status: { type: String, default: 'Active' }, // Active, Inactive, Blocked
    isActive: { type: Boolean, default: true, index: true },
    totalPurchases: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    outstandingBalance: { type: Number, default: 0 },
    advanceBalance: { type: Number, default: 0 },
    gstin: { type: String, default: '' },
    creditLimit: { type: Number, default: 50000 },
    notes: [
      {
        text: { type: String, required: true },
        author: { type: String, default: 'Admin' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    documents: [
      {
        title: { type: String, required: true },
        fileUrl: { type: String, required: true },
        fileType: { type: String, default: 'PDF' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

customerSchema.index(
  { userId: 1, mobile: 1 },
  {
    unique: true,
    partialFilterExpression: { customerType: 'ADDED' },
  }
);
customerSchema.index({ userId: 1, customerType: 1, isActive: 1 });
customerSchema.index({ userId: 1, name: 1, mobile: 1 });

export const Customer = mongoose.model('Customer', customerSchema);
