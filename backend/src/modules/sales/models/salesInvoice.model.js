import mongoose from 'mongoose';

const batchAllocationSchema = new mongoose.Schema({
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductBatch' },
  batchNumber: { type: String, default: '' },
  quantity: { type: Number, default: 0 },
  purchaseRate: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
});

const salesInvoiceItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productCode: { type: String, default: '' },
  productName: { type: String, required: true },
  brandName: { type: String, default: '' },
  categoryName: { type: String, default: '' },
  unitName: { type: String, default: 'Unit' },
  hsnCode: { type: String, default: '' },
  batchNumber: { type: String, default: '' },
  batchAllocations: [batchAllocationSchema],
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  purchaseCostRate: { type: Number, default: 0 },
  discountPct: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  gstRate: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  taxableAmount: { type: Number, default: 0 },
  lineTotal: { type: Number, default: 0 },
  lineProfit: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
});

const salesInvoiceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    invoiceNumber: { type: String, required: true },
    date: { type: Date, default: Date.now },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null, index: true },
    customerType: { type: String, enum: ['ADDED', 'GENERAL'], default: 'GENERAL', index: true },
    customerName: { type: String, required: true, index: true },
    customerMobile: { type: String, default: '', index: true },
    customerAddress: { type: String, default: '' },
    items: [salesInvoiceItemSchema],
    subtotal: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Paid', 'Partial', 'Due', 'Unpaid', 'Cancelled'],
      default: 'Due',
      index: true,
    },
    dueStatus: {
      type: String,
      enum: ['No Due', 'Due In 30 Days', 'Overdue'],
      default: 'No Due',
    },
    paymentMode: {
      type: String,
      enum: ['Cash', 'UPI', 'Card', 'Credit', 'Bank Transfer'],
      default: 'Cash',
      index: true,
    },
    notes: { type: String, default: '' },
    idempotencyKey: { type: String, default: null, index: true },
    isStockDeducted: { type: Boolean, default: true },
  },
  { timestamps: true }
);

salesInvoiceSchema.index({ userId: 1, invoiceNumber: 1 }, { unique: true });
salesInvoiceSchema.index({ userId: 1, date: -1, createdAt: -1 });
salesInvoiceSchema.index({ userId: 1, customerId: 1, status: 1 });
salesInvoiceSchema.index({ userId: 1, isDeleted: 1, customerType: 1 });
salesInvoiceSchema.index({ userId: 1, customerName: 1 });
salesInvoiceSchema.index({ userId: 1, 'items.productId': 1 });

export const SalesInvoice = mongoose.model('SalesInvoice', salesInvoiceSchema);
