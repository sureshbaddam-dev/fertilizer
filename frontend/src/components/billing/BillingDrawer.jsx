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
  MessageSquare,
} from 'lucide-react';
import ProductAvatar from '../ui/ProductAvatar';
import { customerService } from '../../services/customerService';
import { productService } from '../../services/productService';
import { invoiceService } from '../../services/invoiceService';
import { settingService } from '../../services/settingService';
import { useSettings } from '../../contexts/SettingsContext';
import { generateMonthlyStatementPdf } from '../../utils/pdfGenerator';
import { calculateCustomerStatement, buildWhatsAppStatementMessage } from '../../utils/statementCalculator';
import AddCustomerModal from '../customers/AddCustomerModal';

// Memoized Cart Item Row Component to isolate re-renders on quantity / price input
const CartItemRow = React.memo(function CartItemRow({
  item,
  onUpdateQty,
  onDirectQtyInput,
  onUpdatePrice,
  onDeleteItem,
}) {
  const targetId = item.originalProductId || item.id;
  const lineTotalVal = item.lineTotal !== undefined ? item.lineTotal : (item.qty * item.price);

  return (
    <div className="p-2 sm:p-2.5 hover:bg-gray-50/60 transition-colors flex items-center justify-between gap-2 text-xs">
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
          {item.discountVal > 0 && (
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 block w-fit mt-0.5">
              Discount: {item.discountType === 'Percentage' ? `${item.discountVal}%` : `₹${item.discountVal}`}
            </span>
          )}
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
          onClick={() => onUpdateQty(targetId, -1)}
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
          onChange={(e) => onDirectQtyInput(targetId, e.target.value)}
          className="w-12 h-6 text-center font-mono font-bold text-gray-900 text-xs focus:outline-none focus:bg-emerald-50 border-x border-gray-200"
          title="Click to type quantity"
        />
        <button
          type="button"
          onClick={() => onUpdateQty(targetId, 1)}
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
          onChange={(e) => onUpdatePrice(targetId, e.target.value)}
          className="w-full h-7 px-1 bg-gray-50 border border-gray-200 rounded-lg font-mono font-bold text-right text-xs focus:outline-none focus:border-[#00783C]"
        />
      </div>

      {/* 4. Line Amount = Qty x Effective Selling Price */}
      <div className="w-20 text-right font-mono font-extrabold text-gray-900 text-xs shrink-0">
        ₹ {lineTotalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </div>

      {/* 5. Delete Button */}
      <button
        type="button"
        onClick={() => onDeleteItem(targetId)}
        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
        title="Remove item"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
});

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
  const [debouncedCustomerInput, setDebouncedCustomerInput] = useState('');
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
    const timer = setTimeout(() => setDebouncedDrawerProdSearch(drawerProdSearch.trim()), 250);
    return () => clearTimeout(timer);
  }, [drawerProdSearch]);

  // Debounce Customer Autocomplete Search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCustomerInput(customerInput.trim()), 250);
    return () => clearTimeout(timer);
  }, [customerInput]);

  // Reset product suggestions dropdown state on drawer open (suggestions remain HIDDEN initially)
  useEffect(() => {
    if (isOpen) {
      setIsDrawerProdDropdownOpen(false);
      setDrawerProdSearch('');
      setDebouncedDrawerProdSearch('');
      setSelectedProdIndex(-1);
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

  // Fetch Customers for Autocomplete (with debouncing and stable cache)
  const { data: drawerCustomersApi } = useQuery({
    queryKey: ['drawer-customers', debouncedCustomerInput],
    queryFn: () => customerService.getCustomers({ search: debouncedCustomerInput }),
    enabled: customerMode === 'add' && Boolean(isOpen),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const drawerCustomerOptions = useMemo(
    () => (Array.isArray(drawerCustomersApi?.data?.customers) ? drawerCustomersApi.data.customers : []),
    [drawerCustomersApi?.data?.customers]
  );

  // Fetch Top Selling Products for In-Drawer Product Search (with stable cache)
  const { data: drawerProductsApi } = useQuery({
    queryKey: ['drawer-top-selling-products', debouncedDrawerProdSearch],
    queryFn: () => productService.getTopSellingProducts({ search: debouncedDrawerProdSearch }),
    enabled: isDrawerProdDropdownOpen && Boolean(isOpen),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const drawerProductOptions = useMemo(
    () => drawerProductsApi?.data?.products || drawerProductsApi?.products || [],
    [drawerProductsApi]
  );

  // Fetch Active Shop Discount from Backend DB (Single Source of Truth)
  const { data: shopDiscountApi } = useQuery({
    queryKey: ['shop-discount'],
    queryFn: () => settingService.getShopDiscount(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const shopDiscountData = shopDiscountApi?.data?.data || shopDiscountApi?.data;
  const isShopDiscountEnabled = Boolean(shopDiscountData?.isEnabled && Number(shopDiscountData?.discountValue) > 0);

  // Consume Live Shop Settings from Shared Context (Single Source of Truth)
  const { settings: shopSettingsData } = useSettings();
  const shopSettings = useMemo(() => shopSettingsData || {}, [shopSettingsData]);
  const isGstEnabled = shopSettingsData?.isGstEnabled !== false;
  const defaultGstRate = Number(shopSettingsData?.defaultGst ?? 0);
  const gstType = shopSettingsData?.gstType || 'CGST_SGST';

  const [lastSavedInvoice, setLastSavedInvoice] = useState(null);

  const isSelectingProdRef = useRef(false);

  // Add Product to Cart
  const addProductToCart = useCallback((product, options = { focusSearch: false }) => {
    if (!product) return;
    isSelectingProdRef.current = true;

    const pId = product._id || product.id;
    const pName = product.name || 'Product';
    const pPrice = Number(product.currentSellingPrice || product.sellingPrice || product.defaultSellingPrice || product.defaultMrp || product.mrp || product.price || 0);
    const pUnit = (product.defaultUnitId?.shortName) || product.defaultUnitId?.name || product.unit || 'Bag';
    const pBrand = (product.brandId?.name) || product.brand || 'Vedixa';
    const pStock = Number(product.totalStock ?? product.currentStock ?? product.stock ?? 0);

    // Resolve discount from active batch or product basic
    const activeBatch = Array.isArray(product.batches)
      ? product.batches.find((b) => Number(b.quantityRemaining ?? b.currentStock ?? 0) > 0 && (b.discount || b.gstRate)) || product.batches[0]
      : null;

    const discVal = Number(
      product.discountVal !== undefined && product.discountVal !== null
        ? product.discountVal
        : (activeBatch?.discount !== undefined && activeBatch?.discount !== null && activeBatch?.discount !== '' && Number(activeBatch?.discount) !== 0
            ? activeBatch.discount
            : (product.discount ?? 0))
    );

    const discType = product.discountType || activeBatch?.discountType || 'Percentage';

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
          discVal: discVal > 0 ? discVal : 0,
          discType: discVal > 0 ? discType : 'Percentage',
          unit: pUnit,
          image: product.image,
          currentStock: pStock,
          totalStock: pStock,
          batches: product.batches,
          discount: product.discount,
          discountType: product.discountType,
        },
      ];
    });

    setDrawerProdSearch('');
    setDebouncedDrawerProdSearch('');
    setIsDrawerProdDropdownOpen(false);
    setSelectedProdIndex(-1);

    if (options.focusSearch && drawerProdInputRef.current) {
      drawerProdInputRef.current.value = '';
      drawerProdInputRef.current.focus();
    }

    setTimeout(() => {
      isSelectingProdRef.current = false;
    }, 150);
  }, []);

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

  useEffect(() => {
    if (quickAddedProduct && lastProcessedProductRef.current !== quickAddedProduct) {
      lastProcessedProductRef.current = quickAddedProduct;
      addProductToCart(quickAddedProduct, { focusSearch: false });
    }
  }, [quickAddedProduct, addProductToCart]);

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

  const handleExplicitClose = () => {
    if (items.length > 0) {
      if (window.confirm('Cart contains items. Are you sure you want to close the billing drawer?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Stabilized Item Update Handlers via useCallback
  const handleUpdateQty = useCallback((id, delta) => {
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.id !== id && i.originalProductId !== id) return i;
          const maxStock = Number(i.totalStock || i.currentStock || 99999);
          const newQty = Math.min(maxStock, Math.max(1, (Number(i.qty) || 0) + delta));
          return { ...i, qty: newQty };
        })
        .filter((i) => i.qty > 0)
    );
  }, []);

  const handleDirectQtyInput = useCallback((id, rawVal) => {
    if (rawVal === '') {
      setItems((prev) => prev.map((i) => (i.id === id || i._id === id || i.originalProductId === id ? { ...i, qty: '' } : i)));
      return;
    }
    const sanitizedVal = rawVal.length > 1 && rawVal.startsWith('0') ? rawVal.replace(/^0+/, '') || '0' : rawVal;
    const val = parseFloat(sanitizedVal);
    if (isNaN(val) || val < 0) return;

    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id && i._id !== id && i.originalProductId !== id) return i;
        return { ...i, qty: val };
      })
    );
  }, []);

  const handleUpdatePrice = useCallback((id, newPrice) => {
    const priceVal = parseFloat(newPrice);
    setItems((prev) =>
      prev.map((i) => (i.id === id || i.originalProductId === id ? { ...i, price: isNaN(priceVal) || priceVal < 0 ? 0 : priceVal } : i))
    );
  }, []);

  const handleDeleteItem = useCallback((id) => {
    setItems((prev) => prev.filter((i) => i.id !== id && i.originalProductId !== id));
  }, []);

  const handleClearCart = useCallback(() => {
    setItems([]);
    setManualDiscountValue('');
    setPaidAmountInput('');
    setIsPaidAmountCustom(false);
    setLastSavedInvoice(null);
  }, []);

  const [fifoPreview, setFifoPreview] = useState(null);

  // Debounced FIFO preview to eliminate network stutter during typing
  useEffect(() => {
    if (items.length === 0) {
      setFifoPreview(null);
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        const payload = {
          items: items.map((i) => ({
            productId: i.id || i._id || i.originalProductId,
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
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [items]);

  const displayItems = useMemo(() => {
    let baseList = [];
    if (fifoPreview && Array.isArray(fifoPreview.items) && fifoPreview.items.length > 0) {
      const itemMap = new Map();
      items.forEach((i) => {
        const idStr = (i.id || i._id || i.productId || i.originalProductId)?.toString();
        if (idStr) itemMap.set(idStr, i);
      });

      baseList = fifoPreview.items.map((pi) => {
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
          discVal: parentItem.discVal || pi.discVal || 0,
          discType: parentItem.discType || pi.discType || 'Percentage',
        };
      });
    } else {
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
          const bDisc = Number(batch.discount !== undefined && batch.discount !== null && batch.discount !== '' && Number(batch.discount) !== 0 ? batch.discount : (item.discVal || 0));
          const bDiscType = batch.discountType || item.discType || 'Percentage';

          batchGroups.push({
            batchNumber: batch.batchNumber,
            qty: alloc,
            price: bPrice,
            discVal: bDisc,
            discType: bDiscType,
          });

          remainingToAlloc -= alloc;
        }

        if (remainingToAlloc > 0) {
          batchGroups.push({
            batchNumber: '',
            qty: remainingToAlloc,
            price: item.price,
            discVal: item.discVal || 0,
            discType: item.discType || 'Percentage',
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
              discVal: group.discVal,
              discType: group.discType,
              isFifoSplit: true,
              fifoSplitNotice: idx > 0
                ? `Taken from next batch at ₹${group.price} (Previous batch contained ${batchGroups[0].qty} ${item.unit}s @ ₹${batchGroups[0].price})`
                : undefined,
            });
          });
        }
      });
      baseList = expanded;
    }

    return baseList.map((pi) => {
      const q = Number(pi.qty || pi.quantity) || 0;
      const basePrice = Number(pi.price || pi.unitPrice) || 0;
      const dVal = Number(pi.discVal || pi.discountVal || 0);
      const dType = pi.discType || pi.discountType || 'Percentage';

      let discPerUnit = 0;
      let effectivePrice = basePrice;
      let discLabel = '';

      if (dVal > 0) {
        if (dType === 'Percentage') {
          discPerUnit = (basePrice * dVal / 100);
          discLabel = `${dVal}% OFF`;
        } else {
          discPerUnit = dVal;
          discLabel = `₹${dVal} OFF`;
        }
        effectivePrice = Math.max(0, basePrice - discPerUnit);
      }

      return {
        ...pi,
        discountVal: dVal,
        discountType: dType,
        discLabel,
        discPerUnit,
        effectivePrice,
        lineTotal: q * effectivePrice,
      };
    });
  }, [items, fifoPreview]);

  const subtotal = useMemo(() => {
    return displayItems.reduce((acc, i) => acc + (i.lineTotal || 0), 0);
  }, [displayItems]);
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
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['products-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['customers-list-page'] });
      queryClient.invalidateQueries({ queryKey: ['general-customers-list'] });
      queryClient.invalidateQueries({ queryKey: ['customer-ledger-profile'] });
      queryClient.invalidateQueries({ queryKey: ['customer-ledger-details'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-products'] });

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

  const [isWhatsAppProcessing, setIsWhatsAppProcessing] = useState(false);

  const handleWhatsAppFlow = async () => {
    if (createInvoiceMutation.isPending || isSubmittingRef.current || isWhatsAppProcessing) return;

    if (items.length === 0) {
      alert('Cart is empty. Please add items before sending WhatsApp statement.');
      return;
    }

    // Frontend Stock Check
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
      if (!generalName.trim()) {
        alert('Please enter General Customer Name.');
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

    const custMobile = (customerData.mobile || '').trim();
    if (!custMobile) {
      alert('Customer mobile number is missing. Please add a valid mobile/WhatsApp number to send statement.');
      return;
    }

    setIsWhatsAppProcessing(true);
    isSubmittingRef.current = true;

    // Allocate popup tab synchronously during active user click gesture to prevent browser popup suppression
    let waWindow = null;
    try {
      waWindow = window.open('', '_blank');
      if (waWindow && waWindow.document) {
        waWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Opening WhatsApp Statement - VEDIXA ERP</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #f0fdf4;
      color: #14532d;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      background: #ffffff;
      border: 1px solid #bbf7d0;
      border-radius: 1.25rem;
      padding: 2.25rem 2rem;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 4px solid #dcfce7;
      border-top-color: #16a34a;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1.25rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h2 {
      font-size: 1.25rem;
      font-weight: 800;
      color: #14532d;
      margin-bottom: 0.5rem;
    }
    p {
      font-size: 0.875rem;
      color: #4b5563;
      margin-bottom: 1.5rem;
      line-height: 1.4;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      background-color: #16a34a;
      color: #ffffff;
      font-weight: 700;
      font-size: 0.875rem;
      padding: 0.8rem 1.75rem;
      border-radius: 0.75rem;
      text-decoration: none;
      box-shadow: 0 4px 6px -1px rgba(22, 163, 74, 0.3);
      transition: all 0.2s;
    }
    .btn:hover {
      background-color: #15803d;
      transform: translateY(-1px);
    }
    .hint {
      font-size: 0.75rem;
      color: #9ca3af;
      margin-top: 1.25rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <div id="spinner" class="spinner"></div>
    <h2 id="heading">Generating WhatsApp Statement...</h2>
    <p id="subtext">Saving bill and compiling customer ledger statement.</p>
    <a id="btn-redirect" class="btn" style="display: none;" href="#" target="_self">
      <span>Open WhatsApp Now</span>
      <span>&rarr;</span>
    </a>
    <div id="hint" class="hint">Please keep this window open while we prepare your statement...</div>
  </div>
  <script>
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'REDIRECT_WHATSAPP' && e.data.url) {
        window.location.replace(e.data.url);
      }
    });
  <\/script>
</body>
</html>`);
        waWindow.document.close();
      }
    } catch (_e) {
      waWindow = null;
    }

    try {
      let savedInvoice = lastSavedInvoice;

      if (!savedInvoice) {
        const idempotencyKey = `IDEMP-WA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

        const savedRes = await invoiceService.createInvoice(payload);
        savedInvoice = savedRes?.data?.invoice || savedRes?.invoice || savedRes?.data || savedRes || {};
        setLastSavedInvoice(savedInvoice);

        queryClient.invalidateQueries({ queryKey: ['sales-invoices'] });
        queryClient.invalidateQueries({ queryKey: ['products-inventory'] });
        queryClient.invalidateQueries({ queryKey: ['customer-ledger-profile'] });
        queryClient.invalidateQueries({ queryKey: ['general-customers-list'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      }

      // 2. Re-fetch fresh Customer Ledger directly from database
      const targetCustomerId = isAddedCust ? selectedCustomer?._id : (savedInvoice.customerId || savedInvoice.customer?._id || savedInvoice.customer);
      let freshTransactions = [];
      let freshCustomer = customerData;

      if (targetCustomerId) {
        try {
          const ledgerRes = await customerService.getCustomerById(targetCustomerId);
          const ledgerData = ledgerRes?.data?.data || ledgerRes?.data || ledgerRes || {};
          if (Array.isArray(ledgerData.transactions)) {
            freshTransactions = ledgerData.transactions;
          }
          if (ledgerData.customer) {
            freshCustomer = ledgerData.customer;
          }
        } catch (err) {
          console.warn('Could not fetch fresh customer ledger for WhatsApp statement:', err);
        }
      }

      // Fallback for general customer without prior DB transactions
      if (freshTransactions.length === 0 && savedInvoice) {
        freshTransactions = [
          {
            type: 'Invoice',
            date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            createdAt: new Date().toISOString(),
            invoiceNumber: savedInvoice.invoiceNumber || 'INV',
            items: savedInvoice.items || displayItems,
            debit: grandTotal,
            credit: effectivePaidAmount > 0 ? effectivePaidAmount : 0,
          },
        ];
      }

      const now = new Date();
      const defaultMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // 3. Centralized Authoritative Statement Calculation
      const monthlyData = calculateCustomerStatement({
        transactions: freshTransactions,
        customer: freshCustomer,
        statementType: 'MONTHLY',
        selectedMonth: defaultMonthStr,
      });

      // 4. Open WhatsApp Redirect deterministically
      const cleanPhone = custMobile.replace(/\D/g, '');
      const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

      const waMsg = buildWhatsAppStatementMessage({
        monthLabel: monthlyData.monthLabel,
        openingBalance: monthlyData.openingBalance,
        newPurchases: grandTotal,
        totalPurchases: monthlyData.newPurchases,
        payments: monthlyData.payments,
        due: monthlyData.closingDue,
        shopSettings,
        isFromBillDrawer: true,
      });

      const waUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(waMsg)}`;

      if (waWindow && !waWindow.closed) {
        // 1. Update window DOM elements so user can click fallback button if browser delays auto-navigation
        try {
          if (waWindow.document) {
            const heading = waWindow.document.getElementById('heading');
            const subtext = waWindow.document.getElementById('subtext');
            const btn = waWindow.document.getElementById('btn-redirect');
            const hint = waWindow.document.getElementById('hint');
            if (heading) heading.innerText = 'Redirecting to WhatsApp...';
            if (subtext) subtext.innerText = 'Opening WhatsApp chat with customer statement.';
            if (btn) {
              btn.href = waUrl;
              btn.style.display = 'inline-flex';
            }
            if (hint) hint.innerText = 'If WhatsApp does not open automatically, click the button above.';
          }
        } catch (_) {}

        // 2. Post message to trigger in-window script navigation
        try {
          waWindow.postMessage({ type: 'REDIRECT_WHATSAPP', url: waUrl }, '*');
        } catch (_) {}

        // 3. Direct navigation
        try {
          waWindow.location.replace(waUrl);
        } catch (_) {
          try {
            waWindow.location.href = waUrl;
          } catch (_) {}
        }

        try {
          waWindow.focus?.();
        } catch (_) {}
      } else {
        const proceed = window.confirm(
          'Your browser blocked the WhatsApp popup window. Would you like to open WhatsApp now?'
        );
        if (proceed) {
          window.location.href = waUrl;
        }
      }

      // 5. Generate Monthly Statement PDF in background (non-blocking)
      generateMonthlyStatementPdf(freshCustomer, shopSettings, monthlyData).catch((pdfErr) => {
        console.warn('Monthly Statement PDF generation warning:', pdfErr);
      });

      setItems([]);
      setManualDiscountValue('');
      setPaidAmountInput('');
      setIsPaidAmountCustom(false);
      setNotes('');
      onClose();
    } catch (err) {
      if (waWindow && !waWindow.closed) {
        try {
          if (waWindow.document) {
            const heading = waWindow.document.getElementById('heading');
            const subtext = waWindow.document.getElementById('subtext');
            const spinner = waWindow.document.getElementById('spinner');
            const hint = waWindow.document.getElementById('hint');
            if (spinner) spinner.style.display = 'none';
            if (heading) {
              heading.innerText = 'Unable to Open WhatsApp';
              heading.style.color = '#dc2626';
            }
            if (subtext) subtext.innerText = err?.response?.data?.message || err?.message || 'Failed to save bill or generate WhatsApp statement.';
            if (hint) hint.innerText = 'This window will close automatically.';
          }
        } catch (_) {}
        setTimeout(() => {
          try {
            waWindow.close();
          } catch (_) {}
        }, 3000);
      }
      alert(err?.response?.data?.message || err?.message || 'Failed to save bill or generate WhatsApp statement.');
    } finally {
      setIsWhatsAppProcessing(false);
      isSubmittingRef.current = false;
    }
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
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto p-1 divide-y divide-gray-100 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
                    <div
                      onClick={() => {
                        setIsCustomerDropdownOpen(false);
                        setIsNewCustModalOpen(true);
                      }}
                      className="p-2.5 hover:bg-emerald-50 text-[#047857] font-bold flex items-center gap-2 cursor-pointer transition-colors border-b border-emerald-100"
                    >
                      <UserPlus className="w-4 h-4 text-[#047857]" />
                      <span>➕ Add New Customer</span>
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
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto p-1 divide-y divide-gray-100/80 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
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
                  <CartItemRow
                    key={itemKey}
                    item={item}
                    onUpdateQty={handleUpdateQty}
                    onDirectQtyInput={handleDirectQtyInput}
                    onUpdatePrice={handleUpdatePrice}
                    onDeleteItem={handleDeleteItem}
                  />
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
            className="col-span-3 py-2.5 px-1.5 text-[11px] font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Bill</span>
          </button>

          <button
            type="button"
            disabled={items.length === 0 || createInvoiceMutation.isPending || isWhatsAppProcessing}
            onClick={handleWhatsAppFlow}
            className="col-span-4 py-2.5 px-1 text-[11px] font-bold text-white bg-[#047857] hover:bg-[#036448] rounded-xl shadow-2xs flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
          >
            {isWhatsAppProcessing ? (
              <span className="text-[10px] animate-pulse">Saving &amp; WhatsApp...</span>
            ) : (
              <>
                <MessageSquare className="w-3.5 h-3.5 text-white" />
                <span>WhatsApp</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={items.length === 0 || createInvoiceMutation.isPending || isWhatsAppProcessing}
            onClick={handleSubmitBill}
            className="col-span-5 py-2.5 px-1.5 text-[11px] font-extrabold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
          >
            {createInvoiceMutation.isPending ? (
              <span>Saving...</span>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
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
