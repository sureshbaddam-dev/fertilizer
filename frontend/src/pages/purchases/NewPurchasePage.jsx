import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Save, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import SupplierInvoiceForm from '../../components/purchases/SupplierInvoiceForm';
import AddProductSearchRow from '../../components/purchases/AddProductSearchRow';
import PurchaseItemsTable from '../../components/purchases/PurchaseItemsTable';
import PurchaseSummaryCards from '../../components/purchases/PurchaseSummaryCards';
import PurchaseConfirmationModal from '../../components/purchases/PurchaseConfirmationModal';
import QuickAddProductDrawer from '../../components/purchases/QuickAddProductDrawer';
import QuickAddSupplierDrawer from '../../components/purchases/QuickAddSupplierDrawer';
import { supplierService } from '../../services/supplierService';
import { productService } from '../../services/productService';
import { masterService } from '../../services/masterService';
import { purchaseService } from '../../services/purchaseService';
import { authService } from '../../services/authService';
import { toast } from '../../contexts/ToastContext';
import { isConfigured } from '../../utils/pricing';

export default function NewPurchasePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Auto Generated Purchase Number example PUR-20260909-58216
  const generatePurchaseNo = () => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(10000 + Math.random() * 90000);
    return `PUR-${dateStr}-${rand}`;
  };

  // Form Header State
  const [supplierId, setSupplierId] = useState('');
  const [purchaseNumber, setPurchaseNumber] = useState(generatePurchaseNo());
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidAmount, setPaidAmount] = useState('');
  const [isPaidAmountManual, setIsPaidAmountManual] = useState(false);
  const [notes, setNotes] = useState('');

  // Items State
  const [items, setItems] = useState([]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);
  const [apiError, setApiError] = useState(null);

  // Drawers & Modals State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [productInitialName, setProductInitialName] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [supplierInitialName, setSupplierInitialName] = useState('');

  const currentUser = authService.getCurrentUser();
  const currentUserId = currentUser?.id || currentUser?._id;

  // Fetch Masters, Suppliers, Products, and Recent Purchases
  const { data: mastersData } = useQuery({
    queryKey: ['masters-all', currentUserId],
    queryFn: masterService.getAllMasters,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!currentUserId,
  });

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => supplierService.getSuppliers({ isActive: 'true' }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: productsData } = useQuery({
    queryKey: ['products', currentUserId],
    queryFn: () => productService.getProducts({ isActive: 'true' }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!currentUserId,
  });

  const { data: recentPurchasesData, isLoading: isLoadingRecent } = useQuery({
    queryKey: ['purchases', 'recent'],
    queryFn: () => purchaseService.getPurchases({ limit: 5 }),
    staleTime: 2 * 60 * 1000,
  });

  const categories = useMemo(() => mastersData?.data?.categories || [], [mastersData]);
  const units = useMemo(() => mastersData?.data?.units || [], [mastersData]);
  const suppliers = useMemo(() => suppliersData?.data?.suppliers || [], [suppliersData]);
  const products = useMemo(() => productsData?.data?.products || [], [productsData]);
  const recentPurchases = useMemo(() => recentPurchasesData?.data?.purchases || [], [recentPurchasesData]);

  // Live Calculations
  const totalGross = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.purchaseRate || 0)), 0);

  const totalDiscount = items.reduce((sum, item) => {
    const qty = Number(item.quantity || 0);
    const rate = Number(item.purchaseRate || 0);
    const rawSub = qty * rate;
    const discVal = Number(item.discount !== undefined && item.discount !== '' && item.discount !== null ? item.discount : 0);
    const discType = item.discountType || 'Percentage';
    const discAmt = (discType === 'Percentage' || discType === '%')
      ? (rawSub * discVal) / 100
      : discVal;
    return sum + discAmt;
  }, 0);

  const totalInvoiceAmount = Math.max(0, totalGross - totalDiscount);
  const totalQty = items.reduce((sum, item) => sum + (Number(item.quantity || 0)), 0);
  const selectedSupplier = suppliers.find((s) => s._id === supplierId || s.id === supplierId);

  // Dynamic Supplier Advance & Payable Calculations
  const supplierBalance = Number(selectedSupplier?.outstandingBalance || 0);
  const advanceAvailable = supplierBalance < 0 ? Math.abs(supplierBalance) : 0;
  const previousOutstandingDue = supplierBalance > 0 ? supplierBalance : 0;
  const advanceUsed = Math.min(advanceAvailable, totalInvoiceAmount);
  const payableAfterAdvance = Math.max(0, totalInvoiceAmount - advanceUsed);

  // Total obligation: if supplier has previous outstanding, default paid covers previous due + current bill
  const totalPayableObligation = previousOutstandingDue > 0
    ? totalInvoiceAmount + previousOutstandingDue
    : payableAfterAdvance;

  const currentPaid = Number(paidAmount) || 0;
  const dueAmount = Math.max(0, totalPayableObligation - currentPaid);
  const finalSupplierBalance = supplierBalance + totalInvoiceAmount - currentPaid;

  // Dynamic Default Paid Amount Calculation (Current Bill + Previous Due OR Net Payable after Advance)
  useEffect(() => {
    if (!isPaidAmountManual) {
      if (items.length > 0 || supplierId) {
        const autoPaid = totalPayableObligation;
        setPaidAmount(autoPaid > 0 ? String(autoPaid) : (items.length > 0 && totalInvoiceAmount > 0 ? '0' : ''));
      } else {
        setPaidAmount('');
      }
    }
  }, [totalPayableObligation, isPaidAmountManual, items.length, supplierId]);

  // Dynamic Low Stock Items count from items added
  const lowStockItemsCount = useMemo(() => {
    return items.filter((it) => {
      const prod = it.product;
      if (!prod) return false;
      const currentStock = Number(prod.currentStock ?? prod.stockQuantity ?? 0);
      const minStock = Number(prod.minStockLevel ?? prod.reorderLevel ?? 10);
      return currentStock <= minStock || prod.isLowStock;
    }).length;
  }, [items]);

  // Handlers for Items
  const handleSelectProduct = (prod) => {
    const defaultRate = (prod.defaultPurchaseRate !== undefined && prod.defaultPurchaseRate !== null)
      ? Number(prod.defaultPurchaseRate)
      : (prod.purchasePrice !== undefined && prod.purchasePrice !== null)
      ? Number(prod.purchasePrice)
      : 0;

    const defaultSellVal = Number(prod.defaultSellingPrice ?? prod.sellingPrice ?? 0);

    const rawProd = prod.product || prod;
    const effectiveDiscount = isConfigured(prod.discount)
      ? prod.discount
      : (isConfigured(rawProd.discount) ? rawProd.discount : '');

    const effectiveDiscountType = prod.discountType || rawProd.discountType || 'Percentage';

    const effectiveGstRate = isConfigured(prod.gstRate)
      ? prod.gstRate
      : (isConfigured(rawProd.gstRate) ? rawProd.gstRate : 0);

    const newItem = {
      tempId: Date.now() + Math.random(),
      productId: rawProd._id || rawProd.id,
      product: rawProd,
      categoryId: rawProd.categoryId?._id || rawProd.categoryId || '',
      unitId: rawProd.defaultUnitId?._id || rawProd.unitId?._id || rawProd.unitId || '',
      batchNumber: prod.batchCode || prod.batchNumber || '',
      quantity: 10,
      purchaseRate: defaultRate,
      sellingPrice: defaultSellVal,
      discount: effectiveDiscount ? String(effectiveDiscount) : '',
      discountType: effectiveDiscountType,
      gstRate: effectiveGstRate ? String(effectiveGstRate) : '',
      updateMasterPrice: false,
    };
    setItems((prev) => [...prev, newItem]);
    toast.info(`Added "${rawProd.name || 'Product'}" to purchase`);
  };

  const handleItemChange = (idx, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const handleItemDelete = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
    toast.info('Item removed from purchase');
  };

  const handlePaidAmountChange = (val) => {
    setIsPaidAmountManual(true);
    setPaidAmount(val);
  };

  // Open Edit Product Drawer
  const handleEditProductInPurchase = (prod) => {
    setEditingProduct(prod);
    setIsAddProductOpen(true);
  };

  // Handle Product Drawer Success (Create or Edit)
  const handleProductDrawerSuccess = (updatedOrNewProd) => {
    if (editingProduct) {
      setItems((prev) =>
        prev.map((it) => {
          if (it.productId === updatedOrNewProd._id || it.productId === updatedOrNewProd.id) {
            return {
              ...it,
              product: updatedOrNewProd,
              categoryId: updatedOrNewProd.categoryId?._id || updatedOrNewProd.categoryId || it.categoryId,
              unitId: updatedOrNewProd.defaultUnitId?._id || updatedOrNewProd.unitId?._id || updatedOrNewProd.unitId || it.unitId,
              purchaseRate: updatedOrNewProd.defaultPurchaseRate !== undefined ? Number(updatedOrNewProd.defaultPurchaseRate) : it.purchaseRate,
              sellingPrice: updatedOrNewProd.defaultSellingPrice || it.sellingPrice,
            };
          }
          return it;
        })
      );
      setEditingProduct(null);
      toast.success('Product updated in purchase list');
    } else {
      handleSelectProduct(updatedOrNewProd);
    }
  };

  // Mutation for Purchase Save
  const saveMutation = useMutation({
    mutationFn: purchaseService.createPurchase,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-products'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger'] });

      const savedNo = res.data?.purchase?.purchaseNumber || purchaseNumber;
      setIsConfirmModalOpen(false);
      setSaveSuccessMsg(`🎉 Purchase saved successfully! (${savedNo}) Supplier ledger and inventory updated.`);
      setApiError(null);
      toast.success('Purchase saved successfully', { description: `Invoice: ${savedNo}` });

      // Reset Form
      setItems([]);
      setPaidAmount('');
      setIsPaidAmountManual(false);
      setPurchaseNumber(generatePurchaseNo());
      setNotes('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (err) => {
      const errMsg = err?.message || err?.response?.data?.message || 'Failed to save purchase';
      setApiError(errMsg);
      setSaveSuccessMsg(null);
      toast.error('Purchase could not be saved', { description: errMsg });
    },
  });

  // Step 1: Validate & Open Confirmation Modal
  const handleOpenConfirmModal = () => {
    setApiError(null);
    setSaveSuccessMsg(null);

    if (!supplierId) {
      const msg = 'Please select a Supplier';
      setApiError(msg);
      toast.warning(msg);
      return;
    }
    if (items.length === 0) {
      const msg = 'Please add at least one product item to the purchase list';
      setApiError(msg);
      toast.warning(msg);
      return;
    }

    setIsConfirmModalOpen(true);
  };

  // Step 2: Actually Submit Purchase on Confirmation
  const handleConfirmSavePurchase = () => {
    const payload = {
      supplierId,
      supplierInvoiceNumber: purchaseNumber,
      purchaseDate,
      paidAmount: Number(paidAmount) || 0,
      notes,
      items: items.map((it) => ({
        productId: it.productId,
        categoryId: it.categoryId,
        unitId: it.unitId,
        batchNumber: (it.batchNumber || '').trim(),
        quantity: Number(it.quantity) || 1,
        purchaseRate: Number(it.purchaseRate) || 0,
        sellingPrice: Number(it.sellingPrice) || 0,
        updateMasterPrice: Boolean(it.updateMasterPrice),
      })),
    };

    saveMutation.mutate(payload);
  };

  const handleResetForm = () => {
    setItems([]);
    setPaidAmount('');
    setIsPaidAmountManual(false);
    setNotes('');
    setApiError(null);
    setSaveSuccessMsg(null);
    setIsConfirmModalOpen(false);
    toast.info('Purchase form reset');
  };

  return (
    <div className="w-full pb-8 space-y-4 font-sans text-gray-900">
      {/* Top Standardized Header Banner matching Reference Design */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 overflow-hidden relative">
        <div className="flex items-center gap-3.5 z-10">
          <div className="w-10 h-10 rounded-xl bg-[#00783C] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block leading-tight">
              VEDIXA ERP &gt; PURCHASE
            </span>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-snug mt-0.5">
              New Purchase Entry
            </h1>
            <p className="text-xs text-gray-500 font-normal mt-0.5">
              Create a new purchase entry and update your inventory
            </p>
          </div>
        </div>

        {/* Decorative Right Slogan Graphic with cursive font & green foliage illustration */}
        <div className="hidden md:flex items-center gap-2 self-end sm:self-center pr-2 select-none pointer-events-none opacity-90">
          <div className="text-right">
            <div className="text-xs sm:text-sm font-serif italic font-semibold text-emerald-800/80 leading-tight">
              Better Purchases
            </div>
            <div className="text-xs sm:text-sm font-serif italic font-semibold text-emerald-800/80 leading-tight">
              Stronger Business
            </div>
          </div>
          <svg className="w-12 h-12 text-[#00783C]/70" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 40C24 40 24 24 38 18C38 18 36 30 24 40Z" fill="#10B981" fillOpacity="0.4" />
            <path d="M24 40C24 40 24 16 10 12C10 12 12 28 24 40Z" fill="#059669" fillOpacity="0.7" />
            <path d="M24 42V10" stroke="#047857" strokeWidth="2" strokeLinecap="round" />
            <path d="M38 18C30 22 24 28 24 40" stroke="#047857" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M10 12C18 16 24 24 24 40" stroke="#047857" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Success Notification Banner */}
      {saveSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2 text-xs font-medium shadow-2xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#00783C] shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Error Notification Banner */}
      {apiError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2 text-xs font-medium shadow-2xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {/* Main Grid: Left 8.5/9 cols (Form & Table), Right 3.5/3 cols (Summary Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* Left Column */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          
          {/* Section 1: Supplier & Purchase Details */}
          <SupplierInvoiceForm
            suppliers={suppliers}
            supplierId={supplierId}
            setSupplierId={(newId) => {
              setSupplierId(newId);
              setIsPaidAmountManual(false);
            }}
            purchaseNumber={purchaseNumber}
            purchaseDate={purchaseDate}
            setPurchaseDate={setPurchaseDate}
            paidAmount={paidAmount}
            setPaidAmount={setPaidAmount}
            onPaidAmountChange={handlePaidAmountChange}
            totalInvoiceAmount={totalInvoiceAmount}
            advanceAvailable={advanceAvailable}
            advanceUsed={advanceUsed}
            payableAfterAdvance={payableAfterAdvance}
            dueAmount={dueAmount}
            finalSupplierBalance={finalSupplierBalance}
            hasItems={items.length > 0}
            onOpenAddSupplier={(name) => {
              setSupplierInitialName(name || '');
              setIsAddSupplierOpen(true);
            }}
          />

          {/* Section 2: Add Products */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3.5">
            <AddProductSearchRow
              products={products}
              onSelectProduct={handleSelectProduct}
              onOpenAddProduct={(name) => {
                setProductInitialName(name || '');
                setEditingProduct(null);
                setIsAddProductOpen(true);
              }}
            />

            <PurchaseItemsTable
              items={items}
              categories={categories}
              units={units}
              onItemChange={handleItemChange}
              onItemDelete={handleItemDelete}
              onEditProduct={handleEditProductInPurchase}
            />
          </div>

          {/* Section 3: Notes (Optional) & Bottom Action Buttons */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3.5">
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#00783C] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                3
              </span>
              <h2 className="text-[15px] font-bold text-gray-900">Notes (Optional)</h2>
            </div>

            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any additional notes about this purchase..."
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#00783C] focus:border-[#00783C]"
            />

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={handleResetForm}
                className="h-[36px] px-4 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                <span>Reset</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate('/purchases')}
                  className="h-[36px] px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleOpenConfirmModal}
                  disabled={saveMutation.isPending}
                  className="h-[36px] px-5 bg-[#00783C] hover:bg-[#006030] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Purchase</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Right Sidebar Column */}
        <div className="lg:col-span-4 xl:col-span-3">
          <div className="sticky top-20">
            <PurchaseSummaryCards
              totalItemsCount={items.length}
              totalQty={totalQty}
              totalInvoiceAmount={totalInvoiceAmount}
              totalDiscount={totalDiscount}
              paidAmount={paidAmount}
              selectedSupplier={selectedSupplier}
              advanceAvailable={advanceAvailable}
              advanceUsed={advanceUsed}
              payableAfterAdvance={payableAfterAdvance}
              dueAmount={dueAmount}
              finalSupplierBalance={finalSupplierBalance}
              lowStockItemsCount={lowStockItemsCount}
              recentPurchases={recentPurchases}
              isLoadingRecent={isLoadingRecent}
            />
          </div>
        </div>

      </div>

      {/* Purchase Confirmation Modal */}
      <PurchaseConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setApiError(null);
        }}
        onConfirm={handleConfirmSavePurchase}
        isLoading={saveMutation.isPending}
        errorMessage={apiError}
        purchaseData={{
          supplier: selectedSupplier,
          purchaseNumber,
          purchaseDate,
          totalItemsCount: items.length,
          totalQty,
          totalInvoiceAmount,
          advanceAvailable,
          advanceUsed,
          payableAfterAdvance,
          paidAmount,
          dueAmount,
          finalSupplierBalance,
          notes,
        }}
      />

      {/* Inline Quick Add / Edit Product Drawer */}
      <QuickAddProductDrawer
        isOpen={isAddProductOpen}
        initialName={productInitialName}
        editingProduct={editingProduct}
        onClose={() => {
          setIsAddProductOpen(false);
          setEditingProduct(null);
        }}
        onSuccess={handleProductDrawerSuccess}
      />

      {/* Inline Quick Add Supplier Drawer */}
      <QuickAddSupplierDrawer
        isOpen={isAddSupplierOpen}
        initialName={supplierInitialName}
        onClose={() => setIsAddSupplierOpen(false)}
        onSuccess={(newSupplier) => {
          setSupplierId(newSupplier._id || newSupplier.id);
          setIsPaidAmountManual(false);
        }}
      />
    </div>
  );
}
