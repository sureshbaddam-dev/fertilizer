import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Check, Search } from 'lucide-react';
import ProductAvatar from '../ui/ProductAvatar';

export default function DamageStockModal({ isOpen, onClose, products = [], onSaveDamage }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [damagedQty, setDamagedQty] = useState('');
  const [reason, setReason] = useState('Bag torn during unloading');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedProduct(null);
      setIsDropdownOpen(false);
      setDamagedQty('');
      setReason('Bag torn during unloading');
      setNotes('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter products for autocomplete dropdown
  const searchResults = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = (p.name || '').toLowerCase().includes(q);
    const brandMatch = (p.brandId?.name || p.company || '').toLowerCase().includes(q);
    return nameMatch || brandMatch;
  });

  const currentStock = selectedProduct ? Number(selectedProduct.totalStock ?? selectedProduct.currentStock ?? 0) : 0;
  const purchasePrice = selectedProduct ? Number(selectedProduct.defaultPurchaseRate ?? selectedProduct.purchasePrice ?? 0) : 0;
  const unitName = selectedProduct ? (selectedProduct.defaultUnitId?.shortName || selectedProduct.unit || 'Bag') : 'Unit';

  const numericQty = Number(damagedQty) || 0;
  const damageValue = numericQty * purchasePrice;

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setSearchQuery(product.name);
    setIsDropdownOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedProduct) {
      alert('Please select a product first');
      return;
    }
    if (numericQty <= 0) {
      alert('Please enter a valid damaged quantity greater than 0');
      return;
    }
    if (numericQty > currentStock) {
      alert(`Damaged quantity cannot exceed current available stock (${currentStock} ${unitName})`);
      return;
    }

    const damageRecord = {
      productId: selectedProduct._id || selectedProduct.id,
      productName: selectedProduct.name,
      company: selectedProduct.brandId?.name || selectedProduct.company || 'Coromandel',
      unit: unitName,
      quantity: numericQty,
      purchasePrice,
      damageValue,
      reason,
      notes,
      date: new Date().toISOString().slice(0, 10),
    };

    if (onSaveDamage) {
      onSaveDamage(damageRecord);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 font-sans text-xs"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 p-4 sm:p-5 space-y-4 z-50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2 font-extrabold text-gray-900 text-sm">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span>Record Damaged Stock</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Autocomplete Product Search Box */}
          <div className="space-y-1 relative">
            <label className="text-[11px] font-bold text-gray-700 block">Select Product *</label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                  if (!e.target.value.trim()) setSelectedProduct(null);
                }}
                placeholder="Type product name to search..."
                className="w-full h-9 pl-9 pr-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Autocomplete Suggestions Dropdown */}
            {isDropdownOpen && searchResults.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
                {searchResults.map((p) => (
                  <div
                    key={p._id || p.id}
                    onClick={() => handleSelectProduct(p)}
                    className="p-2 hover:bg-emerald-50/70 cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ProductAvatar src={p.image} name={p.name} size={28} />
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-xs truncate">{p.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{p.brandId?.name || p.company}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-[#047857] shrink-0">
                      Stock: {p.totalStock ?? p.currentStock ?? 100} {p.defaultUnitId?.shortName || p.unit || 'Bag'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Auto-loaded Info Box */}
          {selectedProduct && (
            <div className="p-3 bg-gray-50 border border-gray-200/80 rounded-xl grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-gray-400 font-medium block">Current Available Stock</span>
                <span className="font-mono font-bold text-gray-900 text-sm">{currentStock} {unitName}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-medium block">Purchase Price</span>
                <span className="font-mono font-bold text-gray-900 text-sm">₹ {purchasePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}

          {/* Damaged Quantity & Reason */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-700 block">Damaged Quantity ({unitName}) *</label>
              <input
                type="number"
                required
                min="1"
                max={currentStock || 9999}
                value={damagedQty}
                onChange={(e) => setDamagedQty(e.target.value)}
                placeholder="e.g. 5"
                className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-gray-900 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-700 block">Reason for Damage *</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-9 px-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              >
                <option value="Bag torn during unloading">Bag torn during unloading</option>
                <option value="Rain moisture damage">Rain moisture damage</option>
                <option value="Chemical leakage / spoilage">Chemical leakage / spoilage</option>
                <option value="Expired stock write-off">Expired stock write-off</option>
                <option value="Government sample collection">Government sample collection</option>
              </select>
            </div>
          </div>

          {/* Automatic Damage Value Calculation Box */}
          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-tight block">Calculated Damage Loss</span>
              <span className="text-[10px] text-amber-700 font-medium">Purchase Price × Damaged Qty</span>
            </div>
            <span className="font-mono font-extrabold text-amber-900 text-sm">
              ₹ {damageValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-700 block">Additional Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Verified by Godown Supervisor"
              className="w-full h-8 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#047857]"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold cursor-pointer transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Confirm & Write-Off Stock</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
