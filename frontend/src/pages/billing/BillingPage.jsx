import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  UserPlus,
  PauseCircle,
  User,
  Phone,
  MapPin,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CheckCircle,
  RotateCcw,
} from 'lucide-react';
import ProductAvatar from '../../components/ui/ProductAvatar';
import { productService } from '../../services/productService';
import { customerService } from '../../services/customerService';

// Isolated Live Clock Sub-component to prevent parent BillingPage from re-rendering every 1 second
const LiveHeaderClock = memo(function LiveHeaderClock() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <p className="text-[11px] text-gray-500 font-medium">
      {time.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • {' '}
      <span className="font-mono">{time.toLocaleTimeString('en-IN')}</span>
    </p>
  );
});

export default function BillingPage() {
  // Audit render count
  console.count('BillingPage Render');

  // Customer Selection State
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Product Search State & Debounced Value
  const [productSearch, setProductSearch] = useState('');
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const searchContainerRef = useRef(null);
  const productSearchInputRef = useRef(null);
  const isSelectingRef = useRef(false);

  // Debounce product search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedProductSearch(productSearch.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [productSearch]);

  // Cart Items State
  const [cartItems, setCartItems] = useState([]);

  // Payment Mode Selection State
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('Cash');

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Fetch Customers from MongoDB API (Stale time 5 minutes, refetches disabled)
  const { data: customerData } = useQuery({
    queryKey: ['customers', customerSearch],
    queryFn: () => customerService.getCustomers({ search: customerSearch }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const customersList = useMemo(
    () => customerData?.data?.customers || [],
    [customerData?.data?.customers]
  );

  // Default select first customer ONCE when customers list first loads
  useEffect(() => {
    if (!selectedCustomer && customersList.length > 0) {
      setSelectedCustomer(customersList[0]);
    }
  }, [customersList.length]);

  // 2. Fetch Products from MongoDB API (Only enabled when debounced search term is typed)
  const { data: productData, isLoading: isProductsLoading } = useQuery({
    queryKey: ['products-pos-search', debouncedProductSearch],
    queryFn: () => productService.getProducts({ search: debouncedProductSearch, inStock: 'true' }),
    enabled: debouncedProductSearch.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const searchProductsList = useMemo(
    () => productData?.data?.products || [],
    [productData?.data?.products]
  );

  // Cart Add / Update Handler
  const handleSelectProduct = (product) => {
    if (!product || isSelectingRef.current) return;
    isSelectingRef.current = true;

    const stockAvailable = Number(product.totalStock || product.currentStock || 1);
    if (stockAvailable <= 0) {
      isSelectingRef.current = false;
      return;
    }

    const prodId = product._id;
    const prodName = product.name;
    const companyName = product.brandId?.name || product.companyId?.name || '';
    const unitName = product.defaultUnitId?.name || product.unitId?.name || '';
    const batchNo = product.batchNumber || product.batchCode || '';
    const initialPrice = Number(product.defaultSellingPrice || product.sellingPrice || 0);

    setCartItems((prevCart) => {
      const existingIdx = prevCart.findIndex((item) => item.productId === prodId);

      if (existingIdx >= 0) {
        const updated = [...prevCart];
        const existing = updated[existingIdx];
        const newQty = Math.min(existing.quantity + 1, stockAvailable);
        updated[existingIdx] = {
          ...existing,
          quantity: newQty,
        };
        return updated;
      } else {
        return [
          ...prevCart,
          {
            _id: `cart-${Date.now()}-${Math.random()}`,
            productId: prodId,
            name: prodName,
            image: product.image,
            companyName,
            unitName,
            batchNumber: batchNo,
            currentStock: stockAvailable,
            sellingPrice: initialPrice,
            quantity: 1,
            discount: 0,
          },
        ];
      }
    });

    // Reset Search & Close Dropdown Immediately
    setProductSearch('');
    setDebouncedProductSearch('');
    setIsDropdownOpen(false);
    setHighlightedIndex(0);

    // Refocus Search Input
    setTimeout(() => {
      productSearchInputRef.current?.focus();
      isSelectingRef.current = false;
    }, 50);
  };

  // Keyboard navigation inside search dropdown
  const handleSearchKeyDown = (e) => {
    if (!isDropdownOpen || searchProductsList.length === 0) {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < searchProductsList.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : searchProductsList.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = searchProductsList[highlightedIndex] || searchProductsList[0];
      if (selected) {
        handleSelectProduct(selected);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsDropdownOpen(false);
    }
  };

  // Cart Operations
  const handleQtyChange = (index, delta) => {
    setCartItems((prev) => {
      const updated = [...prev];
      const item = updated[index];
      const targetQty = item.quantity + delta;
      if (targetQty >= 1 && targetQty <= item.currentStock) {
        updated[index] = { ...item, quantity: targetQty };
      }
      return updated;
    });
  };

  const handleManualQtyInput = (index, value) => {
    const num = parseInt(value, 10);
    setCartItems((prev) => {
      const updated = [...prev];
      const item = updated[index];
      if (isNaN(num) || num < 1) {
        updated[index] = { ...item, quantity: 1 };
      } else {
        const clamped = Math.min(num, item.currentStock);
        updated[index] = { ...item, quantity: clamped };
      }
      return updated;
    });
  };

  const handlePriceChange = (index, value) => {
    const num = parseFloat(value);
    setCartItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], sellingPrice: isNaN(num) || num < 0 ? 0 : num };
      return updated;
    });
  };

  const handleDiscountChange = (index, value) => {
    const num = parseFloat(value);
    setCartItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], discount: isNaN(num) || num < 0 ? 0 : num };
      return updated;
    });
  };

  const handleRemoveItem = (index) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Memoized Cart Calculations
  const { subtotal, totalDiscount, taxableAmount, estimatedGst, grandTotal } = useMemo(() => {
    const sub = cartItems.reduce((acc, item) => acc + item.quantity * item.sellingPrice, 0);
    const disc = cartItems.reduce((acc, item) => acc + (Number(item.discount) || 0), 0);
    const tax = Math.max(0, sub - disc);
    const gst = tax * 0.05;
    const grand = Math.max(0, tax + gst);

    return {
      subtotal: sub,
      totalDiscount: disc,
      taxableAmount: tax,
      estimatedGst: gst,
      grandTotal: grand,
    };
  }, [cartItems]);

  return (
    <div className="space-y-4 text-sm w-full max-w-full pb-8">
      
      {/* TOP BAR: Auto Invoice Number, Live Date & Time, Action Buttons */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-3 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] flex items-center justify-center font-bold shadow-2xs">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-gray-900 leading-tight">Billing &amp; Point of Sale (POS)</h1>
              <span className="px-2 py-0.5 bg-emerald-50 text-[#047857] border border-emerald-200 rounded font-mono text-[11px] font-bold">
                Auto Bill Ref
              </span>
            </div>
            <LiveHeaderClock />
          </div>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#047857]" />
            <span>New Customer</span>
          </button>

          <button
            type="button"
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100/70 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Hold Bill</span>
          </button>
        </div>
      </div>

      {/* MAIN 3-SECTION DESKTOP ERP LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        
        {/* ========================================================= */}
        {/* LEFT SECTION: Customer Selection & Details */}
        {/* ========================================================= */}
        <div className="lg:col-span-3 space-y-3">
          <div className="bg-white border border-gray-200/80 rounded-2xl p-3.5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-gray-900 text-xs">
                <User className="w-4 h-4 text-[#047857]" />
                <span>Customer Selection</span>
              </div>
              <span className="text-[10px] text-gray-400 font-mono">MongoDB Dynamic</span>
            </div>

            {/* Customer Search Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 block">Search Customer</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search name or mobile..."
                  className="w-full h-8 pl-8 pr-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#00783C]"
                />
              </div>
            </div>

            {/* Customer Selector Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 block">Select Customer</label>
              <select
                value={selectedCustomer?._id || ''}
                onChange={(e) => {
                  const cust = customersList.find((c) => c._id === e.target.value);
                  setSelectedCustomer(cust || null);
                }}
                className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#00783C]"
              >
                {customersList.map((cust) => (
                  <option key={cust._id} value={cust._id}>
                    {cust.name} ({cust.mobile})
                  </option>
                ))}
              </select>
            </div>

            {/* Customer Details Display Card */}
            {selectedCustomer ? (
              <div className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-emerald-100/80 pb-1.5">
                  <span className="font-bold text-gray-900 text-xs">{selectedCustomer.name}</span>
                  <span className="px-2 py-0.5 bg-[#DCFCE7] text-[#15803D] rounded-full text-[10px] font-semibold">
                    Verified Customer
                  </span>
                </div>

                <div className="space-y-1 text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="font-mono font-medium text-gray-800">{selectedCustomer.mobile}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="truncate">{selectedCustomer.address || 'Guntur, Andhra Pradesh'}</span>
                  </div>
                </div>

                {/* Outstanding Balance & Credit Limit */}
                <div className="pt-2 border-t border-emerald-100/80 space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-gray-500">Current Outstanding:</span>
                    <span className={`font-mono font-bold ${selectedCustomer.outstandingBalance > 0 ? 'text-red-600' : 'text-[#047857]'}`}>
                      ₹ {(selectedCustomer.outstandingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-gray-500">Credit Limit:</span>
                    <span className="font-mono font-semibold text-gray-700">
                      ₹ {(selectedCustomer.creditLimit || 50000).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 text-center text-gray-400 italic bg-gray-50 rounded-xl">
                Loading customer details from MongoDB...
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* CENTER SECTION: Product Search & Cart Table */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 space-y-3">
          <div className="bg-white border border-gray-200/80 rounded-2xl p-3.5 shadow-2xs space-y-3">
            
            {/* Product Search Input & Dynamic Dropdown */}
            <div className="space-y-1.5 relative" ref={searchContainerRef}>
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-gray-700 block">Search Products to Add</label>
                <span className="text-[10px] text-gray-400">Search by Name, Brand, Category or Batch Code</span>
              </div>
              
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={productSearchInputRef}
                  type="text"
                  value={productSearch}
                  onFocus={() => {
                    if (productSearch.trim().length > 0) {
                      setIsDropdownOpen(true);
                    }
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProductSearch(val);
                    setHighlightedIndex(0);
                    if (val.trim().length > 0) {
                      setIsDropdownOpen(true);
                    } else {
                      setIsDropdownOpen(false);
                      setDebouncedProductSearch('');
                    }
                  }}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Type product name, brand, category, batch... (Arrow keys + Enter to select)"
                  className="w-full h-10 pl-9 pr-3 bg-gray-50/90 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:border-[#00783C] focus:bg-white"
                />
              </div>

              {/* SEARCH DROPDOWN: Instant Results with Stock > 0 */}
              {isDropdownOpen && productSearch.trim().length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-2xl shadow-xl p-1 divide-y divide-gray-100">
                  {isProductsLoading ? (
                    <div className="p-4 text-center text-gray-500 flex items-center justify-center gap-2 text-sm font-medium">
                      <div className="w-4 h-4 border-2 border-[#00783C] border-t-transparent rounded-full animate-spin" />
                      <span>Searching available stock...</span>
                    </div>
                  ) : searchProductsList.length > 0 ? (
                    searchProductsList.map((product, idx) => {
                      const companyName = product.brandId?.name || product.companyId?.name || 'Brand';
                      const unitName = product.defaultUnitId?.name || product.unitId?.name || '';
                      const batchNo = product.batchNumber || product.batchCode || '';
                      const stockVal = Number(product.totalStock || product.currentStock || 0);
                      const priceVal = Number(product.defaultSellingPrice || product.sellingPrice || 0);
                      const isHighlighted = idx === highlightedIndex;

                      return (
                        <div
                          key={product._id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectProduct(product);
                          }}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                          className={`p-2.5 cursor-pointer rounded-xl flex items-center justify-between transition-colors gap-3 ${
                            isHighlighted ? 'bg-emerald-50 text-emerald-950 border border-emerald-200/80' : 'hover:bg-gray-50/80'
                          }`}
                        >
                          {/* Image & Product Details */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <ProductAvatar src={product.image} name={product.name} size={38} />

                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 text-sm truncate">{product.name}</span>
                                {batchNo && (
                                  <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded font-mono text-[11px] font-semibold shrink-0">
                                    {batchNo}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 font-medium truncate">
                                {companyName} {unitName ? `• ${unitName}` : ''}
                              </p>
                            </div>
                          </div>

                          {/* Price & Stock Display */}
                          <div className="text-right shrink-0">
                            <span className="font-mono font-bold text-[#047857] text-sm block">
                              ₹ {priceVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-xs text-emerald-700 font-medium block">
                              Stock: {stockVal} {unitName}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-400 font-medium">
                      No matching products found
                    </div>
                  )}
                </div>
              )}
                              ₹ {priceVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-medium block">
                              Stock: {stockVal} {unitName}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-gray-400 italic">
                      No matching products with available stock
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* CART TABLE */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900 text-xs">Billing Cart Items ({cartItems.length})</span>
                {cartItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCartItems([])}
                    className="text-[11px] text-red-600 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear Cart</span>
                  </button>
                )}
              </div>

              <div className="border border-gray-200/80 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase">
                    <tr>
                      <th className="py-2.5 px-2 text-center w-10">Image</th>
                      <th className="py-2.5 px-2.5">Product Name</th>
                      <th className="py-2.5 px-2 text-right w-24">Price (₹)</th>
                      <th className="py-2.5 px-2 text-center w-24">Qty</th>
                      <th className="py-2.5 px-2 text-right w-20">Discount (₹)</th>
                      <th className="py-2.5 px-2 text-right w-24">Total (₹)</th>
                      <th className="py-2.5 px-2 text-center w-10">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-normal text-gray-800">
                    {cartItems.length > 0 ? (
                      cartItems.map((item, idx) => {
                        const rowTotal = Math.max(0, item.quantity * item.sellingPrice - (item.discount || 0));

                        return (
                          <tr key={item._id} className="hover:bg-gray-50/60 transition-colors">
                            {/* Image Column using ProductAvatar Component */}
                            <td className="py-2 px-2 text-center">
                              <div className="mx-auto flex justify-center">
                                <ProductAvatar src={item.image} name={item.name} size={28} />
                              </div>
                            </td>

                            {/* Product Name Column */}
                            <td className="py-2 px-2.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-gray-900">{item.name}</span>
                                {item.batchNumber && (
                                  <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded font-mono text-[9px] font-semibold">
                                    {item.batchNumber}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-400 font-medium block">
                                {item.companyName} {item.unitName ? `• ${item.unitName}` : ''} (Stock: {item.currentStock})
                              </span>
                            </td>

                            {/* Editable Selling Price Column */}
                            <td className="py-2 px-2 text-right">
                              <input
                                type="number"
                                step="0.01"
                                value={item.sellingPrice}
                                onChange={(e) => handlePriceChange(idx, e.target.value)}
                                className="w-20 h-7 text-right px-1.5 bg-gray-50 border border-gray-200 rounded font-mono font-medium text-xs text-gray-900 focus:outline-none focus:border-[#00783C]"
                              />
                            </td>

                            {/* Quantity Controls (+ / - / Manual Typing) */}
                            <td className="py-2 px-2 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-1 bg-gray-100 border border-gray-200 rounded-lg p-0.5">
                                <button
                                  type="button"
                                  disabled={item.quantity <= 1}
                                  onClick={() => handleQtyChange(idx, -1)}
                                  className="p-1 hover:bg-gray-200 rounded text-gray-600 disabled:opacity-30 cursor-pointer"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => handleManualQtyInput(idx, e.target.value)}
                                  className="w-9 h-6 text-center font-mono font-bold text-xs bg-white border border-gray-200 rounded focus:outline-none focus:border-[#00783C]"
                                />

                                <button
                                  type="button"
                                  disabled={item.quantity >= item.currentStock}
                                  onClick={() => handleQtyChange(idx, 1)}
                                  className="p-1 hover:bg-gray-200 rounded text-gray-600 disabled:opacity-30 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </td>

                            {/* Per-Product Discount Column */}
                            <td className="py-2 px-2 text-right">
                              <input
                                type="number"
                                step="0.01"
                                value={item.discount}
                                onChange={(e) => handleDiscountChange(idx, e.target.value)}
                                className="w-16 h-7 text-right px-1.5 bg-gray-50 border border-gray-200 rounded font-mono text-xs text-gray-800 focus:outline-none focus:border-[#00783C]"
                              />
                            </td>

                            {/* Row Total Amount Column */}
                            <td className="py-2 px-2 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                              ₹ {rowTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>

                            {/* Remove Item Column */}
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-400 italic">
                          No items added to cart. Search and select products above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT SECTION: Bill Summary & Payment Preview */}
        {/* ========================================================= */}
        <div className="lg:col-span-3 space-y-3">
          <div className="bg-white border border-gray-200/80 rounded-2xl p-3.5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="font-bold text-gray-900 text-xs">Bill Financial Summary</span>
              <span className="text-[10px] text-[#047857] font-semibold font-mono">Live Calculations</span>
            </div>

            {/* Bill Summary Calculations Display */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-xs font-medium">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({cartItems.length} items)</span>
                <span className="font-mono text-gray-900">
                  ₹ {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between text-emerald-700">
                <span>Total Discount</span>
                <span className="font-mono">
                  - ₹ {totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Estimated GST (5%)</span>
                <span className="font-mono text-gray-900">
                  ₹ {estimatedGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-center text-gray-900 font-extrabold text-sm pt-2 border-t border-slate-200">
                <span>Grand Total</span>
                <span className="font-mono text-[#047857] text-base">
                  ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Payment Mode Selection Preview */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-gray-700 block">Payment Mode</label>
              <div className="grid grid-cols-2 gap-1.5">
                {['Cash', 'UPI', 'Card', 'Credit', 'Bank Transfer'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSelectedPaymentMode(mode)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center ${
                      selectedPaymentMode === mode
                        ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0] shadow-2xs font-bold'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                className="w-full py-2.5 btn-agri-primary rounded-xl font-extrabold text-xs shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Complete Billing &amp; Print</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl font-semibold text-xs cursor-pointer"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => setCartItems([])}
                  className="py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-red-600 rounded-xl font-semibold text-xs cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
