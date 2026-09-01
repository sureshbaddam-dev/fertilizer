import mongoose from 'mongoose';
import { softDeletePlugin } from '../../../common/softDelete.plugin.js';

const productSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      index: true,
    },
    code: {
      type: String,
      trim: true,
      sparse: true,
    },
    barcode: {
      type: String,
      trim: true,
      index: true,
    },
    image: {
      type: String,
      trim: true,
      default: '/assets/urea_bag.png',
    },

    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
      index: true,
    },
    defaultUnitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Unit',
      required: [true, 'Default Unit is required'],
      index: true,
    },
    hsnCode: {
      type: String,
      trim: true,
    },
    gstRate: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    discountType: {
      type: String,
      enum: ['Percentage', 'Amount'],
      default: 'Percentage',
    },
    minimumStockAlert: {
      type: Number,
      default: 10,
    },
    defaultPurchaseRate: {
      type: Number,
      default: 0,
    },
    defaultMrp: {
      type: Number,
      default: 0,
    },
    defaultSellingPrice: {
      type: Number,
      required: [true, 'Default Selling Price is required'],
      default: 0,
      index: true,
    },
    totalStock: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual aliases for legacy/interchangeable compatibility
productSchema.virtual('unitId').get(function () {
  return this.defaultUnitId;
});

// Pre-validate normalization hook
productSchema.pre('validate', function (next) {
  if (!this.brandId && this._doc?.companyId) {
    this.brandId = this._doc.companyId;
  }
  if (!this.defaultUnitId && this._doc?.unitId) {
    this.defaultUnitId = this._doc.unitId;
  }
  if (!this.image || typeof this.image !== 'string' || !this.image.trim()) {
    this.image = '/assets/urea_bag.png';
  }
  if (typeof this.totalStock === 'number') {
    this.totalStock = Math.max(0, this.totalStock);
  }
  next();
});

productSchema.plugin(softDeletePlugin);
productSchema.index({ name: 'text', barcode: 'text', code: 'text' });
productSchema.index({ userId: 1, categoryId: 1, isActive: 1 });
productSchema.index({ userId: 1, totalStock: 1, isActive: 1 });
productSchema.index({ userId: 1, brandId: 1, isActive: 1 });
productSchema.index({ userId: 1, isActive: 1, name: 1 });

export const Product = mongoose.model('Product', productSchema);
