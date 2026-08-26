import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Save, AlertCircle, CheckCircle2, ShoppingBag } from 'lucide-react';
import SupplierInvoiceForm from '../../components/purchases/SupplierInvoiceForm';
import AddProductSearchRow from '../../components/purchases/AddProductSearchRow';
import PurchaseItemsTable from '../../components/purchases/PurchaseItemsTable';
import PurchaseSummaryCards from '../../components/purchases/PurchaseSummaryCards';
import QuickAddProductDrawer from '../../components/purchases/QuickAddProductDrawer';
import QuickAddSupplierDrawer from '../../components/purchases/QuickAddSupplierDrawer';
import PageLayout from '../../components/ui/PageLayout';
import { supplierService } from '../../services/supplierService';
import { productService } from '../../services/productService';
import { masterService } from '../../services/masterService';
import { purchaseService } from '../../services/purchaseService';
import { authService } from '../../services/authService';

export default function NewPurchasePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Auto Generated Purchase Number example PUR-20260730-00025
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
  const [notes, setNotes] = useState('');

  // Items State
  const [items, setItems] = useState([]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);
  const [apiError, setApiError] = useState(null);

  // Drawers State
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [productInitialName, setProductInitialName] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [supplierInitialName, setSupplierInitialName] = useState('');

  const currentUser = authService.getCurrentUser();
  const currentUserId = currentUser?.id || currentUser?._id;

  // Fetch Masters, Suppliers, Products
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
    queryKey: ['products'],
    queryFn: () => productService.getProducts({ isActive: 'true' }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const categories = useMemo(() => mastersData?.data?.categories || [], [mastersData]);
  const units = useMemo(() => mastersData?.data?.units || [], [mastersData]);
  const suppliers = useMemo(() => suppliersData?.data?.suppliers || [], [suppliersData]);
  const products = useMemo(() => productsData?.data?.products || [], [productsData]);

  // Live Calculations
  const totalInvoiceAmount = items.reduce((sum, item) => {
    const qty = Number(item.quantity || 0);
    const rate = Number(item.purchaseRate || 0);
    const rawSub = qty * rate;
    const discVal = Number(item.discount !== undefined && item.discount !== '' && item.discount !== null ? item.discount : (item.product?.discount ?? 0));
    const discType = item.discountType || item.product?.discountType || 'Percentage';
    const discAmt = (discType === 'Percentage' || discType === '%')
      ? (rawSub * discVal) / 100
      : discVal;
    return sum + Math.max(0, rawSub - discAmt);
  }, 0);

  const totalQty = items.reduce((sum, item) => sum + (Number(item.quantity || 0)), 0);
  const selectedSupplier = suppliers.find((s) => s._id === supplierId);

  // Handlers for Items
  const handleSelectProduct = (prod) => {
    // Fetch Default Purchase Rate from Product Master (no hardcoded fallback)
    const defaultRate = (prod.defaultPurchaseRate !== undefined && prod.defaultPurchaseRate !== null)
      ? Number(prod.defaultPurchaseRate)
      : (prod.purchasePrice !== undefined && prod.purchasePrice !== null)
      ? Number(prod.purchasePrice)
      : 0;

    const defaultSellVal = Number(prod.defaultSellingPrice ?? prod.sellingPrice ?? 0);

    // Batch Fallback Priority: Batch value -> Product basic value -> 0
    const rawProd = prod.product || prod;
    const effectiveDiscount = prod.discount !== undefined && prod.discount !== null && Number(prod.discount) !== 0
      ? prod.discount
      : (rawProd.discount ?? '');

    const effectiveDiscountType = prod.discountType || rawProd.discountType || 'Percentage';

    const effectiveGstRate = prod.gstRate !== undefined && prod.gstRate !== null
      ? prod.gstRate
      : (rawProd.gstRate ?? 0);

    const newItem = {
      tempId: Date.now() + Math.random(),
      productId: rawProd._id || rawProd.id,
      product: rawProd,
      categoryId: rawProd.categoryId?._id || rawProd.categoryId || (categories[0]?._id || ''),
      unitId: rawProd.defaultUnitId?._id || rawProd.unitId?._id || rawProd.unitId || (units[0]?._id || ''),
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
  };

  // Open Edit Product Drawer
  const handleEditProductInPurchase = (prod) => {
    setEditingProduct(prod);
    setIsAddProductOpen(true);
  };

  // Handle Product Drawer Success (Create or Edit)
  const handleProductDrawerSuccess = (updatedOrNewProd) => {
    if (editingProduct) {
      // Update existing item in items table
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

      const savedNo = res.data?.purchase?.purchaseNumber || purchaseNumber;
      setSaveSuccessMsg(`🎉 Purchase Entry ${savedNo} saved successfully! Supplier Ledger & Inventory updated.`);
      setApiError(null);

      // Reset Form
      setItems([]);
      setPaidAmount('0');
      setPurchaseNumber(generatePurchaseNo());
      setNotes('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (err) => {
      setApiError(err.message || 'Failed to save purchase entry');
      setSaveSuccessMsg(null);
    },
  });

  const handleSavePurchase = () => {
    setApiError(null);
    setSaveSuccessMsg(null);

    if (!supplierId) {
      setApiError('Please select a Supplier');
      return;
    }
    if (items.length === 0) {
      setApiError('Please add at least one product item to the purchase list');
      return;
    }

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
    setNotes('');
    setApiError(null);
    setSaveSuccessMsg(null);
  };

  return (
    <PageLayout
      title="New Purchase Entry"
      breadcrumb="Vedixa ERP > Purchase"
      icon={ShoppingBag}
    >
      {/* Success Notification Banner */}
      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2 text-[13px] font-medium shadow-2xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Error Notification Banner */}
      {apiError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2 text-[13px] font-medium shadow-2xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {/* Main Grid: Left 9 cols (Max Table Space), Right 3 cols */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Form & Table Column (9 cols for Maximum Space) */}
        <div className="lg:col-span-9 space-y-4">
          
          {/* 1. Supplier & Purchase Header Form */}
          <SupplierInvoiceForm
            suppliers={suppliers}
            supplierId={supplierId}
            setSupplierId={setSupplierId}
            purchaseNumber={purchaseNumber}
            purchaseDate={purchaseDate}
            setPurchaseDate={setPurchaseDate}
            paidAmount={paidAmount}
            setPaidAmount={setPaidAmount}
            totalInvoiceAmount={totalInvoiceAmount}
            onOpenAddSupplier={(name) => {
              setSupplierInitialName(name || '');
              setIsAddSupplierOpen(true);
            }}
          />

          {/* 2. Add Products Search & Enterprise Product Table */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200/80 shadow-2xs space-y-3">
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

          {/* 3. Notes & Bottom Actions */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200/80 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-gray-900 border-b border-gray-100 pb-1.5">
              <span className="w-4 h-4 rounded-full bg-[#00783C] text-white flex items-center justify-center text-[10px] font-medium">
                3
              </span>
              <h2 className="text-[15px] font-medium text-gray-900">Notes (Optional)</h2>
            </div>

            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any additional notes..."
              className="w-full px-2.5 py-1.5 bg-gray-50/50 border border-gray-300 rounded-lg text-[12px] text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#00783C]"
            />

            {/* Bottom Actions Toolbar */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={handleResetForm}
                className="h-8 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[12px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/purchases')}
                  className="h-8 px-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[12px] font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePurchase}
                  disabled={saveMutation.isPending}
                  className="h-8 px-5 btn-agri-primary text-white rounded-lg text-[12px] font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saveMutation.isPending ? 'Saving...' : 'Save Purchase'}</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Right Summary Column (3 cols) */}
        <div className="lg:col-span-3">
          <div className="sticky top-20">
            <PurchaseSummaryCards
              totalItemsCount={items.length}
              totalQty={totalQty}
              totalInvoiceAmount={totalInvoiceAmount}
              paidAmount={paidAmount}
              selectedSupplier={selectedSupplier}
            />
          </div>
        </div>

      </div>

      {/* Inline Create / Edit Product Drawer */}
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
        }}
      />
    </PageLayout>
  );
}
