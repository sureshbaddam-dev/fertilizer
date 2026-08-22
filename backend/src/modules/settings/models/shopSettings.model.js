import mongoose from 'mongoose';

const shopSettingsSchema = new mongoose.Schema(
  {
    // Tenant Ownership
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    // 1. Shop Information
    shopName: { type: String, default: '' },
    ownerName: { type: String, default: '' },
    mobile: { type: String, default: '' },
    alternateMobile: { type: String, default: '' },
    whatsappNumber: { type: String, default: '' },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    village: { type: String, default: '' },
    mandal: { type: String, default: '' },
    district: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
    gstNumber: { type: String, default: '' },
    panNumber: { type: String, default: '' },
    fertilizerLicense: { type: String, default: '' },
    pesticideLicense: { type: String, default: '' },
    seedLicense: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    signatureUrl: { type: String, default: '' },
    shopBannerUrl: { type: String, default: '' },

    // 2. Billing Settings
    invoicePrefix: { type: String, default: 'INV-2026' },
    paymentPrefix: { type: String, default: 'PAY-2026' },
    ledgerPrefix: { type: String, default: 'LED-2026' },
    defaultPaymentMode: { type: String, default: 'Cash' },
    isGstEnabled: { type: Boolean, default: true },
    gstType: { type: String, enum: ['CGST_SGST', 'IGST'], default: 'CGST_SGST' },
    defaultGst: { type: Number, default: 0 },
    defaultDiscount: { type: Number, default: 0 },
    taxInclusive: { type: Boolean, default: true },
    invoiceNotes: { type: String, default: '' },
    termsAndConditions: { type: String, default: '' },
    footerText: { type: String, default: 'Computer generated tax invoice' },

    // 3. Financial Settings
    creditLimit: { type: Number, default: 0 },
    defaultCreditDays: { type: Number, default: 30 },
    outstandingReminderDays: { type: Number, default: 7 },
    currencySymbol: { type: String, default: '₹' },
    decimalPrecision: { type: Number, default: 2 },

    // 4. WhatsApp Settings
    shopWhatsappNumber: { type: String, default: '' },
    thankYouMessage: { type: String, default: 'Thank you for your business!' },
    autoAttachPdf: { type: Boolean, default: true },
    autoIncludePayLink: { type: Boolean, default: true },
    autoIncludeQrCode: { type: Boolean, default: true },
    invoiceWhatsappTemplate: {
      type: String,
      default:
        'Dear {{CUSTOMER_NAME}},\n\nThank you for purchasing from {{SHOP_NAME}}.\n\nInvoice No: {{INVOICE_NO}}\nInvoice Amount: ₹ {{AMOUNT}}\n\nPayment Link:\n{{UPI_PAYMENT_LINK}}\n\nThank you.\n{{SHOP_NAME}}\nPhone: {{SHOP_MOBILE}}',
    },
    ledgerWhatsappTemplate: {
      type: String,
      default:
        '🌾 {{SHOP_NAME}}\n\nDear {{CUSTOMER_NAME}},\n\nPlease find your ledger statement summary (Period: {{PERIOD}}):\n\nTotal Purchases: ₹ {{TOTAL_PURCHASES}}\nTotal Paid: ₹ {{TOTAL_PAID}}\nOutstanding Amount: ₹ {{OUTSTANDING}}\n\nTo make payment instantly, click the link below:\n{{UPI_PAYMENT_LINK}}\n\nThank you.\n{{SHOP_NAME}}\nPhone: {{SHOP_MOBILE}}',
    },
    outstandingReminderTemplate: {
      type: String,
      default:
        '🌾 {{SHOP_NAME}}\n\nDear {{CUSTOMER_NAME}},\n\nThis is a friendly reminder regarding your outstanding bill balance of ₹ {{OUTSTANDING}}.\n\nPayment Link:\n{{UPI_PAYMENT_LINK}}\n\nThank you.\n{{SHOP_NAME}}\nPhone: {{SHOP_MOBILE}}',
    },

    // 5. UPI & Payment Settings
    upiId: { type: String, default: '' },
    upiPayeeName: { type: String, default: '' },
    bankName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifscCode: { type: String, default: '' },
    qrCodeUrl: { type: String, default: '' },
    isUpiEnabled: { type: Boolean, default: true },

    // 6. Print & PDF Settings
    showLogo: { type: Boolean, default: true },
    showSignature: { type: Boolean, default: true },
    showQr: { type: Boolean, default: true },
    showFooter: { type: Boolean, default: true },
    showHeader: { type: Boolean, default: true },
    paperSize: { type: String, default: 'A4' },
    margins: { type: String, default: '8mm' },
    fontSize: { type: String, default: '9pt' },
    fontFamily: { type: String, default: 'Helvetica' },
    primaryThemeColor: { type: String, default: '#047857' },

    // 7. Inventory Settings
    lowStockAlertThreshold: { type: Number, default: 10 },
    expiryAlertDays: { type: Number, default: 60 },
    barcodeEnabled: { type: Boolean, default: true },
    defaultUnit: { type: String, default: 'Bag' },
    autoSkuGeneration: { type: Boolean, default: true },

    // 8. User Preferences
    theme: { type: String, default: 'light' },
    language: { type: String, default: 'en' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    timeFormat: { type: String, default: '12h' },
    keyboardShortcuts: { type: Boolean, default: true },

    // 9. System Settings
    autoBackupEnabled: { type: Boolean, default: true },
    backupFrequency: { type: String, default: 'Daily' },
    notificationSettings: { type: Boolean, default: true },
    auditLogsEnabled: { type: Boolean, default: true },
    sessionTimeoutMinutes: { type: Number, default: 120 },
  },
  { timestamps: true }
);

export const ShopSettings = mongoose.model('ShopSettings', shopSettingsSchema);
