import React, { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Check, X, ChevronDown } from 'lucide-react';

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
    lowStockAlert: 10,
    hsnCode: '',
    trackExpiry: 'No',
    notes: '',
  });

  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState(false);
  const batchDropdownRef = React.useRef(null);

  const [batchFormData, setBatchFormData] = useState({
    purchasePrice: '',
    sellingPrice: '',
    mrp: '',
    discount: '',
    discountType: 'Percentage',
    gstRate: '',
    currentStock: 0,
  });

  // Close batch dropdown menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (batchDropdownRef.current && !batchDropdownRef.current.contains(event.target)) {
        setIsBatchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Extract all batches for product
  const rawBatches = useMemo(() => {
    if (!product) return [];
    const bList = Array.isArray(product.batches) ? product.batches : [];
    return bList.filter((b) => b && b.isDeleted !== true);
  }, [product]);

  // Filter ONLY stock-available batches (Remaining Qty > 0)
  const stockAvailableBatches = useMemo(() => {
    const available = rawBatches.filter((b) => {
      const stock = Number(b.currentStock ?? b.quantityRemaining ?? b.quantity ?? 0);
      return stock > 0;
    });
    // Fallback if no stock available batches exist
    return available.length > 0 ? available : rawBatches;
  }, [rawBatches]);

  // Sync basic info & initial selected batch when product or drawer state changes
  useEffect(() => {
    if (product) {
      setFormData({
        image: product.image || '',
        name: product.name || '',
        categoryId: product.categoryId?._id || product.categoryId || categories[0]?._id || '',
        brandId: product.brandId?._id || product.brandId || '',
        unitId: product.defaultUnitId?._id || product.unitId?._id || product.defaultUnitId || product.unitId || units[0]?._id || '',
        description: product.description || '',
        lowStockAlert: Number(product.minimumStockAlert ?? product.lowStockAlert ?? 10),
        hsnCode: product.hsnCode || '',
        trackExpiry: product.trackExpiry ? 'Yes' : 'No',
        notes: product.notes || '',
        discount: product.discount !== undefined && product.discount !== null && product.discount !== '' && Number(product.discount) !== 0 ? String(product.discount) : '',
        discountType: product.discountType || 'Percentage',
        gstRate: product.gstRate !== undefined && product.gstRate !== null && product.gstRate !== '' && Number(product.gstRate) !== 0 ? String(product.gstRate) : '',
      });

      const initialBatch = stockAvailableBatches[0] || rawBatches[0] || null;
      if (initialBatch) {
        const bId = initialBatch._id || initialBatch.id || initialBatch.batchNumber || '';
        setSelectedBatchId(bId);

        const pPrice = initialBatch.purchaseRate ?? initialBatch.purchasePrice ?? product.defaultPurchaseRate;
        const sPrice = initialBatch.sellingPrice ?? product.defaultSellingPrice;
        const mrpVal = initialBatch.mrp ?? product.defaultMrp;
        const discVal = initialBatch.discount;
        const discTypeVal = initialBatch.discountType || 'Percentage';
        const gstVal = initialBatch.gstRate;

        setBatchFormData({
          purchasePrice: pPrice && Number(pPrice) !== 0 ? String(pPrice) : '',
          sellingPrice: sPrice && Number(sPrice) !== 0 ? String(sPrice) : '',
          mrp: mrpVal && Number(mrpVal) !== 0 ? String(mrpVal) : '',
          discount: discVal !== undefined && discVal !== null && discVal !== '' && Number(discVal) !== 0 ? String(discVal) : '',
          discountType: discTypeVal,
          gstRate: gstVal !== undefined && gstVal !== null && gstVal !== '' && Number(gstVal) !== 0 ? String(gstVal) : '',
          currentStock: Number(initialBatch.currentStock ?? initialBatch.quantityRemaining ?? product.currentStock ?? 0),
        });
      } else {
        setSelectedBatchId('');
        setBatchFormData({
          purchasePrice: product.defaultPurchaseRate && Number(product.defaultPurchaseRate) !== 0 ? String(product.defaultPurchaseRate) : '',
          sellingPrice: product.defaultSellingPrice && Number(product.defaultSellingPrice) !== 0 ? String(product.defaultSellingPrice) : '',
          mrp: product.defaultMrp && Number(product.defaultMrp) !== 0 ? String(product.defaultMrp) : '',
          discount: '',
          discountType: 'Percentage',
          gstRate: '',
          currentStock: Number(product.totalStock ?? product.currentStock ?? 0),
        });
      }
    }
  }, [product?._id, product?.id, isOpen]);

  // When user switches batch in dropdown
  const handleBatchSelect = (bId) => {
    setSelectedBatchId(bId);
    const target = rawBatches.find((b) => (b._id || b.id || b.batchNumber) === bId) || stockAvailableBatches[0] || null;
    if (target) {
      const pPrice = target.purchaseRate ?? target.purchasePrice ?? product.defaultPurchaseRate;
      const sPrice = target.sellingPrice ?? product.defaultSellingPrice;
      const mrpVal = target.mrp ?? product.defaultMrp;
      const discVal = target.discount;
      const discTypeVal = target.discountType || 'Percentage';
      const gstVal = target.gstRate;

      setBatchFormData({
        purchasePrice: pPrice && Number(pPrice) !== 0 ? String(pPrice) : '',
        sellingPrice: sPrice && Number(sPrice) !== 0 ? String(sPrice) : '',
        mrp: mrpVal && Number(mrpVal) !== 0 ? String(mrpVal) : '',
        discount: discVal !== undefined && discVal !== null && discVal !== '' && Number(discVal) !== 0 ? String(discVal) : '',
        discountType: discTypeVal,
        gstRate: gstVal !== undefined && gstVal !== null && gstVal !== '' && Number(gstVal) !== 0 ? String(gstVal) : '',
        currentStock: Number(target.currentStock ?? target.quantityRemaining ?? 0),
      });
    }
  };

  if (!isOpen || !product) return null;

  const handleProductChange = (field, val) => {
    const updated = { ...formData, [field]: val };
    setFormData(updated);
    if (onDraftChange) {
      onDraftChange(updated);
    }
  };

  const handleBatchChange = (field, val) => {
    setBatchFormData((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  const selectedBatchObj = rawBatches.find((b) => (b._id || b.id || b.batchNumber) === selectedBatchId) || stockAvailableBatches[0] || null;

  const toInputValue = (val) => (val === 0 || val === '0' || val === null || val === undefined ? '' : String(val));

  const cost = Number(batchFormData.purchasePrice) || 0;
  const sell = Number(batchFormData.sellingPrice) || 0;
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

        // Common product-level (basic) information
        name: formData.name,
        categoryId: formData.categoryId,
        brandId: formData.brandId,
        defaultUnitId: formData.unitId,
        description: formData.description,
        minimumStockAlert: !formData.lowStockAlert || formData.lowStockAlert === '0' ? 0 : Number(formData.lowStockAlert),
        hsnCode: formData.hsnCode,
        trackExpiry: formData.trackExpiry === 'Yes',
        notes: formData.notes,
        discount: formData.discount === '' || formData.discount === undefined || formData.discount === null ? 0 : Number(formData.discount),
        discountType: formData.discountType || 'Percentage',
        gstRate: formData.gstRate === '' || formData.gstRate === undefined || formData.gstRate === null ? 0 : Number(formData.gstRate),

        // Selected batch information
        selectedBatchId: selectedBatchObj?._id || selectedBatchObj?.id,
        selectedBatchNumber: selectedBatchObj?.batchNumber,
        purchasePrice: !batchFormData.purchasePrice || batchFormData.purchasePrice === '0' ? 0 : Number(batchFormData.purchasePrice),
        purchaseRate: !batchFormData.purchasePrice || batchFormData.purchasePrice === '0' ? 0 : Number(batchFormData.purchasePrice),
        sellingPrice: !batchFormData.sellingPrice || batchFormData.sellingPrice === '0' ? 0 : Number(batchFormData.sellingPrice),
        mrp: !batchFormData.mrp || batchFormData.mrp === '0' ? 0 : Number(batchFormData.mrp),
        batchDiscount: batchFormData.discount === '' || batchFormData.discount === undefined || batchFormData.discount === null ? 0 : Number(batchFormData.discount),
        batchDiscountType: batchFormData.discountType || 'Percentage',
        batchGstRate: batchFormData.gstRate === '' || batchFormData.gstRate === undefined || batchFormData.gstRate === null ? 0 : Number(batchFormData.gstRate),
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

      {/* Main Form Content */}
      <form onSubmit={handleSubmit} className="p-3 space-y-3 text-[11px] overflow-y-auto max-h-[calc(100vh-120px)] lg:max-h-none">

        {/* Section 1: Basic Information — Common for all batches */}
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
                onChange={(e) => handleProductChange('name', e.target.value)}
                placeholder="e.g. Pioneer"
                className="w-full px-2 h-7 bg-white border border-gray-300 rounded text-gray-900 font-medium text-[11px] focus:outline-none focus:border-[#047857] focus:ring-1 focus:ring-[#047857]"
              />
            </div>

            <div className="col-span-4 sm:col-span-2">
              <label className="font-medium text-gray-700 block text-[10px] mb-0.5">Category *</label>
              <div className="relative">
                <select
                  value={formData.categoryId}
                  onChange={(e) => handleProductChange('categoryId', e.target.value)}
                  className="w-full px-2 pr-6 h-7 bg-white border border-gray-300 rounded text-gray-800 text-[11px] appearance-none focus:outline-none focus:border-[#047857] focus:ring-1 focus:ring-[#047857]"
                >
                  {categories.map((c) => (
                    <option key={c._id || c.name} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              </div>
            </div>

            <div className="col-span-4 sm:col-span-2">
              <label className="font-medium text-gray-700 block text-[10px] mb-0.5">Product Brand</label>
              <div className="relative">
                <select
                  value={formData.brandId}
                  onChange={(e) => handleProductChange('brandId', e.target.value)}
                  className="w-full px-2 pr-6 h-7 bg-white border border-gray-300 rounded text-gray-800 text-[11px] appearance-none focus:outline-none focus:border-[#047857] focus:ring-1 focus:ring-[#047857] font-semibold"
                >
                  <option value="">-- Select Brand --</option>
                  {brands.map((b) => (
                    <option key={b._id || b.name} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              </div>
            </div>

            <div className="col-span-4 sm:col-span-2">
              <label className="font-medium text-gray-700 block text-[10px] mb-0.5">Unit *</label>
              <div className="relative">
                <select
                  value={formData.unitId}
                  onChange={(e) => handleProductChange('unitId', e.target.value)}
                  className="w-full px-2 pr-6 h-7 bg-white border border-gray-300 rounded text-gray-800 text-[11px] appearance-none focus:outline-none focus:border-[#047857] focus:ring-1 focus:ring-[#047857]"
                >
                  {units.map((u) => (
                    <option key={u._id || u.name} value={u._id}>
                      {u.name} ({u.shortName || 'Unit'})
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2 items-center pt-1 border-t border-gray-100">
            <div className="col-span-4">
              <label className="font-medium text-gray-700 block text-[10px] mb-0.5">Basic Discount</label>
              <input
                type="number"
                step="0.01"
                onFocus={(e) => e.target.select()}
                value={toInputValue(formData.discount)}
                onChange={(e) => handleProductChange('discount', e.target.value)}
                placeholder="0"
                className="w-full px-2 h-7 bg-white border border-gray-300 rounded text-gray-800 text-[11px] font-mono focus:outline-none focus:border-[#047857] focus:ring-1 focus:ring-[#047857]"
              />
            </div>

            <div className="col-span-4">
              <label className="font-medium text-gray-700 block text-[10px] mb-0.5">Discount Type</label>
              <div className="relative">
                <select
                  value={formData.discountType || 'Percentage'}
                  onChange={(e) => handleProductChange('discountType', e.target.value)}
                  className="w-full px-2 pr-6 h-7 bg-white border border-gray-300 rounded text-gray-800 text-[11px] appearance-none focus:outline-none focus:border-[#047857] focus:ring-1 focus:ring-[#047857]"
                >
                  <option value="Percentage">Percentage (%)</option>
                  <option value="Amount">Amount (₹)</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              </div>
            </div>

            <div className="col-span-4">
              <label className="font-medium text-gray-700 block text-[10px] mb-0.5">GST Rate (%)</label>
              <input
                type="number"
                step="0.01"
                onFocus={(e) => e.target.select()}
                value={toInputValue(formData.gstRate)}
                onChange={(e) => handleProductChange('gstRate', e.target.value)}
                placeholder="0"
                className="w-full px-2 h-7 bg-white border border-gray-300 rounded text-gray-800 text-[11px] font-mono focus:outline-none focus:border-[#047857] focus:ring-1 focus:ring-[#047857]"
              />
            </div>
          </div>

          <div>
            <label className="font-medium text-gray-700 block text-[10px] mb-0.5">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleProductChange('description', e.target.value)}
              placeholder="High quality product details..."
              className="w-full px-2 h-7 bg-white border border-gray-300 rounded text-gray-800 text-[11px] focus:outline-none focus:border-[#047857] focus:ring-1 focus:ring-[#047857]"
            />
          </div>
        </div>

        {/* Batch Selector Under Basic Information — Custom VEDIXA Dropdown Theme */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-2.5 space-y-1">
          <label className="font-bold text-[#047857] block text-[11px]">Select Batch</label>
          <div className="relative" ref={batchDropdownRef}>
            <button
              type="button"
              onClick={() => setIsBatchDropdownOpen((prev) => !prev)}
              className="w-full px-2.5 pr-8 h-8 bg-white border border-[#047857] rounded-md text-gray-900 font-bold text-[12px] flex items-center justify-between shadow-2xs hover:bg-emerald-50/40 focus:outline-none focus:ring-2 focus:ring-[#047857]/20 transition-all cursor-pointer"
            >
              <span className="truncate">
                {selectedBatchObj?.batchNumber
                  ? `${selectedBatchObj.batchNumber} (Stock: ${selectedBatchObj.currentStock ?? selectedBatchObj.quantityRemaining ?? selectedBatchObj.quantity ?? 0})`
                  : stockAvailableBatches.length === 0
                  ? '-- No Stock Available Batches --'
                  : 'Select Batch...'}
              </span>
              <ChevronDown className={`w-4 h-4 text-[#047857] shrink-0 transition-transform duration-200 ${isBatchDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Custom VEDIXA Themed Options Menu (NO browser native blue selection!) */}
            {isBatchDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#047857] rounded-lg shadow-xl z-50 overflow-hidden max-h-56 overflow-y-auto divide-y divide-gray-100 animate-in fade-in-50 duration-150">
                {stockAvailableBatches.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-400 font-medium text-center">
                    No Stock Available Batches
                  </div>
                ) : (
                  stockAvailableBatches.map((b) => {
                    const bKey = b._id || b.id || b.batchNumber;
                    const stockVal = b.currentStock ?? b.quantityRemaining ?? b.quantity ?? 0;
                    const isSelected = bKey === selectedBatchId;
                    return (
                      <div
                        key={bKey}
                        onClick={() => {
                          handleBatchSelect(bKey);
                          setIsBatchDropdownOpen(false);
                        }}
                        className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-emerald-100/90 text-[#047857] font-bold border-l-4 border-[#047857]'
                            : 'hover:bg-emerald-50/80 text-gray-900 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{b.batchNumber}</span>
                          <span className={`text-[11px] ${isSelected ? 'text-emerald-800' : 'text-gray-500'}`}>
                            (Stock: {stockVal})
                          </span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#047857] shrink-0" />}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Batch Information — Edit Selected Batch Only */}
        <div className="space-y-2 border border-gray-200 rounded-lg p-2.5 bg-gray-50/40">
          <div className="flex items-center justify-between border-b border-gray-200 pb-1">
            <span className="text-[#047857] font-bold text-[11px]">2. Batch Pricing & Details</span>
            {selectedBatchObj?.batchNumber && (
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-mono font-bold text-[11px] rounded border border-emerald-300">
                Batch Number: {selectedBatchObj.batchNumber}
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="font-medium text-gray-700 block text-[10px] mb-0.5">Purchase Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                onFocus={(e) => e.target.select()}
                value={toInputValue(batchFormData.purchasePrice)}
                onChange={(e) => handleBatchChange('purchasePrice', e.target.value)}
                placeholder="0.00"
                className="w-full px-2 h-7 bg-white border border-gray-300 rounded text-[11px] font-mono font-medium text-gray-900 focus:outline-none focus:border-[#047857] focus:ring-1 focus:ring-[#047857]"
              />
            </div>

            <div>
              <label className="font-medium text-gray-700 block text-[10px] mb-0.5">Selling Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                onFocus={(e) => e.target.select()}
                value={toInputValue(batchFormData.sellingPrice)}
                onChange={(e) => handleBatchChange('sellingPrice', e.target.value)}
                placeholder="0.00"
                className="w-full px-2 h-7 bg-white border border-gray-300 rounded text-[11px] font-mono font-medium text-gray-900 focus:outline-none focus:border-[#047857] focus:ring-1 focus:ring-[#047857]"
              />
            </div>

            <div>
              <label className="font-medium text-gray-700 block text-[10px] mb-0.5">MRP (₹)</label>
              <input
                type="number"
                step="0.01"
                onFocus={(e) => e.target.select()}
                value={toInputValue(batchFormData.mrp)}
                onChange={(e) => handleBatchChange('mrp', e.target.value)}
                placeholder="0"
                className="w-full px-2 h-7 bg-white border border-gray-300 rounded text-[11px] font-mono text-gray-800 focus:outline-none focus:border-[#047857] focus:ring-1 focus:ring-[#047857]"
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

          <div className="grid grid-cols-4 gap-2 pt-1 border-t border-gray-100 items-center">
            <div>
              <label className="font-medium text-gray-700 block text-[10px] mb-0.5">Discount</label>
              <input
                type="number"
                step="0.01"
                onFocus={(e) => e.target.select()}
                value={toInputValue(batchFormData.discount)}
                onChange={(e) => handleBatchChange('discount', e.target.value)}
                placeholder={formData.discount || '0'}
                className="w-full px-2 h-7 bg-white border border-gray-300 rounded text-[11px] font-mono text-gray-800 focus:outline-none focus:border-[#047857] focus:ring-1 focus:ring-[#047857]"
              />
            </div>

            <div>
              <label className="font-medium text-gray-700 block text-[10px] mb-0.5">Discount Type</label>
              <div className="relative">
                <select
                  value={batchFormData.discountType || 'Percentage'}
                  onChange={(e) => handleBatchChange('discountType', e.target.value)}
                  className="w-full px-2 pr-6 h-7 bg-white border border-gray-300 rounded text-gray-800 text-[11px] appearance-none focus:outline-none focus:border-[#047857] focus:ring-1 focus:ring-[#047857]"
                >
                  <option value="Percentage">Percentage (%)</option>
                  <option value="Amount">Amount (₹)</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="font-medium text-gray-700 block text-[10px] mb-0.5">GST Rate (%)</label>
              <input
                type="number"
                step="0.01"
                onFocus={(e) => e.target.select()}
                value={toInputValue(batchFormData.gstRate)}
                onChange={(e) => handleBatchChange('gstRate', e.target.value)}
                placeholder={formData.gstRate || '0'}
                className="w-full px-2 h-7 bg-white border border-gray-300 rounded text-[11px] font-mono text-gray-800 focus:outline-none focus:border-[#047857] focus:ring-1 focus:ring-[#047857]"
              />
            </div>

            <div>
              <label className="font-medium text-gray-700 block text-[10px] mb-0.5">Remaining Stock</label>
              <input
                type="text"
                readOnly
                disabled
                value={batchFormData.currentStock}
                className="w-full px-2 h-7 bg-gray-100 border border-gray-300 rounded text-[11px] font-mono font-bold text-gray-700 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Inventory Threshold Alert */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-1">
            <span className="text-[#047857] font-bold text-[11px]">3. Inventory Threshold Alert</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-medium text-gray-700 block text-[10px] mb-0.5">Low Stock Alert *</label>
              <input
                type="number"
                onFocus={(e) => e.target.select()}
                value={toInputValue(formData.lowStockAlert)}
                onChange={(e) => handleProductChange('lowStockAlert', e.target.value)}
                placeholder="10"
                className="w-full px-2 h-7 bg-white border border-gray-300 rounded text-[11px] font-mono font-medium text-gray-900 focus:outline-none focus:border-[#047857] focus:ring-1 focus:ring-[#047857]"
              />
            </div>

            <div>
              <label className="font-medium text-gray-700 block text-[10px] mb-0.5">Track Expiry</label>
              <div className="relative">
                <select
                  value={formData.trackExpiry}
                  onChange={(e) => handleProductChange('trackExpiry', e.target.value)}
                  className="w-full px-2 pr-6 h-7 bg-white border border-gray-300 rounded text-[11px] text-gray-800 appearance-none focus:outline-none focus:border-[#047857] focus:ring-1 focus:ring-[#047857]"
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

      </form>

      {/* Footer Bar */}
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
