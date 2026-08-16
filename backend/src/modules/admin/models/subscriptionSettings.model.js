import mongoose from 'mongoose';

const subscriptionSettingsSchema = new mongoose.Schema(
  {
    planName: {
      type: String,
      default: 'Fertilizer ERP',
    },
    planCode: {
      type: String,
      default: 'FERTILIZER_ERP',
    },
    durations: [
      {
        code: { type: String, required: true }, // '1_MONTH', '3_MONTHS', '6_MONTHS'
        label: { type: String, required: true }, // '1 Month', '3 Months', '6 Months'
        months: { type: Number, required: true },
        amount: { type: Number, required: true }, // e.g. 199, 499, 899
        offerPrice: { type: Number, default: null },
        isEnabled: { type: Boolean, default: true },
      },
    ],
    demoSettings: {
      isDemoAvailable: { type: Boolean, default: true },
      defaultDemoDays: { type: Number, default: 7 },
    },
  },
  {
    timestamps: true,
  }
);

export const SubscriptionSettings = mongoose.model('SubscriptionSettings', subscriptionSettingsSchema);
