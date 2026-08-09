import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  Save,
  X,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  FileText,
  User,
  Phone,
  MapPin,
  CreditCard,
} from 'lucide-react';
import { invoiceService } from '../../services/invoiceService';
import { productService } from '../../services/productService';
import { getItemUnitPrice } from '../../utils/pricing';

export default function EditInvoicePage() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [items, setItems] = useState([]);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch Existing Invoice Data
  const { data: invoiceApiData, isLoading, isError } = useQuery({
    queryKey: ['sales-invoice-details', invoiceId],
    queryFn: () => invoiceService.getInvoiceById(invoiceId),
    enabled: Boolean(invoiceId),
    staleTime: 0,
  });

  const invoice = useMemo(() => {
    return invoiceApiData?.data?.data || invoiceApiData?.data || invoiceApiData || null;
  }, [invoiceApiData]);

  // Populate Form Fields from Invoice
  useEffect(() => {
    if (invoice) {
      setCustomerName(invoice.customerName || invoice.customer?.name || '');
      setCustomerMobile(invoice.customerMobile || invoice.customer?.mobile || '');
      setCustomerAddress(invoice.customerAddress || invoice.customer?.village || '');
      setPaymentMode(invoice.paymentMode || 'Cash');
      setPaidAmount(String(invoice.paidAmount !== undefined ? invoice.paidAmount : invoice.totalAmount || 0));
      setNotes(invoice.notes || '');
      setDiscountAmount(String(invoice.discountAmount || 0));

      const rawItems = Array.isArray(invoice.items) ? invoice.items : [];
      setItems(
        rawItems.map((it, idx) => {
          const price = getItemUnitPrice(it);
          const qty = Number(it.quantity || it.qty || 1);
          const total = Number(it.totalAmount !== undefined && it.totalAmount !== null ? it.totalAmount : (qty * price));
          return {
            id: it._id || `item-${idx}`,
            productId: it.productId || it.product || it.id,
            productName: it.productName || it.name || 'Agri Product',
            quantity: qty,
            unit: it.unit || 'Bag',
            unitPrice: price,
            discountAmount: Number(it.discountAmount || 0),
            gstRate: Number(it.gstRate || 5),
            totalAmount: total,
          };
        })
      );
    }
  }, [invoice]);

  // Fetch All Products once for ultra-fast local search
  const { data: allProductsApi } = useQuery({
    queryKey: ['all-products-for-edit-invoice'],
    queryFn: () => productService.getProducts({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });

  const allProducts = useMemo(() => {
    return allProductsApi?.data?.data?.products || allProductsApi?.data?.products || allProductsApi?.data || [];
  }, [allProductsApi]);

  // Product Auto-complete Search & Keyboard Navigation
  const [prodSearch, setProdSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(prodSearch);
      setSelectedIndex(0);
    }, 200);
    return () => clearTimeout(timer);
  }, [prodSearch]);

  const searchResults = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return [];
    return allProducts.filter((p) => {
      const name = (p.name || p.productName || '').toLowerCase();
      const brand = (p.brand || p.company || p.manufacturer || '').toLowerCase();
      const barcode = (p.barcode || p.sku || p.code || '').toLowerCase();
      const category = (p.category || '').toLowerCase();
      return name.includes(q) || brand.includes(q) || barcode.includes(q) || category.includes(q);
    }).slice(0, 15);
  }, [allProducts, debouncedSearch]);

  // Add Item to Bill with Auto-filled Details
  const handleAddItem = (prod) => {
    if (!prod) return;
    const price = getItemUnitPrice(prod);
    const qty = 1;
    const total = qty * price;
    setItems((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}-${prev.length}`,
        productId: prod._id || prod.id,
        productName: prod.name || prod.productName || 'Agri Product',
        quantity: qty,
        unit: prod.unit || 'Bag',
        unitPrice: price,
        discountAmount: Number(prod.discountAmount || 0),
        gstRate: Number(prod.gstRate || 5),
        hsnCode: prod.hsnCode || '',
        totalAmount: total,
      },
    ]);
    setProdSearch('');
    setIsDropdownOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!searchResults.length || !isDropdownOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults[selectedIndex]) {
        handleAddItem(searchResults[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  const handleRemoveItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      const target = { ...next[idx] };

      if (field === 'quantity') {
        target.quantity = Math.max(1, Number(value) || 1);
      } else if (field === 'unitPrice' || field === 'sellingPrice') {
        target.unitPrice = Math.max(0, Number(value) || 0);
      } else if (field === 'productName') {
        target.productName = value;
      }

      target.totalAmount = target.quantity * target.unitPrice;
      next[idx] = target;
      return next;
    });
  };

  // Calculations
  const subtotal = useMemo(() => items.reduce((acc, it) => acc + Number(it.totalAmount || 0), 0), [items]);
  const discVal = Math.max(0, Number(discountAmount) || 0);
  const grandTotal = Math.max(0, subtotal - discVal);
  const paidVal = Math.max(0, Number(paidAmount) || 0);
  const dueVal = Math.max(0, grandTotal - paidVal);

  // Update Invoice Mutation
  const updateMutation = useMutation({
    mutationFn: (payload) => invoiceService.updateInvoice(invoiceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['sales-invoice-details', invoiceId]);
      queryClient.invalidateQueries(['sales-invoices']);
      queryClient.invalidateQueries(['customer-ledger-profile']);
      queryClient.invalidateQueries(['dashboard-stats']);

      setSuccessMsg('Bill updated successfully!');
      setTimeout(() => {
        // Return to the SAME Invoice Details page
        navigate(`/invoices/${invoiceId}`, { replace: true });
      }, 500);
    },
    onError: (err) => {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to update invoice');
    },
  });

  const handleSave = (e) => {
    e.preventDefault();
    if (items.length === 0) {
      setErrorMsg('Invoice must contain at least one product item');
      return;
    }
    setErrorMsg('');

    const formattedItems = items.map((it) => ({
      productId: it.productId,
      productName: it.productName,
      quantity: Number(it.quantity || 1),
      unitPrice: Number(it.unitPrice !== undefined && it.unitPrice !== null ? it.unitPrice : 0),
      discountAmount: Number(it.discountAmount || 0),
      gstRate: Number(it.gstRate || 5),
      totalAmount: Number(it.totalAmount),
    }));

    const payload = {
      customerName: customerName.trim() || 'Valued Customer',
      customerMobile: customerMobile.trim(),
      customerAddress: customerAddress.trim(),
      items: formattedItems,
      subtotal,
      discountAmount: discVal,
      totalAmount: grandTotal,
      paidAmount: paidVal,
      dueAmount: dueVal,
      paymentMode,
      notes: notes.trim(),
    };

    console.log('[EditInvoicePage] PUT Payload:', payload);

    updateMutation.mutate(payload);
  };

  const handleCancel = () => {
    // Return to the SAME Invoice Details page
    navigate(`/invoices/${invoiceId}`);
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs font-mono text-gray-500">
        Loading Invoice #{invoiceId} details...
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-3 bg-white border border-gray-200 rounded-2xl my-8">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h2 className="text-sm font-bold text-gray-900">Invoice Not Found</h2>
        <p className="text-xs text-gray-500">Could not retrieve invoice #{invoiceId}</p>
        <button
          onClick={() => navigate('/invoices')}
          className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold"
        >
          Back to Invoices
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-16 font-sans text-xs">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer transition-all"
            title="Return to Invoice Details"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-extrabold text-gray-900">
              Edit Tax Invoice #{invoice.invoiceNumber || invoiceId}
            </h1>
            <p className="text-[11px] text-gray-500 font-mono">
              Billed Date: {new Date(invoice.date || invoice.createdAt).toLocaleDateString('en-IN')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded-xl cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="px-5 py-2 bg-[#047857] hover:bg-[#036448] text-white font-extrabold rounded-xl shadow-2xs flex items-center gap-2 cursor-pointer transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{updateMutation.isPending ? 'Saving...' : 'Save Bill'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Customer Info Form */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
        <h2 className="font-extrabold text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <User className="w-4 h-4 text-[#047857]" />
          <span>Customer Information</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">Customer Name</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              placeholder="Customer Name"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">Phone Number</label>
            <input
              type="text"
              value={customerMobile}
              onChange={(e) => setCustomerMobile(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl font-mono text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              placeholder="10-digit Mobile"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">Village / Address</label>
            <input
              type="text"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              placeholder="Village Name"
            />
          </div>
        </div>
      </div>

      {/* Product Items Table */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-[#047857]" />
            <span>Billed Products ({items.length})</span>
          </h2>

          <div className="relative w-80">
            <input
              type="text"
              value={prodSearch}
              onFocus={() => setIsDropdownOpen(true)}
              onChange={(e) => {
                setProdSearch(e.target.value);
                setIsDropdownOpen(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search by name, brand, barcode, category..."
              className="w-full px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
            {isDropdownOpen && searchResults.length > 0 && prodSearch.trim() && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-2xl z-30 max-h-72 overflow-y-auto divide-y divide-gray-100 border-t-2 border-t-[#047857]">
                {searchResults.map((p, idx) => {
                  const price = getItemUnitPrice(p);
                  const stock = p.stock !== undefined ? p.stock : (p.quantity !== undefined ? p.quantity : (p.stockQuantity !== undefined ? p.stockQuantity : 'N/A'));
                  const unit = p.unit || 'Bag';
                  const brand = p.brand || p.company || p.manufacturer || p.category || '';
                  const isSelected = idx === selectedIndex;

                  return (
                    <button
                      key={p._id || idx}
                      type="button"
                      onClick={() => handleAddItem(p)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full text-left p-2.5 flex justify-between items-center cursor-pointer transition-colors ${
                        isSelected ? 'bg-emerald-50 text-emerald-950 border-l-4 border-[#047857]' : 'hover:bg-gray-50 text-gray-900'
                      }`}
                    >
                      <div className="space-y-0.5 max-w-[70%]">
                        <div className="font-extrabold text-xs text-gray-900 leading-tight">
                          <HighlightText text={p.name || p.productName} query={debouncedSearch} />
                        </div>
                        <div className="flex items-center gap-2 text-[10.5px] text-gray-500 font-medium">
                          {brand && (
                            <span className="font-semibold text-gray-700">
                              <HighlightText text={brand} query={debouncedSearch} />
                            </span>
                          )}
                          <span className={`px-1.5 py-0.2 rounded-md font-mono text-[9.5px] font-bold ${
                            Number(stock) > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                          }`}>
                            Stock: {stock} {unit}
                          </span>
                        </div>
                      </div>

                      <div className="text-right space-y-0.5 font-mono">
                        <div className="text-xs font-black text-[#047857]">
                          ₹{price.toLocaleString('en-IN')} <span className="text-[10px] text-gray-500 font-normal">/ {unit}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="w-full">
          {/* DESKTOP TABLE */}
          <div className="hidden md:block border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-100 font-bold text-gray-700 uppercase border-b border-gray-200 text-[10px]">
                <tr>
                  <th className="p-2.5">Product</th>
                  <th className="p-2.5 text-center w-24">Qty</th>
                  <th className="p-2.5 text-right w-32">Price (₹)</th>
                  <th className="p-2.5 text-right w-32">Total (₹)</th>
                  <th className="p-2.5 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((it, idx) => (
                  <tr key={it.id || idx} className="hover:bg-gray-50/50">
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={it.productName}
                        onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                        className="w-full bg-transparent font-bold text-gray-900 border-b border-transparent focus:border-emerald-500 focus:outline-hidden"
                      />
                    </td>
                    <td className="p-2.5 text-center">
                      <input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-16 text-center font-bold px-1.5 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </td>
                    <td className="p-2.5 text-right">
                      <input
                        type="number"
                        min="0"
                        value={it.unitPrice}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                        className="w-24 text-right font-mono font-bold px-1.5 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </td>
                    <td className="p-2.5 text-right font-mono font-extrabold text-emerald-900">
                      ₹ {Number(it.totalAmount).toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 rounded-lg text-red-500 hover:bg-red-50 cursor-pointer"
                        title="Remove Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS */}
          <div className="block md:hidden space-y-3 p-3">
            {items.map((it, idx) => (
              <div key={it.id || idx} className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-2xs space-y-3 font-sans text-xs">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2 gap-2">
                  <input
                    type="text"
                    value={it.productName}
                    onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                    className="w-full bg-transparent font-extrabold text-gray-900 text-xs border-b border-gray-200 focus:border-emerald-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 cursor-pointer shrink-0"
                    title="Remove Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider mb-1">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={it.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider mb-1">Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={it.unitPrice}
                      onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                      className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between font-mono">
                  <span className="text-[10px] text-gray-400 font-bold uppercase font-sans">Line Total</span>
                  <span className="text-xs font-black text-[#047857]">
                    ₹ {Number(it.totalAmount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bill Summary & Payment Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Payment Details */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
          <h2 className="font-extrabold text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-[#047857]" />
            <span>Payment Settlement</span>
          </h2>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">Payment Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI / PhonePe / GPay</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">Paid Amount (₹)</label>
            <input
              type="number"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl font-mono font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">Notes / Remarks</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment remarks or reference details..."
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Amount Totals Box */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-2.5 flex flex-col justify-between">
          <h2 className="font-extrabold text-gray-900 uppercase tracking-wider text-[11px]">
            Bill Totals Summary
          </h2>

          <div className="space-y-1.5 font-mono text-xs border-b border-gray-200 pb-3">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-bold text-gray-900">₹ {subtotal.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between items-center text-gray-600">
              <span>Bill Discount (₹):</span>
              <input
                type="number"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="w-24 text-right font-mono font-bold px-2 py-0.5 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="space-y-1 font-mono">
            <div className="flex justify-between text-sm font-extrabold text-emerald-900">
              <span>Grand Total:</span>
              <span>₹ {grandTotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-700">
              <span>Paid Amount:</span>
              <span>₹ {paidVal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-red-600 pt-1 border-t border-gray-200">
              <span>Outstanding Due:</span>
              <span>₹ {dueVal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="px-5 py-2 bg-[#047857] hover:bg-[#036448] text-white font-extrabold rounded-xl shadow-2xs flex items-center gap-2 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{updateMutation.isPending ? 'Saving...' : 'Save Bill'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HighlightText({ text = '', query = '' }) {
  if (!query.trim() || !text) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <span>
      {parts.map((part, idx) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={idx} className="bg-amber-200 text-gray-900 rounded-xs px-0.5 font-black">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}
