import mongoose from 'mongoose';

const customerPaymentSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    customerName: { type: String, required: true },
    customerMobile: { type: String, default: '' },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesInvoice', default: null, index: true },
    invoiceNumber: { type: String, default: '', index: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMode: { type: String, enum: ['Cash', 'UPI', 'Bank Transfer', 'Cheque'], default: 'Cash' },
    refNo: { type: String, required: true, index: true },
    notes: { type: String, default: '' },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const CustomerPayment = mongoose.model('CustomerPayment', customerPaymentSchema);
