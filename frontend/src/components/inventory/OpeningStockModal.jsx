import React, { useState, useEffect } from 'react';
import { Package, X, Check, Search, AlertCircle, ShieldCheck, Plus } from 'lucide-react';
import ProductAvatar from '../ui/ProductAvatar';
import QuickAddProductDrawer from '../purchases/QuickAddProductDrawer';
import { productService } from '../../services/productService';
import { useAuth } from '../../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '../../contexts/ToastContext';

export default function OpeningStockModal({
  isOpen,
  onClose,
  products = [],
  initialData = null,
  onSaveSuccess,
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const isEditMode = Boolean(initialData && initialData._id);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAddProductDrawerOpen, setIsAddProductDrawerOpen] = useState(false);
  const [localCreatedProducts, setLocalCreatedProducts] = useState([]);

  // Form Fields
  const [batchNumber, setBatchNumber] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchaseRate, setPurchaseRate] = useState('');
  const [mrp, setMrp] = useState('');
  const [saleRate, setSaleRate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [manufacturingDate, setManufacturingDate] = useState('');
  const [openingDate, setOpeningDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('Main Godown');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Consumed units in edit mode
  const consumedQty = isEditMode
    ? Math.max(0, (Number(initialData?.initialQuantity || initialData?.quantity || 0) - Number(initialData?.currentStock ?? 0)))
    : 0;

  const prevIsOpenRef = React.useRef(false);
  const prevInitialDataIdRef = React.useRef(initialData?._id);

  useEffect(() => {
    const isJustOpened = isOpen && !prevIsOpenRef.current;
    const isInitialDataChanged = initialData?._id !== prevInitialDataIdRef.current;
    prevIsOpenRef.current = isOpen;
    prevInitialDataIdRef.current = initialData?._id;

    if (isJustOpened || isInitialDataChanged) {
      if (initialData) {
        // Populate edit mode
        const prod = initialData.productId && typeof initialData.productId === 'object'
          ? initialData.productId
          : products.find((p) => (p._id || p.id) === initialData.productId) || {
              _id: initialData.productId,
              name: initialData.productName || 'Product',
            };

        setSelectedProduct(prod);
        setSearchQuery(prod.name || '');
        setBatchNumber(initialData.batchNumber || '');
        setQuantity(String(initialData.initialQuantity ?? initialData.quantity ?? initialData.currentStock ?? ''));
        setPurchaseRate(String(initialData.purchaseRate ?? initialData.costPrice ?? ''));
        setMrp(initialData.mrp ? String(initialData.mrp) : '');
        setSaleRate(initialData.saleRate || initialData.sellingPrice ? String(initialData.saleRate || initialData.sellingPrice) : '');
        setExpiryDate(initialData.expiryDate ? new Date(initialData.expiryDate).toISOString().split('T')[0] : '');
        setManufacturingDate(initialData.manufacturingDate ? new Date(initialData.manufacturingDate).toISOString().split('T')[0] : '');
        setOpeningDate(initialData.openingDate ? new Date(initialData.openingDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        setLocation(initialData.location || 'Main Godown');
        setNotes(initialData.notes || '');
      } else if (isJustOpened) {
        // Reset form for fresh entry
        setSearchQuery('');
        setSelectedProduct(null);
        setIsDropdownOpen(false);
        setLocalCreatedProducts([]);
        const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randStr = Math.floor(1000 + Math.random() * 9000);
        setBatchNumber(`OPN-${todayStr}-${randStr}`);
        setQuantity('');
        setPurchaseRate('');
        setMrp('');
        setSaleRate('');
        setExpiryDate('');
        setManufacturingDate('');
        setOpeningDate(new Date().toISOString().split('T')[0]);
        setLocation('Main Godown');
        setNotes('');
        setErrorMessage('');
      }
    }
  }, [isOpen, initialData]);

  // Handle ESC key safely (close child drawer first if open, or parent modal)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isAddProductDrawerOpen) {
          e.stopPropagation();
          setIsAddProductDrawerOpen(false);
        } else if (isOpen) {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, isAddProductDrawerOpen, onClose]);

  // Combine parent products with any locally created products for zero-latency dropdown availability
  const combinedProducts = React.useMemo(() => {
    const list = [...localCreatedProducts, ...products];
    const map = new Map();
    list.forEach((p) => {
      const id = p._id || p.id;
      if (id && !map.has(id)) {
        map.set(id, p);
      }
    });
    return Array.from(map.values());
  }, [localCreatedProducts, products]);

  if (!isOpen) return null;

  // Filter products for autocomplete dropdown
  const searchResults = combinedProducts.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = (p.name || '').toLowerCase().includes(q);
    const brandMatch = (p.brandId?.name || p.company || '').toLowerCase().includes(q);
    const skuMatch = (p.sku || p.barcode || '').toLowerCase().includes(q);
    return nameMatch || brandMatch || skuMatch;
  });

  const unitName = selectedProduct
    ? (selectedProduct.defaultUnitId?.shortName || selectedProduct.unit || 'Bag')
    : 'Unit';

  const numQty = Number(quantity) || 0;
  const numCost = Number(purchaseRate) || 0;
  const numSale = Number(saleRate) || 0;
  const totalValuation = numQty * numCost;
  const totalSaleValue = numQty * numSale;
  const projectedMargin = totalSaleValue > 0 ? ((totalSaleValue - totalValuation) / totalSaleValue) * 100 : 0;

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setSearchQuery(product.name);
    setIsDropdownOpen(false);
    setErrorMessage('');

    // Pre-populate default prices from product if available
    if (!purchaseRate) {
      const defaultCost = product.defaultPurchaseRate ?? product.purchaseRate ?? product.purchasePrice ?? '';
      if (defaultCost) setPurchaseRate(String(defaultCost));
    }
    if (!mrp) {
      const defaultMrp = product.mrp ?? '';
      if (defaultMrp) setMrp(String(defaultMrp));
    }
    if (!saleRate) {
      const defaultSelling = product.defaultSaleRate ?? product.sellingPrice ?? product.saleRate ?? '';
      if (defaultSelling) setSaleRate(String(defaultSelling));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedProduct) {
      setErrorMessage('Please select a product.');
      return;
    }

    if (!batchNumber.trim()) {
      setErrorMessage('Please enter a batch number.');
      return;
    }

    if (numQty <= 0) {
      setErrorMessage('Please enter a valid opening quantity greater than 0.');
      return;
    }

    if (numCost < 0) {
      setErrorMessage('Cost / Purchase Rate cannot be negative.');
      return;
    }

    if (isEditMode && numQty < consumedQty) {
      setErrorMessage(`Cannot reduce quantity to ${numQty} ${unitName}. At least ${consumedQty} ${unitName} have already been sold.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        productId: selectedProduct._id || selectedProduct.id,
        batchNumber: batchNumber.trim().toUpperCase(),
        quantity: numQty,
        purchaseRate: numCost,
        mrp: Number(mrp) || numCost,
        saleRate: Number(saleRate) || Number(mrp) || numCost,
        expiryDate: expiryDate || null,
        manufacturingDate: manufacturingDate || null,
        openingDate: openingDate || new Date().toISOString(),
        location: location.trim(),
        notes: notes.trim(),
      };

      let res;
      if (isEditMode) {
        res = await productService.updateOpeningStock(initialData._id, payload);
        toast.success('Opening stock updated successfully');
      } else {
        res = await productService.addOpeningStock(payload);
        toast.success(`Opening stock added: ${numQty} ${unitName} for ${selectedProduct.name}`);
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries(['products-inventory']);
      queryClient.invalidateQueries(['products']);
      queryClient.invalidateQueries(['stock-adjustments']);
      queryClient.invalidateQueries(['opening-stocks']);
      queryClient.invalidateQueries(['dashboard-summary']);
      queryClient.invalidateQueries(['reports-bi']);

      if (onSaveSuccess) {
        onSaveSuccess(res?.data?.data || res?.data);
      }
      onClose();
    } catch (err) {
      console.error('Error saving opening stock:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to save opening stock';
      setErrorMessage(msg);
      toast.error('Failed to save opening stock', { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 font-sans text-xs"
        onClick={onClose}
      >
      <div
        className="relative bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 p-4 sm:p-6 space-y-4 z-50 my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5 font-extrabold text-gray-900 text-sm sm:text-base">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
              <Package className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#047857]" />
            </div>
            <div>
              <span>{isEditMode ? 'Edit Opening Stock' : 'Add Opening Stock'}</span>
              <p className="text-[11px] font-normal text-gray-400">Initialize pre-existing inventory without creating supplier payables</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Informational Banner */}
        <div className="p-2.5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl flex items-start gap-2 text-[11px] text-emerald-900">
          <ShieldCheck className="w-4 h-4 text-[#047857] shrink-0 mt-0.5" />
          <span className="leading-tight">
            <strong>Clean Accounting:</strong> Opening stock directly populates your physical inventory & FIFO queue with correct historical valuation. It does <em>not</em> create supplier debt or current-period purchase entries.
          </span>
        </div>

        {/* Consumed stock warning in edit mode */}
        {isEditMode && consumedQty > 0 && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-[11px] text-amber-900 font-medium">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Partial Sale Active:</strong> {consumedQty} {unitName} from this batch have already been sold. You can only modify price/batch info or increase quantity, but cannot reduce quantity below {consumedQty} {unitName}.
            </span>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Product Search & Selection */}
          <div className="space-y-1 relative">
            <label className="text-[11px] font-bold text-gray-700 block">Select Product *</label>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  disabled={isEditMode}
                  value={searchQuery}
                  onFocus={() => !isEditMode && setIsDropdownOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                    if (!e.target.value.trim()) setSelectedProduct(null);
                  }}
                  placeholder="Search product by name, brand, or SKU..."
                  className={`w-full h-9 pl-9 pr-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-emerald-500/20 ${
                    isEditMode ? 'bg-gray-100 cursor-not-allowed opacity-80' : ''
                  }`}
                />
              </div>

              {!isEditMode && (
                <button
                  type="button"
                  onClick={() => setIsAddProductDrawerOpen(true)}
                  className="h-9 px-3 bg-emerald-50 hover:bg-emerald-100 text-[#047857] border border-emerald-200 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 shadow-2xs"
                  title="Create a new product"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Product</span>
                </button>
              )}
            </div>

            {/* Dropdown Suggestions */}
            {isDropdownOpen && !isEditMode && searchResults.length > 0 && (
              <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-52 overflow-y-auto divide-y divide-gray-100">
                {searchResults.map((p) => (
                  <div
                    key={p._id || p.id}
                    onClick={() => handleSelectProduct(p)}
                    className="p-2.5 hover:bg-emerald-50/70 cursor-pointer flex items-center justify-between gap-2 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ProductAvatar src={p.image} name={p.name} size={28} />
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-xs truncate">{p.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{p.brandId?.name || p.company || 'Standard'}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-[#047857] shrink-0 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Stock: {p.totalStock ?? p.currentStock ?? 0} {p.defaultUnitId?.shortName || p.unit || 'Bag'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product details preview card */}
          {selectedProduct && (
            <div className="p-2.5 bg-gray-50 border border-gray-200/80 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <ProductAvatar src={selectedProduct.image} name={selectedProduct.name} size={30} />
                <div className="min-w-0">
                  <span className="font-bold text-gray-900 truncate block">{selectedProduct.name}</span>
                  <span className="text-[10px] text-gray-400 font-medium">Unit: {unitName}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-400 font-medium block">Current Live Stock</span>
                <span className="font-mono font-bold text-gray-900 text-xs">
                  {selectedProduct.totalStock ?? selectedProduct.currentStock ?? 0} {unitName}
                </span>
              </div>
            </div>
          )}

          {/* Batch Number & Opening Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-700 block">Batch Number *</label>
              <input
                type="text"
                required
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="e.g. OPN-2026-001"
                className="w-full h-9 px-3 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-emerald-500/20 uppercase"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-700 block">Opening Stock Date *</label>
              <input
                type="date"
                required
                value={openingDate}
                onChange={(e) => setOpeningDate(e.target.value)}
                className="w-full h-9 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Quantity & Purchase Cost Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-700 block">
                Opening Quantity ({unitName}) *
              </label>
              <input
                type="number"
                required
                min={isEditMode ? Math.max(1, consumedQty) : "0.01"}
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="w-full h-9 px-3 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-700 block">
                Cost Rate / {unitName} (₹) *
              </label>
              <div className="relative">
                <span className="text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 font-bold">₹</span>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={purchaseRate}
                  onChange={(e) => setPurchaseRate(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-9 pl-7 pr-3 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          </div>

          {/* MRP & Selling Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-700 block">MRP / {unitName} (₹)</label>
              <div className="relative">
                <span className="text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 font-bold">₹</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-9 pl-7 pr-3 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-700 block">Selling Price / {unitName} (₹)</label>
              <div className="relative">
                <span className="text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 font-bold">₹</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={saleRate}
                  onChange={(e) => setSaleRate(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-9 pl-7 pr-3 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          </div>

          {/* Dates & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-700 block">Mfg Date</label>
              <input
                type="date"
                value={manufacturingDate}
                onChange={(e) => setManufacturingDate(e.target.value)}
                className="w-full h-9 px-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#047857]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-700 block">Expiry Date</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full h-9 px-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#047857]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-700 block">Godown / Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Main Godown"
                className="w-full h-9 px-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#047857]"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-700 block">Notes / Reason (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Stock verified during physical count before software onboarding"
              className="w-full h-9 px-3 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#047857]"
            />
          </div>

          {/* Live Valuation Summary Card */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-gray-500 font-medium block">Total Opening Valuation</span>
              <span className="font-mono font-bold text-emerald-700 text-sm">
                ₹ {totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 font-medium block">Total Retail Value</span>
              <span className="font-mono font-bold text-gray-900 text-sm">
                ₹ {totalSaleValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[10px] text-gray-500 font-medium block">Est. Gross Margin</span>
              <span className={`font-mono font-bold text-xs ${projectedMargin >= 0 ? 'text-[#047857]' : 'text-rose-600'}`}>
                {projectedMargin.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedProduct || numQty <= 0}
              className="px-5 py-2 text-xs font-bold text-white bg-[#047857] hover:bg-[#065f46] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{isEditMode ? 'Update Opening Stock' : 'Confirm & Add Stock'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      </div>

      {/* Quick Add Product Drawer (Reused standard product master creation drawer) */}
      <QuickAddProductDrawer
        isOpen={isAddProductDrawerOpen}
        initialName={searchQuery}
        onClose={() => setIsAddProductDrawerOpen(false)}
        onSuccess={(newProduct) => {
          setIsAddProductDrawerOpen(false);
          if (newProduct) {
            const rawProd = newProduct?.data?.product || newProduct?.data || newProduct?.product || newProduct;
            setLocalCreatedProducts((prev) => [rawProd, ...prev]);
            handleSelectProduct(rawProd);
          }
        }}
      />
    </>
  );
}
