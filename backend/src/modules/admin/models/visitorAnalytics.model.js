import mongoose from 'mongoose';

const visitorAnalyticsSchema = new mongoose.Schema(
  {
    dateStr: {
      type: String, // format YYYY-MM-DD
      required: true,
      unique: true,
      index: true,
    },
    totalHits: {
      type: Number,
      default: 0,
    },
    uniqueVisitors: {
      type: Number,
      default: 0,
    },
    returningVisitors: {
      type: Number,
      default: 0,
    },
    visitorIps: [
      {
        type: String,
      },
    ],
    registrationsCount: {
      type: Number,
      default: 0,
    },
    paidConversionsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const VisitorAnalytics = mongoose.model('VisitorAnalytics', visitorAnalyticsSchema);
