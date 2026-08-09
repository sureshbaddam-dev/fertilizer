import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Printer,
  Check,
  Plus,
  Minus,
  Trash2,
  UserPlus,
  RotateCcw,
  Search,
  ShoppingBag,
} from 'lucide-react';
import ProductAvatar from '../ui/ProductAvatar';
import { customerService } from '../../services/customerService';
import { productService } from '../../services/productService';
import { invoiceService } from '../../services/invoiceService';
import { settingService } from '../../services/settingService';
import { useSettings } from '../../contexts/SettingsContext';
import AddCustomerModal from '../customers/AddCustomerModal';

export default function BillingDrawer({ isOpen, onClose, quickAddedProduct }) {
  const queryClient = useQueryClient();

  // Cart Items State
  const [items, setItems] = useState([]);

  // Customer Mode State: 'general' (Default) or 'add'
  const [customerMode, setCustomerMode] = useState('general');

  // General Customer Details (Default to empty with placeholder)
  const [generalName, setGeneralName] = useState('');
  const [generalMobile, setGeneralMobile] = useState('');

  // Customer Autocomplete Field State
  const [customerInput, setCustomerInput] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isNewCustModalOpen, setIsNewCustModalOpen] = useState(false);
  const customerContainerRef = useRef(null);

  // In-Drawer Product Search State
  const [drawerProdSearch, setDrawerProdSearch] = useState('');
  const [debouncedDrawerProdSearch, setDebouncedDrawerProdSearch] = useState('');
  const [isDrawerProdDropdownOpen, setIsDrawerProdDropdownOpen] = useState(false);
  const [selectedProdIndex, setSelectedProdIndex] = useState(-1);
  const drawerProdRef = useRef(null);
  const drawerProdInputRef = useRef(null);

  // Bill-Level Manual Discount State ('amount' | 'percentage')
  const [manualDiscountType, setManualDiscountType] = useState('amount');
  const [manualDiscountValue, setManualDiscountValue] = useState('');

  // Editable Paid Amount & Notes State
  const [paidAmountInput, setPaidAmountInput] = useState('');
  const [isPaidAmountCustom, setIsPaidAmountCustom] = useState(false);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('Cash');
  const [notes, setNotes] = useState('');

  // Debounce Drawer Product Search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedDrawerProdSearch(drawerProdSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [drawerProdSearch]);

  // Auto-focus Product Search input when drawer opens
  useEffect(() => {
    if (isOpen && drawerProdInputRef.current) {
      setTimeout(() => {
        drawerProdInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Reset selected keyboard index when search input changes
  useEffect(() => {
    setSelectedProdIndex(-1);
  }, [drawerProdSearch]);

  // Close Dropdowns on Click Outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (customerContainerRef.current && !customerContainerRef.current.contains(e.target)) {
        setIsCustomerDropdownOpen(false);
      }
      if (drawerProdRef.current && !drawerProdRef.current.contains(e.target)) {
        setIsDrawerProdDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Customers for Autocomplete
  const { data: drawerCustomersApi } = useQuery({
    queryKey: ['drawer-customers', customerInput],
    queryFn: () => customerService.getCustomers({ search: customerInput }),
    enabled: customerMode === 'add',
    staleTime: 5 * 60 * 1000,
  });

  const drawerCustomerOptions = useMemo(
    () => (Array.isArray(drawerCustomersApi?.data?.customers) ? drawerCustomersApi.data.customers : []),
    [drawerCustomersApi?.data?.customers]
  );

  // Fetch Top Selling Products for In-Drawer Product Search
  const { data: drawerProductsApi } = useQuery({
    queryKey: ['drawer-top-selling-products', debouncedDrawerProdSearch],
    queryFn: () => productService.getTopSellingProducts({ search: debouncedDrawerProdSearch }),
    enabled: isDrawerProdDropdownOpen,
    staleTime: 5000,
  });

  const drawerProductOptions = useMemo(
    () => drawerProductsApi?.data?.products || drawerProductsApi?.products || [],
    [drawerProductsApi]
  );

  // Fetch Active Shop Discount from Backend DB (Single Source of Truth)
  const { data: shopDiscountApi } = useQuery({
    queryKey: ['shop-discount'],
    queryFn: () => settingService.getShopDiscount(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const shopDiscountData = shopDiscountApi?.data?.data || shopDiscountApi?.data;
  const isShopDiscountEnabled = Boolean(shopDiscountData?.isEnabled && Number(shopDiscountData?.discountValue) > 0);

  // Consume Live Shop Settings from Shared Context (Single Source of Truth)
  const { settings: shopSettingsData } = useSettings();
  const isGstEnabled = shopSettingsData?.isGstEnabled !== false;
  const defaultGstRate = Number(shopSettingsData?.defaultGst ?? 18);
  const gstType = shopSettingsData?.gstType || 'CGST_SGST';

  const isSelectingProdRef = useRef(false);

  // Add Product to Cart
  // Fix Bug #1: Pass focusSearch=false when quick adding from home screen product card click
  const addProductToCart = (product, options = { focusSearch: false }) => {
    if (!product) return;
    isSelectingProdRef.current = true;

    const pId = product._id || product.id;
    const pName = product.name || 'Product';
    const pPrice = Number(product.currentSellingPrice || product.sellingPrice || product.defaultSellingPrice || product.defaultMrp || product.mrp || product.price || 0);
    const pUnit = (product.defaultUnitId?.shortName) || product.defaultUnitId?.name || product.unit || 'Bag';
    const pBrand = (product.brandId?.name) || product.brand || 'Vedixa';
    const pStock = Number(product.totalStock ?? product.currentStock ?? product.stock ?? 0);

    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.id === pId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          qty: updated[existingIdx].qty + 1,
          currentStock: pStock > 0 ? pStock : updated[existingIdx].currentStock,
        };
        return updated;
      }
      return [
        ...prev,
        {
          id: pId,
          name: pName,
          brand: pBrand,
          qty: 1,
          price: pPrice,
          disc: 0,
          unit: pUnit,
          image: product.image,
          currentStock: pStock,
          totalStock: pStock,
        },
      ];
    });

    setDrawerProdSearch('');
    setDebouncedDrawerProdSearch('');
    setIsDrawerProdDropdownOpen(false);
    setSelectedProdIndex(-1);

    // Focus search input ONLY if requested (e.g. user selected item from search dropdown)
    if (options.focusSearch && drawerProdInputRef.current) {
      drawerProdInputRef.current.value = '';
      drawerProdInputRef.current.focus();
    }

    setTimeout(() => {
      isSelectingProdRef.current = false;
    }, 150);
  };

  // Keyboard navigation handler for Product Search input
  const handleProdSearchKeyDown = (e) => {
    if (!isDrawerProdDropdownOpen || drawerProductOptions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedProdIndex((prev) => (prev < drawerProductOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedProdIndex((prev) => (prev > 0 ? prev - 1 : drawerProductOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedProdIndex >= 0 && selectedProdIndex < drawerProductOptions.length) {
        addProductToCart(drawerProductOptions[selectedProdIndex], { focusSearch: true });
      } else if (drawerProductOptions.length > 0) {
        addProductToCart(drawerProductOptions[0], { focusSearch: true });
      }
    } else if (e.key === 'Escape') {
      setIsDrawerProdDropdownOpen(false);
      setSelectedProdIndex(-1);
    }
  };

  const lastProcessedProductRef = useRef(null);

  // Quick Add product from Left Dashboard click (Do NOT focus search input or open dropdown)
  useEffect(() => {
    if (quickAddedProduct && lastProcessedProductRef.current !== quickAddedProduct) {
      lastProcessedProductRef.current = quickAddedProduct;
      addProductToCart(quickAddedProduct, { focusSearch: false });
    }
  }, [quickAddedProduct]);

  // Keyboard shortcut (Escape or F2 key listener)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc' || e.key === 'F2') {
        e.preventDefault();
        handleExplicitClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, items.length]);

  // Confirmation prompt triggered ONLY on explicit close button, ESC key, or cancel
  const handleExplicitClose = () => {
    if (items.length > 0) {
      if (window.confirm('Cart contains items. Are you sure you want to close the billing drawer?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Cart Operations
  const handleUpdateQty = (id, delta) => {
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.id !== id) return i;
          const maxStock = Number(i.totalStock || i.currentStock || 99999);
          const newQty = Math.min(maxStock, Math.max(1, (Number(i.qty) || 0) + delta));
          return { ...i, qty: newQty };
        })
        .filter((i) => i.qty > 0)
    );
  };

  const handleDirectQtyInput = (id, rawVal) => {
    if (rawVal === '') {
      setItems((prev) => prev.map((i) => (i.id === id || i._id === id ? { ...i, qty: '' } : i)));
      return;
    }
    const sanitizedVal = rawVal.length > 1 && rawVal.startsWith('0') ? rawVal.replace(/^0+/, '') || '0' : rawVal;
    const val = parseFloat(sanitizedVal);
    if (isNaN(val) || val < 0) return;

    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id && i._id !== id) return i;
        return { ...i, qty: val };
      })
    );
  };

  const handleUpdatePrice = (id, newPrice) => {
    const priceVal = parseFloat(newPrice);
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, price: isNaN(priceVal) || priceVal < 0 ? 0 : priceVal } : i))
    );
  };

  const handleDeleteItem = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleClearCart = () => {
    setItems([]);
    setManualDiscountValue('');
    setPaidAmountInput('');
    setIsPaidAmountCustom(false);
  };

  // State to hold authoritative backend FIFO preview result
  const [fifoPreview, setFifoPreview] = useState(null);

  useEffect(() => {
    if (items.length === 0) {
      setFifoPreview(null);
      return;
    }

    let isMounted = true;
    const fetchPreview = async () => {
      try {
        const payload = {
          items: items.map((i) => ({
            productId: i.id || i._id,
            qty: Number(i.qty) || 1,
            price: Number(i.price) || 0,
          })),
        };
        const res = await invoiceService.previewInvoice(payload);
        const data = res?.data || res;
        if (isMounted && data?.items) {
          setFifoPreview(data);
        }
      } catch (err) {
        console.error('FIFO preview fetch error:', err);
      }
    };

    fetchPreview();
    return () => {
      isMounted = false;
    };
  }, [items]);

  // Authoritative displayItems derived from backend FIFO preview
  const displayItems = useMemo(() => {
    if (fifoPreview && Array.isArray(fifoPreview.items) && fifoPreview.items.length > 0) {
      const itemMap = new Map();
      items.forEach((i) => {
        const idStr = (i.id || i._id || i.productId)?.toString();
        if (idStr) itemMap.set(idStr, i);
      });

      return fifoPreview.items.map((pi) => {
        const pIdStr = (pi.productId || pi.originalProductId)?.toString();
        const parentItem = itemMap.get(pIdStr) || {};
        return {
          ...pi,
          id: pi.id || pi._id || pi.productId,
          originalProductId: pi.productId || pi.originalProductId,
          name: pi.productName || pi.name || parentItem.name,
          brand: pi.brandName || pi.brand || parentItem.brand || 'Vedixa',
          unit: pi.unitName || pi.unit || parentItem.unit || 'Bag',
          image: pi.image || parentItem.image || '',
          qty: pi.quantity || pi.qty,
          price: pi.unitPrice || pi.price,
        };
      });
    }

    const expanded = [];
    items.forEach((item) => {
      const itemQty = Number(item.qty) || 0;
      const batches = Array.isArray(item.batches)
        ? item.batches.filter((b) => Number(b.currentStock || b.quantityRemaining || 0) > 0)
        : [];

      if (batches.length <= 1 || itemQty <= 0) {
        expanded.push(item);
        return;
      }

      const sortedBatches = [...batches].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      let remainingToAlloc = itemQty;
      const batchGroups = [];

      for (const batch of sortedBatches) {
        if (remainingToAlloc <= 0) break;
        const bStock = Number(batch.currentStock || batch.quantityRemaining || 0);
        if (bStock <= 0) continue;

        const alloc = Math.min(bStock, remainingToAlloc);
        const bPrice = Number(batch.sellingPrice || item.price || 0);

        batchGroups.push({
          batchNumber: batch.batchNumber,
          qty: alloc,
          price: bPrice,
        });

        remainingToAlloc -= alloc;
      }

      if (remainingToAlloc > 0) {
        batchGroups.push({
          batchNumber: '',
          qty: remainingToAlloc,
          price: item.price,
        });
      }

      const distinctPrices = new Set(batchGroups.map((g) => g.price));
      if (distinctPrices.size <= 1) {
        expanded.push(item);
      } else {
        batchGroups.forEach((group, idx) => {
          expanded.push({
            ...item,
            id: `${item.id}-batch-${group.batchNumber || idx}`,
            originalProductId: item.id,
            batchNumber: group.batchNumber,
            qty: group.qty,
            price: group.price,
            isFifoSplit: true,
            fifoSplitNotice: idx > 0
              ? `Taken from next batch at ₹${group.price} (Previous batch contained ${batchGroups[0].qty} ${item.unit}s @ ₹${batchGroups[0].price})`
              : undefined,
          });
        });
      }
    });

    return expanded;
  }, [items, fifoPreview]);

  // Subtotal calculation derived authoritatively from backend preview or displayItems
  const subtotal = useMemo(() => {
    if (fifoPreview && fifoPreview.subtotal > 0) {
      return Number(fifoPreview.subtotal);
    }
    return displayItems.reduce((acc, i) => acc + (Number(i.qty || i.quantity) || 0) * (Number(i.price || i.unitPrice) || 0), 0);
  }, [displayItems, fifoPreview]);
  const perItemDiscountTotal = useMemo(() => displayItems.reduce((acc, i) => acc + (Number(i.disc) || 0), 0), [displayItems]);

  // DISCOUNT PRIORITY ENGINE (#2, #3, #4):
  // Priority: Manual Bill Discount -> Overrides -> Global Shop Discount. Never apply both together!
  const activeDiscount = useMemo(() => {
    const manualInput = manualDiscountValue.trim();
    const isManualEntered = manualInput !== '' && !isNaN(Number(manualInput));

    if (isManualEntered) {
      const val = Number(manualInput);
      const amount = manualDiscountType === 'percentage'
        ? (subtotal * val) / 100
        : val;
      return {
        type: manualDiscountType,
        value: val,
        amount: Math.min(subtotal, Math.max(0, amount)),
        source: 'manual', // Overrides shop discount
        label: `Manual Discount (${manualDiscountType === 'percentage' ? `${val}%` : `₹${val}`})`,
      };
    }

    if (isShopDiscountEnabled) {
      const shopVal = Number(shopDiscountData.discountValue);
      const shopType = shopDiscountData.discountType || 'percentage';
      const amount = shopType === 'percentage'
        ? (subtotal * shopVal) / 100
        : shopVal;
      return {
        type: shopType,
        value: shopVal,
        amount: Math.min(subtotal, Math.max(0, amount)),
        source: 'shop', // Applied automatically
        label: shopDiscountData.title || (shopType === 'percentage' ? `Flat ${shopVal}% OFF` : `Flat ₹${shopVal} OFF`),
      };
    }

    return { type: 'none', value: 0, amount: 0, source: 'none', label: 'No Discount' };
  }, [manualDiscountValue, manualDiscountType, subtotal, isShopDiscountEnabled, shopDiscountData]);

  const totalDiscount = activeDiscount.amount;
  const subtotalAfterDiscount = Math.max(0, subtotal - totalDiscount);

  // Dynamic Tax (GST) Engine
  const gstCalculation = useMemo(() => {
    if (!isGstEnabled) {
      return { isGstEnabled: false, gstRate: 0, gstAmount: 0, cgst: 0, sgst: 0, igst: 0, gstType: 'NONE' };
    }
    const rate = defaultGstRate;
    const gstAmt = (subtotalAfterDiscount * rate) / 100;
    if (gstType === 'IGST') {
      return { isGstEnabled: true, gstRate: rate, gstAmount: gstAmt, cgst: 0, sgst: 0, igst: gstAmt, gstType: 'IGST' };
    }
    const half = gstAmt / 2;
    return { isGstEnabled: true, gstRate: rate, gstAmount: gstAmt, cgst: half, sgst: half, igst: 0, gstType: 'CGST_SGST' };
  }, [isGstEnabled, defaultGstRate, gstType, subtotalAfterDiscount]);

  const grandTotal = Math.round(subtotalAfterDiscount + gstCalculation.gstAmount);

  // Sync default Paid Amount with Grand Total unless user manually edited
  useEffect(() => {
    if (!isPaidAmountCustom) {
      setPaidAmountInput(String(Math.round(grandTotal)));
    }
  }, [grandTotal, isPaidAmountCustom]);

  const effectivePaidAmount = useMemo(() => {
    if (paidAmountInput === '') return grandTotal;
    const parsed = parseFloat(paidAmountInput);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }, [paidAmountInput, grandTotal]);

  // Outstanding & Available Advance for Selected Customer
  const isGeneral = customerMode === 'general';
  const availableAdvance = isGeneral ? 0 : Number(selectedCustomer?.advanceBalance || 0);
  const advanceUsed = Math.min(availableAdvance, grandTotal);
  const netBillToPay = grandTotal - advanceUsed;

  const isSubmittingRef = useRef(false);

  // Submit & Save Bill Mutation
  const createInvoiceMutation = useMutation({
    mutationFn: (data) => invoiceService.createInvoice(data),
    onSuccess: () => {
      isSubmittingRef.current = false;
      queryClient.invalidateQueries(['invoices']);
      queryClient.invalidateQueries(['salesInvoices']);
      queryClient.invalidateQueries(['customer-ledger-profile']);
      queryClient.invalidateQueries(['customers-list-page']);
      queryClient.invalidateQueries(['products']);
      queryClient.invalidateQueries(['products-inventory']);
      queryClient.invalidateQueries(['dashboard-summary']);
      queryClient.invalidateQueries(['dashboard-products']);
      queryClient.invalidateQueries(['dashboard-notifications']);

      alert('Bill submitted & saved successfully!');
      setItems([]);
      setManualDiscountValue('');
      setPaidAmountInput('');
      setIsPaidAmountCustom(false);
      setNotes('');
      onClose();
    },
    onError: (err) => {
      isSubmittingRef.current = false;
      alert(err?.response?.data?.message || err?.message || 'Failed to submit bill');
    },
  });

  const handleSubmitBill = () => {
    if (createInvoiceMutation.isPending || isSubmittingRef.current) return;

    if (items.length === 0) {
      alert('Cart is empty. Please add items to submit bill.');
      return;
    }

    // Frontend Stock Verification Before Submit (authoritative check happens on backend)
    for (const item of items) {
      if (item.currentStock !== undefined && item.currentStock !== null && Number(item.currentStock) > 0) {
        const available = Math.max(0, Number(item.currentStock));
        if (item.qty > available) {
          alert(`Insufficient stock for "${item.name}". Available stock: ${available}, Requested: ${item.qty}`);
          return;
        }
      }
    }

    let customerData = null;
    let isAddedCust = false;

    if (customerMode === 'general') {
      if (!generalName.trim() || !generalMobile.trim()) {
        alert('Please enter General Customer Name and Mobile Number.');
        return;
      }
      customerData = { name: generalName.trim(), mobile: generalMobile.trim() };
      isAddedCust = false;
    } else {
      if (!selectedCustomer) {
        alert('Please search and select a customer.');
        return;
      }
      customerData = selectedCustomer;
      isAddedCust = true;
    }

    isSubmittingRef.current = true;
    const idempotencyKey = `IDEMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const payload = {
      customer: customerData,
      customerId: isAddedCust ? selectedCustomer?._id : null,
      customerType: isAddedCust ? 'ADDED' : 'GENERAL',
      customerName: customerData.name,
      customerMobile: customerData.mobile,
      items: displayItems.map((i) => ({
        productId: i.originalProductId || i.id || i._id,
        name: i.name,
        qty: i.qty,
        price: i.price,
        unitPrice: i.price,
        batchNumber: i.batchNumber || '',
        gstAmount: isGstEnabled ? (i.qty * i.price * defaultGstRate) / 100 : 0,
      })),
      subtotal,
      discountAmount: totalDiscount,
      taxAmount: gstCalculation.gstAmount,
      totalAmount: grandTotal,
      paidAmount: effectivePaidAmount,
      paymentMode: selectedPaymentMode,
      notes: notes.trim(),
      idempotencyKey,
    };

    createInvoiceMutation.mutate(payload);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay for Mobile & Tablet (lg:hidden) */}
      <div
        onClick={handleExplicitClose}
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden transition-opacity"
      />

      <aside
        className="fixed inset-0 z-50 flex w-full h-full flex-col justify-between overflow-y-auto bg-white text-sm shadow-2xl animate-in slide-in-from-right duration-200 lg:top-[var(--topbar-height)] lg:bottom-0 lg:right-0 lg:left-auto lg:z-40 lg:w-[33.75rem] lg:h-[calc(100vh-var(--topbar-height))] lg:border-l lg:border-slate-200"
      >
        {/* Drawer Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-extrabold text-gray-900">Billing Cart</h2>
          <span className="px-2.5 py-0.5 text-xs font-bold text-[#047857] bg-emerald-50 border border-emerald-200 rounded-full font-mono">
            New Bill (Auto)
          </span>
        </div>

        <button
          type="button"
          onClick={handleExplicitClose}
          className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          title="Close Drawer (Esc or F2)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Body Content */}
      <div className="p-4 space-y-4 flex-1">
        
        {/* CUSTOMER SELECTION */}
        <div className="bg-gray-50/70 border border-gray-200/80 p-3.5 rounded-2xl space-y-3" ref={customerContainerRef}>
          <div className="flex items-center gap-5 text-xs font-semibold text-gray-800">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="customerMode"
                checked={customerMode === 'general'}
                onChange={() => {
                  setCustomerMode('general');
                  setSelectedCustomer(null);
                  setCustomerInput('');
                }}
                className="w-4 h-4 text-[#00783C] accent-[#00783C]"
              />
              <span>General Customer</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="customerMode"
                checked={customerMode === 'add'}
                onChange={() => {
                  setCustomerMode('add');
                  setIsCustomerDropdownOpen(true);
                }}
                className="w-4 h-4 text-[#00783C] accent-[#00783C]"
              />
              <span>Add / Search Customer</span>
            </label>
          </div>

          {/* GENERAL CUSTOMER: NAME & MOBILE */}
          {customerMode === 'general' && (
            <div className="space-y-2 pt-1 border-t border-gray-200/60">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-gray-800">General Customer Details</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold">
                  Saved on Bill Only
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-700 block">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={generalName}
                    onChange={(e) => setGeneralName(e.target.value)}
                    placeholder="Select or enter customer"
                    className="w-full h-8 px-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#00783C]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-700 block">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={generalMobile}
                    onChange={(e) => setGeneralMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 10-digit mobile number"
                    className="w-full h-8 px-2.5 bg-white border border-gray-200 rounded-xl text-xs font-mono font-semibold text-gray-900 focus:outline-none focus:border-[#00783C]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ADD / SEARCH CUSTOMER AUTOCOMPLETE DROPDOWN */}
          {customerMode === 'add' && (
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={customerInput || selectedCustomer?.name || ''}
                  onFocus={() => setIsCustomerDropdownOpen(true)}
                  onChange={(e) => {
                    setCustomerInput(e.target.value);
                    setIsCustomerDropdownOpen(true);
                  }}
                  placeholder="Search customer name, mobile, village..."
                  className="w-full h-9 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#00783C]"
                />

                {isCustomerDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto p-1 divide-y divide-gray-100">
                    <div
                      onClick={() => {
                        setIsCustomerDropdownOpen(false);
                        setIsNewCustModalOpen(true);
                      }}
                      className="p-2.5 hover:bg-emerald-50 text-[#047857] font-bold flex items-center gap-2 cursor-pointer transition-colors border-b border-emerald-100"
                    >
                      <UserPlus className="w-4 h-4 text-[#047857]" />
                      <span>➕ Add New Customer (Master DB)</span>
                    </div>

                    {drawerCustomerOptions.map((c) => (
                      <div
                        key={c._id}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomerInput(c.name);
                          setIsCustomerDropdownOpen(false);
                        }}
                        className="p-2.5 hover:bg-gray-50 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div>
                          <span className="font-bold text-gray-900 block">{c.name}</span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {c.mobile} • {c.village || 'Narketpally'}
                          </span>
                        </div>
                        {c.outstandingBalance > 0 && (
                          <span className="text-[10px] font-mono font-bold text-red-600">
                            Due: ₹ {c.outstandingBalance.toLocaleString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedCustomer && (
                <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between font-mono text-xs">
                  <div>
                    <span className="font-bold text-gray-900 block">{selectedCustomer.name}</span>
                    <span className="text-[10px] text-gray-600">Mobile: {selectedCustomer.mobile}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 block">Current Due</span>
                    <span className="font-bold text-red-600">
                      ₹ {(selectedCustomer.outstandingBalance || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* POS-STYLE PRODUCT SEARCH AUTOCOMPLETE DROPDOWN */}
        <div className="relative" ref={drawerProdRef}>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              ref={drawerProdInputRef}
              type="text"
              value={drawerProdSearch}
              onFocus={() => {
                if (!isSelectingProdRef.current) {
                  setIsDrawerProdDropdownOpen(true);
                }
              }}
              onClick={() => {
                if (!isSelectingProdRef.current) {
                  setIsDrawerProdDropdownOpen(true);
                }
              }}
              onTouchStart={() => {
                if (!isSelectingProdRef.current) {
                  setIsDrawerProdDropdownOpen(true);
                }
              }}
              onChange={(e) => {
                setDrawerProdSearch(e.target.value);
                setIsDrawerProdDropdownOpen(true);
              }}
              onKeyDown={handleProdSearchKeyDown}
              placeholder="Quick Add Product by Name, Brand, SKU..."
              className="w-full h-9 pl-9 pr-8 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#00783C] focus:bg-white transition-all shadow-2xs"
            />
            {drawerProdSearch && (
              <button
                type="button"
                onClick={() => {
                  setDrawerProdSearch('');
                  setDebouncedDrawerProdSearch('');
                  setIsDrawerProdDropdownOpen(false);
                  setSelectedProdIndex(-1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown List */}
          {isDrawerProdDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 max-h-72 overflow-y-auto p-1 divide-y divide-gray-100/80">
              {drawerProductOptions.length > 0 ? (
                drawerProductOptions.map((p, idx) => {
                  const brandName = p.brandId?.name || p.companyId?.name || p.brand || 'Vedixa';
                  const catName = p.categoryId?.name || p.category || '';
                  const unitName = p.defaultUnitId?.shortName || p.defaultUnitId?.name || p.unit || 'Bag';
                  const pPrice = Number(p.defaultSellingPrice || p.sellingPrice || p.defaultMrp || p.price || 0);
                  const stockQty = Number(p.totalStock || p.currentStock || p.stock || 0);
                  const isSelected = selectedProdIndex === idx;

                  return (
                    <div
                      key={p._id || p.id}
                      onClick={() => addProductToCart(p, { focusSearch: true })}
                      onMouseEnter={() => setSelectedProdIndex(idx)}
                      className={`p-2 sm:p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors rounded-xl ${
                        isSelected
                          ? 'bg-emerald-50 border-l-4 border-l-[#047857]'
                          : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                      }`}
                    >
                      {/* Product Image (40x40) + Name & Brand */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <ProductAvatar
                          src={p.image}
                          name={p.name}
                          size={40}
                          className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-gray-200/80 bg-white"
                        />
                        <div className="min-w-0">
                          <span className="font-extrabold text-gray-900 text-xs block truncate leading-tight" title={p.name}>
                            {p.name}
                          </span>
                          <span className="text-[11px] text-gray-500 font-medium truncate block">
                            {brandName}{catName ? ` • ${catName}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Selling Price & Stock */}
                      <div className="text-right shrink-0">
                        <span className="font-mono font-extrabold text-xs text-gray-900 block">
                          ₹ {pPrice.toLocaleString('en-IN')} <span className="text-[10px] text-gray-400 font-normal">/ {unitName}</span>
                        </span>
                        <span className="text-[11px] font-bold text-[#047857] block">
                          Stock: {stockQty}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : drawerProdSearch.trim() ? (
                <div className="p-4 text-center text-gray-400 text-xs flex items-center justify-center gap-2 font-medium">
                  <Search className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>No matching products found</span>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* CART ITEMS TABLE */}
        <div className="border border-gray-200/80 rounded-2xl overflow-hidden shadow-2xs">
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between text-[11px] font-bold text-gray-700">
            <span>Item Details ({items.length})</span>
            {items.length > 0 && (
              <button
                type="button"
                onClick={handleClearCart}
                className="text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear All</span>
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <ShoppingBag className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="font-bold text-gray-500 text-xs">Cart is empty</p>
              <p className="text-[11px] text-gray-400">Search products above or click any product on the dashboard</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {displayItems.map((item, idx) => {
                const itemKey = `${item.id || item.productId || 'cart-item'}-${item.batchNumber || idx}-${idx}`;
                return (
                  <div key={itemKey} className="p-2 sm:p-2.5 hover:bg-gray-50/60 transition-colors flex items-center justify-between gap-2 text-xs">
                  {/* 1. Product Image & Name */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <ProductAvatar src={item.image} name={item.name} size={32} />
                    <div className="min-w-0">
                      <span className="font-bold text-gray-900 block text-xs truncate leading-tight" title={item.name}>
                        {item.name}
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium truncate block">
                        {item.brand}{item.batchNumber ? ` • Batch: ${item.batchNumber}` : ''}
                      </span>
                      {item.isFifoSplit && item.fifoSplitNotice && (
                        <span className="text-[9.5px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded block mt-0.5 leading-tight">
                          ✨ {item.fifoSplitNotice}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 2. Qty Counter (Buttons + Direct Typing) */}
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.originalProductId || item.id, -1)}
                      className="px-1.5 py-0.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold transition-colors cursor-pointer"
                      title="Decrease Qty"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      onFocus={(e) => e.target.select()}
                      value={item.qty}
                      onChange={(e) => handleDirectQtyInput(item.originalProductId || item.id, e.target.value)}
                      className="w-12 h-6 text-center font-mono font-bold text-gray-900 text-xs focus:outline-none focus:bg-emerald-50 border-x border-gray-200"
                      title="Click to type quantity"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.originalProductId || item.id, 1)}
                      className="px-1.5 py-0.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold transition-colors cursor-pointer"
                      title="Increase Qty"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* 3. Selling Price (Editable) */}
                  <div className="w-18 sm:w-20 shrink-0">
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => handleUpdatePrice(item.originalProductId || item.id, e.target.value)}
                      className="w-full h-7 px-1 bg-gray-50 border border-gray-200 rounded-lg font-mono font-bold text-right text-xs focus:outline-none focus:border-[#00783C]"
                    />
                  </div>

                  {/* 4. Line Amount = Qty x Selling Price */}
                  <div className="w-20 text-right font-mono font-extrabold text-gray-900 text-xs shrink-0">
                    ₹ {(item.qty * item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>

                  {/* 5. Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.originalProductId || item.id)}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
          )}
        </div>

        {/* BILL SUMMARY & ADVANCE APPLIED */}
        <div className="bg-gray-50/70 border border-gray-200/80 p-3.5 rounded-2xl space-y-2.5 font-sans">
          
          <div className="flex justify-between text-gray-600 font-medium">
            <span>Subtotal</span>
            <span className="font-mono font-bold text-gray-900">
              ₹ {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* DISCOUNT PRIORITY CONTROLS (#2, #3, #4) */}
          <div className="space-y-1 border-t border-b border-gray-200/60 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-gray-700 font-bold">Bill Discount</span>
                {activeDiscount.source === 'shop' && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full truncate">
                    ✨ Shop Discount Auto-Applied
                  </span>
                )}
                {activeDiscount.source === 'manual' && (
                  <span className="text-[10px] font-bold text-[#047857] bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full truncate">
                    Manual Discount (Overrides Shop)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <select
                  value={manualDiscountType}
                  onChange={(e) => setManualDiscountType(e.target.value)}
                  className="h-7 px-2 bg-white border border-emerald-300 hover:border-[#047857] rounded-lg text-xs font-extrabold text-[#047857] focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-2xs transition-colors"
                >
                  <option value="amount" className="font-bold text-gray-900 bg-white">₹</option>
                  <option value="percentage" className="font-bold text-gray-900 bg-white">%</option>
                </select>

                <div className="relative">
                  <input
                    type="number"
                    value={manualDiscountValue}
                    onChange={(e) => setManualDiscountValue(e.target.value)}
                    placeholder={
                      isShopDiscountEnabled
                        ? `${shopDiscountData?.discountValue}${shopDiscountData?.discountType === 'percentage' ? '%' : ' (Shop)'}`
                        : '0'
                    }
                    className="w-24 h-7 pl-2 pr-5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-right text-xs focus:outline-none focus:border-[#00783C]"
                  />
                  {manualDiscountValue && (
                    <button
                      type="button"
                      onClick={() => setManualDiscountValue('')}
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600"
                      title="Clear manual discount to restore Shop Discount"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {activeDiscount.amount > 0 && (
              <div className="flex justify-between text-xs font-semibold text-emerald-700 pt-0.5">
                <span>{activeDiscount.label}</span>
                <span className="font-mono font-extrabold">- ₹ {activeDiscount.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            {/* GST / Tax Row (Always visible with configured rate or ₹0.00) */}
            <div className="flex justify-between text-xs font-semibold text-slate-700 pt-0.5 border-t border-slate-100">
              <span>
                GST / Tax {gstCalculation.isGstEnabled ? `(${gstCalculation.gstRate}%)` : '(0%)'}
              </span>
              <span className="font-mono font-extrabold text-slate-900">
                + ₹ {gstCalculation.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Advance Used Indicator if customer has advance */}
          {advanceUsed > 0 && (
            <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50/80 p-2 rounded-xl border border-emerald-200 text-[11px]">
              <span>Customer Advance Applied</span>
              <span className="font-mono">- ₹ {advanceUsed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          )}

          {/* Grand Total Row */}
          <div className="flex justify-between items-center text-gray-900 font-extrabold text-sm pt-1">
            <span>Grand Total</span>
            <span className="font-mono text-[#047857] text-base font-extrabold">
              ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* EDITABLE PAID AMOUNT FIELD */}
          <div className="pt-2 space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold text-gray-900 block">
                Paid Amount (₹) <span className="text-red-500">*</span>
              </label>

              {/* Dynamic Payment State Helper Tag */}
              {effectivePaidAmount === netBillToPay ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  Exact Payment (No Due)
                </span>
              ) : effectivePaidAmount < netBillToPay ? (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                  Due: ₹ {(netBillToPay - effectivePaidAmount).toLocaleString('en-IN')}
                </span>
              ) : (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Extra: ₹ {(effectivePaidAmount - netBillToPay).toLocaleString('en-IN')}
                </span>
              )}
            </div>

            <input
              type="number"
              value={paidAmountInput}
              onChange={(e) => {
                setPaidAmountInput(e.target.value);
                setIsPaidAmountCustom(true);
              }}
              placeholder={String(Math.round(grandTotal))}
              className="w-full h-9 px-3 bg-[#ECFDF5] border border-emerald-300 rounded-xl font-mono font-extrabold text-[#047857] text-sm focus:outline-none focus:border-[#00783C]"
            />
          </div>
        </div>

        {/* PAYMENT MODE & NOTES */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-gray-700 block">Payment Mode</label>
          <div className="grid grid-cols-5 gap-1.5">
            {['Cash', 'UPI', 'Card', 'Credit', 'Bank Transfer'].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSelectedPaymentMode(mode)}
                className={`py-1.5 px-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer text-center ${
                  selectedPaymentMode === mode
                    ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0] shadow-2xs'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add bill notes / reference (Optional)..."
            className="w-full h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#00783C]"
          />
        </div>

      </div>

      {/* FOOTER ACTION BUTTONS */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-3 space-y-1.5 shadow-lg">
        <div className="grid grid-cols-12 gap-2">
          <button
            type="button"
            disabled={items.length === 0}
            onClick={() => window.print()}
            className="col-span-4 py-2.5 px-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Print Bill</span>
          </button>

          <button
            type="button"
            disabled={items.length === 0 || createInvoiceMutation.isPending}
            onClick={handleSubmitBill}
            className="col-span-8 py-2.5 px-3 text-xs font-extrabold text-white bg-[#047857] hover:bg-[#00783C] rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {createInvoiceMutation.isPending ? (
              <span>Saving Bill...</span>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Submit &amp; Save Bill</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Unified Reusable Add Customer Modal */}
      <AddCustomerModal
        isOpen={isNewCustModalOpen}
        onClose={() => setIsNewCustModalOpen(false)}
        onCustomerCreated={(newCust) => {
          setSelectedCustomer(newCust);
          setCustomerMode('add');
          setCustomerInput(newCust.name || '');
          setIsCustomerDropdownOpen(false);
        }}
      />
    </aside>
    </>
  );
}
