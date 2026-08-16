import mongoose from 'mongoose';

const customerPaymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    customerName: { type: String, required: true },
    customerMobile: { type: String, default: '' },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesInvoice', default: null, index: true },
    invoiceNumber: { type: String, default: '', index: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMode: { type: String, enum: ['Cash', 'UPI', 'Bank Transfer', 'Cheque'], default: 'Cash' },
    refNo: { type: String, required: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export const CustomerPayment = mongoose.model('CustomerPayment', customerPaymentSchema);
