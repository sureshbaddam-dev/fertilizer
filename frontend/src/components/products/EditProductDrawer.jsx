import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, X } from 'lucide-react';
import ImageUpload from '../ui/ImageUpload';

export default function EditProductDrawer({
  isOpen,
  product = null,
  brands = [],
  categories = [],
  units = [],
  onClose,
  onSave,
  onDraftChange,
  isEmbedded = false,
}) {
  const [formData, setFormData] = useState({
    image: '',
    name: '',
    categoryId: '',
    brandId: '',
    unitId: '',
    description: '',
    purchasePrice: 0,
    sellingPrice: 0,
    mrp: 0,
    currentStock: 0,
    lowStockAlert: 10,
    hsnCode: '',
    gstRate: 5,
    trackExpiry: 'No',
    notes: '',
  });

  useEffect(() => {
    if (product) {
      const initial = {
        image: product.image || '',
        name: product.name || '',
        categoryId: product.categoryId?._id || product.categoryId || categories[0]?._id || '',
        brandId: product.brandId?._id || product.brandId || '',
        unitId: product.defaultUnitId?._id || product.unitId?._id || product.defaultUnitId || product.unitId || units[0]?._id || '',
        description: product.description || 'High quality Urea 46% fertilizer for good crop yield.',
        purchasePrice: Number(product.defaultPurchaseRate ?? product.purchasePrice ?? 310),
        sellingPrice: Number(product.defaultSellingPrice ?? product.sellingPrice ?? 270),
        mrp: Number(product.defaultMrp ?? product.mrp ?? 320),
        currentStock: Number(product.totalStock ?? product.currentStock ?? 0),
        lowStockAlert: Number(product.minimumStockAlert ?? product.lowStockAlert ?? 10),
        hsnCode: product.hsnCode || '3102',
        gstRate: product.gstRate !== undefined ? product.gstRate : 5,
        trackExpiry: product.trackExpiry ? 'Yes' : 'No',
        notes: product.notes || '',
      };
      setFormData(initial);
    }
  }, [product?._id, product?.id, isOpen]);

  if (!isOpen || !product) return null;

  const handleChange = (field, val) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: val };
      if (onDraftChange) {
        onDraftChange(updated);
      }
      return updated;
    });
  };

  const cost = Number(formData.purchasePrice) || 0;
  const sell = Number(formData.sellingPrice) || 0;
  const marginPct = cost > 0 ? (((sell - cost) / cost) * 100).toFixed(2) : '0.00';
  const isNegativeMargin = Number(marginPct) < 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    const targetId = product._id || product.id || product.productId;

    if (!targetId) {
      alert('Error: Product ID is missing. Cannot update product.');
      return;
    }

    if (onSave) {
      onSave({
        id: targetId,
        _id: targetId,
        ...formData,
        brandId: formData.brandId,
        defaultUnitId: formData.unitId,
        defaultPurchaseRate: formData.purchasePrice,
        defaultSellingPrice: formData.sellingPrice,
        defaultMrp: formData.mrp,
        minimumStockAlert: formData.lowStockAlert,
      });
    }
  };

  const formContent = (
    <div className="w-full bg-white flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-100 shadow-2xl">
      {/* Top Header Bar */}
      <div className="px-3.5 py-2.5 border-b border-gray-200 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <h2 className="text-xs font-bold text-gray-900">Edit Product</h2>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            <span>Cancel</span>
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-3.5 py-1 btn-agri-primary rounded-md text-[11px] font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
          >
            <Check className="w-3 h-3" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      {/* Main Form Content - ZERO SCROLLING ON DESKTOP */}
      <form onSubmit={handleSubmit} className="p-3 space-y-2.5 text-[11px] overflow-y-auto max-h-[calc(100vh-120px)] lg:max-h-none">
        
        {/* Section 1: Basic Information */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1 text-[#047857] font-bold text-[11px] border-b border-gray-100 pb-1">
            <span>1. Basic Information</span>
          </div>

          <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-12 sm:col-span-6">
              <label className="font-medium text-gray-700 block text-[10px] mb-0.5">Product Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Urea 46%"
                className="w-full px-2 h-7 bg-white border border-gray-300 rounded text-gray-900 font-medium text-[11px] focus:outline-none focus:border-[#00783C]"
              />
            </div>

            <div className="col-span-4 sm:col-span-2">
              <label className="font-medium text-gray-700 block text-[10px] mb-0.5">Category *</label>
              <select
                value={formData.categoryId}
                onChange={(e) => handleChange('categoryId', e.target.value)}
                className="w-full px-1.5 h-7 bg-white border border-gray-300 rounded text-gray-800 text-[11px] focus:outline-none focus:border-[#047857]"
              >
                {categories.map((c) => (
                  <option key={c._id || c.name} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>



            <div className="col-span-4 sm:col-span-2">
              <label className="font-medium text-gray-700 block text-[10px] mb-0.5">Product Brand</label>
              <select
                value={formData.brandId}
                onChange={(e) => handleChange('brandId', e.target.value)}
                className="w-full px-1.5 h-7 bg-white border border-gray-300 rounded text-gray-800 text-[11px] focus:outline-none focus:border-[#047857] font-semibold"
              >
                <option value="">-- Select Brand --</option>
                {brands.map((b) => (
                  <option key={b._id || b.name} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-4 sm:col-span-2">
              <label className="font-medium text-gray-700 block text-[10px] mb-0.5">Unit *</label>
              <select
                value={formData.unitId}
                onChange={(e) => handleChange('unitId', e.target.value)}
                className="w-full px-1.5 h-7 bg-white border border-gray-300 rounded text-gray-800 text-[11px] focus:outline-none focus:border-[#047857]"
              >
                {units.map((u) => (
                  <option key={u._id || u.name} value={u._id}>
                    {u.name} ({u.shortName || 'Unit'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="font-medium text-gray-700 block text-[10px] mb-0.5">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="High quality Urea 46% fertilizer for good crop yield."
              className="w-full px-2 h-7 bg-white border border-gray-300 rounded text-gray-800 text-[11px] focus:outline-none focus:border-[#00783C]"
            />
          </div>
        </div>

        {/* Section 2: Pricing Information */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-1">
            <span className="text-[#047857] font-bold text-[11px]">2. Pricing Information</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="font-medium text-gray-700 block text-[10px] mb-0.5">Purchase Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.purchasePrice}
                onChange={(e) => handleChange('purchasePrice', e.target.value)}
                className="w-full px-2 h-7 bg-white border border-gray-300 rounded text-[11px] font-mono font-medium text-gray-900 focus:outline-none focus:border-[#00783C]"
              />
            </div>

            <div>
              <label className="font-medium text-gray-700 block text-[10px] mb-0.5">Selling Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.sellingPrice}
                onChange={(e) => handleChange('sellingPrice', e.target.value)}
                className="w-full px-2 h-7 bg-white border border-gray-300 rounded text-[11px] font-mono font-medium text-gray-900 focus:outline-none focus:border-[#00783C]"
              />
            </div>

            <div>
              <label className="font-medium text-gray-700 block text-[10px] mb-0.5">MRP (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.mrp}
                onChange={(e) => handleChange('mrp', e.target.value)}
                className="w-full px-2 h-7 bg-white border border-gray-300 rounded text-[11px] font-mono text-gray-800 focus:outline-none focus:border-[#00783C]"
              />
            </div>

            <div>
              <label className="font-medium text-gray-500 block text-[10px] mb-0.5">Profit Margin</label>
              <div
                className={`h-7 flex items-center justify-center rounded text-[11px] font-bold font-mono border ${
                  isNegativeMargin
                    ? 'bg-red-50 text-red-600 border-red-200'
                    : 'badge-agri-active'
                }`}
              >
                {marginPct}%
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Stock & Alert */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-1">
            <span className="text-[#047857] font-bold text-[11px]">3. Inventory Threshold Alert</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-medium text-gray-700 block text-[10px] mb-0.5">Low Stock Alert *</label>
              <input
                type="number"
                value={formData.lowStockAlert}
                onChange={(e) => handleChange('lowStockAlert', e.target.value)}
                className="w-full px-2 h-7 bg-white border border-gray-300 rounded text-[11px] font-mono font-medium text-gray-900 focus:outline-none focus:border-[#00783C]"
              />
            </div>

            <div>
              <label className="font-medium text-gray-700 block text-[10px] mb-0.5">Track Expiry</label>
              <select
                value={formData.trackExpiry}
                onChange={(e) => handleChange('trackExpiry', e.target.value)}
                className="w-full px-1.5 h-7 bg-white border border-gray-300 rounded text-[11px] text-gray-800 focus:outline-none focus:border-[#00783C]"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Additional Information (Optional) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-1">
            <span className="text-[#047857] font-bold text-[11px]">4. Additional Information (Optional)</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="font-medium text-gray-700 block text-[10px] mb-0.5">HSN Code</label>
              <input
                type="text"
                value={formData.hsnCode}
                onChange={(e) => handleChange('hsnCode', e.target.value)}
                placeholder="3102"
                className="w-full px-2 h-7 bg-white border border-gray-300 rounded text-[11px] font-mono text-gray-800 focus:outline-none focus:border-[#00783C]"
              />
            </div>

            <div>
              <label className="font-medium text-gray-700 block text-[10px] mb-0.5">GST Rate (%)</label>
              <input
                type="number"
                value={formData.gstRate}
                onChange={(e) => handleChange('gstRate', e.target.value)}
                placeholder="5"
                className="w-full px-2 h-7 bg-white border border-gray-300 rounded text-[11px] font-mono text-gray-800 focus:outline-none focus:border-[#00783C]"
              />
            </div>

            <div>
              <label className="font-medium text-gray-700 block text-[10px] mb-0.5">Notes</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Enter notes if any..."
                className="w-full px-2 h-7 bg-white border border-gray-300 rounded text-[11px] text-gray-800 focus:outline-none focus:border-[#00783C]"
              />
            </div>
          </div>
        </div>

      </form>

      {/* Footer */}
      <div className="px-3.5 py-2 border-t border-gray-200 flex items-center justify-end gap-1.5 bg-gray-50/50 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="px-4 py-1 btn-agri-primary rounded-md text-[11px] font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
        >
          <Check className="w-3 h-3" />
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  );

  if (isEmbedded) {
    return formContent;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end transition-opacity">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
        {formContent}
      </div>
    </div>
  );
}
