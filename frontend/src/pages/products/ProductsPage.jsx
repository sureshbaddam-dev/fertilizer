import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Package } from 'lucide-react';
import ProductsHeaderBar from '../../components/products/ProductsHeaderBar';
import ProductsTable from '../../components/products/ProductsTable';
import ProductsRightSummary from '../../components/products/ProductsRightSummary';
import ProductDetailsDrawer from '../../components/products/ProductDetailsDrawer';
import EditProductDrawer from '../../components/products/EditProductDrawer';
import QuickAddProductDrawer from '../../components/purchases/QuickAddProductDrawer';
import PageLayout from '../../components/ui/PageLayout';
import { productService } from '../../services/productService';
import { masterService } from '../../services/masterService';
import { getAgriCategoryColor } from '../../theme/agriTheme';

export default function ProductsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Active Category Tab Filter state
  const [activeTab, setActiveTab] = useState('All Products');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selected Product & Side-by-Side Drawers State
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedViewProduct, setSelectedViewProduct] = useState(null);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [liveDraftValues, setLiveDraftValues] = useState(null);

  // Delete Confirmation Modal State
  const [selectedDeleteProduct, setSelectedDeleteProduct] = useState(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const isDeleteConfirmed = deleteConfirmInput.trim() === 'DELETE';

  // Create Product Drawer State
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);

  // Fetch Masters for Brand, Category & Unit Dropdowns
  const { data: mastersData } = useQuery({
    queryKey: ['masters-all'],
    queryFn: masterService.getAllMasters,
  });

  const suppliers = React.useMemo(() => mastersData?.data?.suppliers || [], [mastersData]);
  const brands = React.useMemo(() => mastersData?.data?.brands || [], [mastersData]);
  const categories = React.useMemo(() => mastersData?.data?.categories || [], [mastersData]);
  const units = React.useMemo(() => mastersData?.data?.units || [], [mastersData]);

  // Fetch Products List API
  const { data: productsApiData } = useQuery({
    queryKey: ['products', activeTab, searchQuery, currentPage, pageSize],
    queryFn: () => productService.getProducts({ search: searchQuery, category: activeTab !== 'All Products' ? activeTab : undefined }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch Single Product Details API when selectedProductId changes
  const { data: singleProductRes } = useQuery({
    queryKey: ['product-details', selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return null;
      const res = await productService.getProductById(selectedProductId);
      return res.data?.product || res.data;
    },
    enabled: Boolean(selectedProductId),
    staleTime: 5 * 60 * 1000,
  });

  // Sync fetched single product data to selectedViewProduct
  useEffect(() => {
    if (singleProductRes && selectedViewProduct?._id !== singleProductRes._id) {
      setSelectedViewProduct(singleProductRes);
    }
  }, [singleProductRes, selectedViewProduct?._id]);

  const displayProductsList = productsApiData?.data?.products || [];

  // Dynamic Metrics & Category Counts
  const totalProducts = displayProductsList.length;
  const activeCount = displayProductsList.filter((p) => p.isActive !== false).length;
  const lowStockCount = displayProductsList.filter((p) => {
    const stock = p.totalStock ?? p.currentStock ?? 0;
    const alert = p.minimumStockAlert ?? p.lowStockAlert ?? 10;
    return stock <= alert && stock > alert / 2;
  }).length;
  const outOfStockCount = displayProductsList.filter((p) => (p.totalStock ?? p.currentStock ?? 0) <= 0).length;

  const dynamicCategoryCounts = {
    all: totalProducts,
    fertilizers: displayProductsList.filter((p) => (p.categoryId?.name || p.category || '').toLowerCase().includes('fertilizer')).length,
    seeds: displayProductsList.filter((p) => (p.categoryId?.name || p.category || '').toLowerCase().includes('seed')).length,
    pesticides: displayProductsList.filter((p) => (p.categoryId?.name || p.category || '').toLowerCase().includes('pesticide')).length,
    others: displayProductsList.filter((p) => {
      const c = (p.categoryId?.name || p.category || '').toLowerCase();
      return !c.includes('fertilizer') && !c.includes('seed') && !c.includes('pesticide');
    }).length,
  };

  // Completely Dynamic Category Distribution from Database Products
  const categoryDistribution = React.useMemo(() => {
    if (!displayProductsList || displayProductsList.length === 0) return [];

    const totalCount = displayProductsList.length;
    const catMap = {};

    displayProductsList.forEach((p) => {
      const rawCat = p.categoryId?.name || p.category || 'Others';
      const catName = rawCat.trim() || 'Others';
      if (!catMap[catName]) {
        catMap[catName] = 0;
      }
      catMap[catName] += 1;
    });

    const list = Object.keys(catMap).map((catName) => {
      const count = catMap[catName];
      const numericPct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
      const color = getAgriCategoryColor(catName);
      return {
        name: catName,
        label: catName,
        count,
        percentage: `${numericPct}%`,
        numericPct,
        color,
      };
    });

    return list.sort((a, b) => b.count - a.count);
  }, [displayProductsList]);

  const dynamicLowStockItems = displayProductsList
    .filter((p) => {
      const stock = p.totalStock ?? p.currentStock ?? 0;
      const alert = p.minimumStockAlert ?? p.lowStockAlert ?? 10;
      return stock <= alert;
    })
    .map((p) => {
      const stock = p.totalStock ?? p.currentStock ?? 0;
      const alert = p.minimumStockAlert ?? p.lowStockAlert ?? 10;
      const unit = p.defaultUnitId?.shortName || p.unit || 'Bag';
      return {
        name: p.name,
        alertBelow: `${alert} ${unit}`,
        qty: `${stock} ${unit}`,
        color: stock <= alert / 2 ? 'text-red-600 font-bold' : 'text-amber-600 font-medium',
      };
    });

  const filteredProducts = displayProductsList.filter((p) => {
    const pCategory = p.categoryId?.name || p.category || '';
    const pName = p.name || '';
    const pBrand = p.brandId?.name || p.brand || '';

    const matchesTab = activeTab === 'All Products' || pCategory.toLowerCase().includes(activeTab.toLowerCase());
    const matchesSearch =
      !searchQuery.trim() ||
      pName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pBrand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pCategory.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  // Live Draft Merger for Real-Time Preview
  const displayProduct = React.useMemo(() => {
    if (!selectedViewProduct) return null;
    if (!liveDraftValues) return selectedViewProduct;

    const brandObj = brands.find((b) => b._id === liveDraftValues.brandId) || selectedViewProduct.brandId;
    const categoryObj = categories.find((c) => c._id === liveDraftValues.categoryId) || selectedViewProduct.categoryId;
    const unitObj = units.find((u) => u._id === liveDraftValues.unitId) || selectedViewProduct.defaultUnitId;

    return {
      ...selectedViewProduct,
      name: liveDraftValues.name !== undefined ? liveDraftValues.name : selectedViewProduct.name,
      brandId: brandObj,
      categoryId: categoryObj,
      category: categoryObj?.name || selectedViewProduct.category,
      defaultUnitId: unitObj,
      unit: unitObj?.shortName || unitObj?.name || selectedViewProduct.unit,
      defaultPurchaseRate: liveDraftValues.purchasePrice !== undefined ? liveDraftValues.purchasePrice : selectedViewProduct.defaultPurchaseRate,
      purchasePrice: liveDraftValues.purchasePrice !== undefined ? liveDraftValues.purchasePrice : selectedViewProduct.purchasePrice,
      defaultSellingPrice: liveDraftValues.sellingPrice !== undefined ? liveDraftValues.sellingPrice : selectedViewProduct.defaultSellingPrice,
      sellingPrice: liveDraftValues.sellingPrice !== undefined ? liveDraftValues.sellingPrice : selectedViewProduct.sellingPrice,
      defaultMrp: liveDraftValues.mrp !== undefined ? liveDraftValues.mrp : selectedViewProduct.defaultMrp,
      mrp: liveDraftValues.mrp !== undefined ? liveDraftValues.mrp : selectedViewProduct.mrp,
      hsnCode: liveDraftValues.hsnCode !== undefined ? liveDraftValues.hsnCode : selectedViewProduct.hsnCode,
      gstRate: liveDraftValues.gstRate !== undefined ? liveDraftValues.gstRate : selectedViewProduct.gstRate,
      minimumStockAlert: liveDraftValues.lowStockAlert !== undefined ? liveDraftValues.lowStockAlert : selectedViewProduct.minimumStockAlert,
      lowStockAlert: liveDraftValues.lowStockAlert !== undefined ? liveDraftValues.lowStockAlert : selectedViewProduct.lowStockAlert,
      description: liveDraftValues.description !== undefined ? liveDraftValues.description : selectedViewProduct.description,
      image: liveDraftValues.image || selectedViewProduct.image,
    };
  }, [selectedViewProduct, liveDraftValues, brands, categories, units]);

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: (data) => productService.updateProduct(data),
    onSuccess: (res) => {
      const updated = res.data?.product || res.data || displayProduct;
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (selectedProductId) {
        queryClient.invalidateQueries({ queryKey: ['product-details', selectedProductId] });
      }
      setSelectedViewProduct(updated);
      setIsEditingProduct(false);
      setLiveDraftValues(null);
    },
  });

  // Soft Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => productService.deactivateProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setSelectedDeleteProduct(null);
      setSelectedViewProduct(null);
      setSelectedProductId(null);
      setIsEditingProduct(false);
      setLiveDraftValues(null);
      setDeleteConfirmInput('');
    },
    onError: (err) => {
      alert(err?.response?.data?.message || err?.message || 'Failed to delete product.');
    },
  });

  const handleConfirmDelete = () => {
    if (selectedDeleteProduct && isDeleteConfirmed && !deleteMutation.isPending) {
      deleteMutation.mutate(selectedDeleteProduct._id || selectedDeleteProduct.id);
    }
  };

  const handleSelectProductRow = (p) => {
    const pId = p._id || p.id;
    setSelectedProductId(pId);
    setSelectedViewProduct(p);
    setIsEditingProduct(false);
    setLiveDraftValues(null);
  };

  const handleOpenEditProduct = (p) => {
    const pId = p._id || p.id;
    setSelectedProductId(pId);
    setSelectedViewProduct(p);
    setIsEditingProduct(true);
    setLiveDraftValues(null);
  };

  return (
    <>
      <PageLayout
        title="Products"
        breadcrumb="Vedixa ERP > Products"
        icon={Package}
      >
        <ProductsHeaderBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          filterCounts={dynamicCategoryCounts}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenFilterModal={() => {}}
        />

        <div className="flex flex-col items-start gap-4 lg:flex-row">
          <div className="w-full min-w-0 flex-1">
            <ProductsTable
              products={filteredProducts}
              totalCount={displayProductsList.length}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              onViewProduct={handleSelectProductRow}
              onEditProduct={handleOpenEditProduct}
            />
          </div>

          <div className="w-full shrink-0 lg:w-64 xl:w-68">
            <ProductsRightSummary
              summaryStats={{
                totalProducts,
                activeProducts: activeCount,
                lowStockProducts: lowStockCount,
                outOfStockProducts: outOfStockCount,
              }}
              categoryDistribution={categoryDistribution}
              lowStockItems={dynamicLowStockItems}
              onOpenAddProduct={() => setIsAddProductOpen(true)}
              onNavigateStockEntry={() => navigate('/purchases/new')}
              onNavigateLowStockReport={() => {}}
              onNavigateCategories={() => navigate('/settings/masters/categories')}
            />
          </div>
        </div>
      </PageLayout>

      {/* Dynamic Master-Detail Side-by-Side Overlay */}
      {Boolean(selectedViewProduct) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 transition-all duration-300">
          <div className={`flex items-start justify-center gap-4 w-full transition-all duration-300 ${
            isEditingProduct ? 'max-w-6xl' : 'max-w-[480px]'
          }`}>
            
            {/* 1. Left Panel: Product Details Drawer (View Mode & Live Preview) */}
            <div className={`w-full max-w-[480px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col justify-between overflow-hidden transition-all duration-300 ${
              isEditingProduct ? 'shrink-0' : 'mx-auto'
            }`}>
              <ProductDetailsDrawer
                isOpen={true}
                product={displayProduct}
                isEmbedded={true}
                onClose={() => {
                  setSelectedViewProduct(null);
                  setSelectedProductId(null);
                  setIsEditingProduct(false);
                  setLiveDraftValues(null);
                }}
                onEditProduct={() => {
                  setIsEditingProduct(true);
                  setLiveDraftValues(null);
                }}
                onDeleteProduct={(p) => setSelectedDeleteProduct(p)}
              />
            </div>

            {/* 2. Right Panel: Edit Product Form (Opens Side-by-Side when isEditingProduct === true) */}
            {isEditingProduct && (
              <div className="w-full max-w-[620px] shrink-0 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
                <EditProductDrawer
                  isOpen={true}
                  product={selectedViewProduct}
                  suppliers={suppliers}
                  brands={brands}
                  categories={categories}
                  units={units}
                  isEmbedded={true}
                  onClose={() => {
                    setIsEditingProduct(false);
                    setLiveDraftValues(null);
                  }}
                  onDraftChange={(draft) => setLiveDraftValues(draft)}
                  onSave={(data) => updateMutation.mutate(data)}
                />
              </div>
            )}

          </div>
        </div>
      )}

      {/* Create Product Drawer */}
      <QuickAddProductDrawer
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['products'] });
          setIsAddProductOpen(false);
        }}
      />

      {/* Soft Delete Safety Confirmation Modal */}
      {selectedDeleteProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 border border-gray-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900">Delete Product?</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Are you sure you want to delete <strong className="text-gray-900">{selectedDeleteProduct.name}</strong>? This action will remove it from active screens while preserving all historical data and invoice references.
                </p>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-semibold text-gray-700 block">
                To confirm deletion, type <span className="font-mono font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">DELETE</span> below:
              </label>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder="Type DELETE"
                className="w-full h-9 px-3 text-xs font-mono font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-white"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isDeleteConfirmed && !deleteMutation.isPending) {
                    handleConfirmDelete();
                  }
                }}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setSelectedDeleteProduct(null);
                  setDeleteConfirmInput('');
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={!isDeleteConfirmed || deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium shadow-2xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
