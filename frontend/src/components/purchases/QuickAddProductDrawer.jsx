import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, Sparkles, Plus, Check } from 'lucide-react';
import FormDrawer from '../ui/FormDrawer';
import SmartMasterSelect from '../ui/SmartMasterSelect';
import ImageUpload from '../ui/ImageUpload';
import { productService } from '../../services/productService';
import { masterService } from '../../services/masterService';
import { authService } from '../../services/authService';

import { applySelectedImageMetadata } from '../../utils/imageMetadataHelper';

const ImageUploadControlled = ({ control, field, onSelectImageDetails }) => {
  const productName = useWatch({ control, name: 'name' });
  return (
    <ImageUpload
      label="Product Image"
      value={field.value}
      onChange={field.onChange}
      endpoint="/products/upload-image"
      fieldName="image"
      productName={productName}
      onSelectImageDetails={onSelectImageDetails}
    />
  );
};

const productSchema = z.object({
  image: z.string().optional(),
  name: z.string().min(2, 'Product name is required'),
  code: z.string().optional(),
  barcode: z.string().optional(),
  supplierId: z.string().optional(),
  brandId: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  unitId: z.string().min(1, 'Unit is required'),
  discount: z.union([z.string(), z.number()]).optional(),
  discountType: z.string().optional(),
  gstRate: z.union([z.string(), z.number()]).optional(),
  minStockAlert: z.union([z.string(), z.number()]).optional(),
});

const toInputValue = (val) => (val === 0 || val === '0' || val === null || val === undefined ? '' : String(val));

export default function QuickAddProductDrawer({
  isOpen,
  onClose,
  onSuccess,
  initialName = '',
  editingProduct = null,
}) {
  const queryClient = useQueryClient();
  const isEditMode = Boolean(editingProduct);
  const currentUser = authService.getCurrentUser();
  const currentUserId = currentUser?.id || currentUser?._id;

  const [unmatchedBrand, setUnmatchedBrand] = useState('');
  const [unmatchedCategory, setUnmatchedCategory] = useState('');
  const [unmatchedUnit, setUnmatchedUnit] = useState('');
  const [isCreatingMaster, setIsCreatingMaster] = useState(false);

  const { data: mastersData, isLoading: isMastersLoading } = useQuery({
    queryKey: ['masters-all', currentUserId],
    queryFn: masterService.getAllMasters,
    enabled: Boolean(isOpen && currentUserId),
  });

  const suppliers = mastersData?.data?.suppliers || [];
  const brands = mastersData?.data?.brands || [];
  const categories = mastersData?.data?.categories || [];
  const units = mastersData?.data?.units || [];

  const {
    register,
    handleSubmit,
    control,
    watch,
    getValues,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      image: '',
      name: initialName,
      code: '',
      barcode: '',
      supplierId: '',
      brandId: '',
      categoryId: '',
      unitId: '',
      discount: '',
      discountType: 'Percentage',
      gstRate: '',
      minStockAlert: '10',
    },
  });

  const handleSharedImageSelect = (imgData) => {
    if (!imgData) return;
    const currentTypedName = getValues('name');
    applySelectedImageMetadata(
      imgData,
      { brands, categories, units },
      (fieldName, val) => setValue(fieldName, val, { shouldValidate: true, shouldDirty: true, shouldTouch: true }),
      { setUnmatchedBrand, setUnmatchedCategory, setUnmatchedUnit },
      { currentName: currentTypedName }
    );
  };

  // Pre-fill form when drawer opens or editingProduct / initialName changes
  useEffect(() => {
    if (!isOpen) return;

    setUnmatchedBrand('');
    setUnmatchedCategory('');
    setUnmatchedUnit('');

    if (editingProduct) {
      const supplierIdVal = editingProduct.supplierId?._id || editingProduct.supplierId || '';
      const brandIdVal = editingProduct.brandId?._id || editingProduct.brandId || '';
      const categoryIdVal = editingProduct.categoryId?._id || editingProduct.categoryId || '';
      const unitIdVal = editingProduct.defaultUnitId?._id || editingProduct.defaultUnitId || editingProduct.unitId?._id || editingProduct.unitId || '';

      reset({
        image: editingProduct.image || '',
        name: editingProduct.name || '',
        code: editingProduct.code || '',
        barcode: editingProduct.barcode || '',
        supplierId: supplierIdVal,
        brandId: brandIdVal,
        categoryId: categoryIdVal,
        unitId: unitIdVal,
        discount: toInputValue(editingProduct.discount),
        discountType: editingProduct.discountType || 'Percentage',
        gstRate: toInputValue(editingProduct.gstRate),
        minStockAlert: toInputValue(editingProduct.minimumStockAlert || 10),
      });
    } else {
      reset({
        image: '',
        name: initialName || '',
        code: '',
        barcode: '',
        supplierId: '',
        brandId: '',
        categoryId: '',
        unitId: '',
        discount: '',
        discountType: 'Percentage',
        gstRate: '',
        minStockAlert: '10',
      });
    }
  }, [isOpen, editingProduct?._id, editingProduct?.id, initialName]);

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: productService.createProduct,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['topbar-top-selling-products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      queryClient.invalidateQueries({ queryKey: ['masters-all'] });
      reset();
      onClose();
      if (onSuccess && res.data?.product) {
        onSuccess(res.data.product);
      }
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: (data) => productService.updateProduct({ id: editingProduct._id, ...data }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['topbar-top-selling-products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      queryClient.invalidateQueries({ queryKey: ['masters-all'] });
      reset();
      onClose();
      if (onSuccess && res.data?.product) {
        onSuccess(res.data.product);
      }
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (formData) => {
    const payload = {
      ...formData,
      discount: formData.discount === '' || formData.discount === undefined ? 0 : Number(formData.discount),
      discountType: formData.discountType || 'Percentage',
      gstRate: formData.gstRate === '' || formData.gstRate === undefined ? 0 : Number(formData.gstRate),
      minimumStockAlert: formData.minStockAlert === '' || formData.minStockAlert === undefined ? 10 : Number(formData.minStockAlert),
    };

    if (isEditMode) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleCreateBrandInline = async (typedName) => {
    const res = await masterService.createBrand({ name: typedName });
    await queryClient.invalidateQueries({ queryKey: ['masters-all'] });
    const brandDoc = res.data?.data || res.data?.brand || res.data?.company || res.data;
    return brandDoc;
  };

  const handleCreateCategoryInline = async (typedName) => {
    const res = await masterService.createCategory({ name: typedName });
    await queryClient.invalidateQueries({ queryKey: ['masters-all'] });
    const categoryDoc = res.data?.data || res.data?.category || res.data;
    return categoryDoc;
  };

  const handleCreateUnitInline = async (typedName) => {
    const res = await masterService.createUnit({ name: typedName, shortName: typedName.toLowerCase().slice(0, 3) });
    await queryClient.invalidateQueries({ queryKey: ['masters-all'] });
    const unitDoc = res.data?.data || res.data?.unit || res.data;
    return unitDoc;
  };

  const handleAddUnmatchedBrand = async () => {
    if (!unmatchedBrand || isCreatingMaster) return;
    try {
      setIsCreatingMaster(true);
      const newBrand = await handleCreateBrandInline(unmatchedBrand);
      if (newBrand && newBrand._id) {
        setValue('brandId', newBrand._id, { shouldValidate: true, shouldDirty: true });
      }
      setUnmatchedBrand('');
    } catch (err) {
      console.error('Failed to add brand:', err);
    } finally {
      setIsCreatingMaster(false);
    }
  };

  const handleAddUnmatchedCategory = async () => {
    if (!unmatchedCategory || isCreatingMaster) return;
    try {
      setIsCreatingMaster(true);
      const newCat = await handleCreateCategoryInline(unmatchedCategory);
      if (newCat && newCat._id) {
        setValue('categoryId', newCat._id, { shouldValidate: true, shouldDirty: true });
      }
      setUnmatchedCategory('');
    } catch (err) {
      console.error('Failed to add category:', err);
    } finally {
      setIsCreatingMaster(false);
    }
  };

  const handleAddUnmatchedUnit = async () => {
    if (!unmatchedUnit || isCreatingMaster) return;
    try {
      setIsCreatingMaster(true);
      const newUnit = await handleCreateUnitInline(unmatchedUnit);
      if (newUnit && newUnit._id) {
        setValue('unitId', newUnit._id, { shouldValidate: true, shouldDirty: true });
      }
      setUnmatchedUnit('');
    } catch (err) {
      console.error('Failed to add unit:', err);
    } finally {
      setIsCreatingMaster(false);
    }
  };

  return (
    <FormDrawer
      isOpen={isOpen}
      title={isEditMode ? '✏️ Edit Product' : '📦 Create New Product'}
      description={isEditMode ? 'Update product details in master catalog' : 'Register a new product in master catalog'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 text-xs">
        {/* 1. Product Image Upload with Preview */}
        <Controller
          name="image"
          control={control}
          render={({ field }) => (
            <ImageUploadControlled
              control={control}
              field={field}
              onSelectImageDetails={handleSharedImageSelect}
            />
          )}
        />

        {/* 2. Product Name * */}
        <div className="space-y-1">
          <label className="font-medium text-gray-700 block">Product Name *</label>
          <input
            type="text"
            {...register('name')}
            placeholder="e.g. Coragen 50ml, Urea 45kg Bag"
            className="w-full px-3 py-2 bg-gray-50/50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-[13px]"
          />
          {errors.name && <p className="text-[10px] text-red-500 font-medium">{errors.name.message}</p>}
        </div>

        {/* 3. Brand (Master) */}
        <div className="space-y-1">
          <Controller
            name="brandId"
            control={control}
            render={({ field }) => (
              <SmartMasterSelect
                label="Brand Master"
                options={brands}
                value={field.value}
                onChange={(val) => {
                  field.onChange(val);
                  if (val) setUnmatchedBrand('');
                }}
                onAddNew={handleCreateBrandInline}
                placeholder="Select Brand..."
                isLoading={isMastersLoading}
                error={errors.brandId?.message}
              />
            )}
          />
          {unmatchedBrand && (
            <div className="p-2 bg-emerald-50/90 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-1.5 font-medium truncate">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Image Brand: <strong>"{unmatchedBrand}"</strong></span>
              </div>
              <button
                type="button"
                onClick={handleAddUnmatchedBrand}
                disabled={isCreatingMaster}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-md transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add "{unmatchedBrand}" to Master</span>
              </button>
            </div>
          )}
        </div>

        {/* 4. Category * */}
        <div className="space-y-1">
          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <SmartMasterSelect
                label="Category *"
                options={categories}
                value={field.value}
                onChange={(val) => {
                  field.onChange(val);
                  if (val) setUnmatchedCategory('');
                }}
                onAddNew={handleCreateCategoryInline}
                placeholder="Select Category..."
                isLoading={isMastersLoading}
                error={errors.categoryId?.message}
              />
            )}
          />
          {unmatchedCategory && (
            <div className="p-2 bg-emerald-50/90 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-1.5 font-medium truncate">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Image Category: <strong>"{unmatchedCategory}"</strong></span>
              </div>
              <button
                type="button"
                onClick={handleAddUnmatchedCategory}
                disabled={isCreatingMaster}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-md transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add "{unmatchedCategory}" to Master</span>
              </button>
            </div>
          )}
        </div>

        {/* 5. Unit * */}
        <div className="space-y-1">
          <Controller
            name="unitId"
            control={control}
            render={({ field }) => (
              <SmartMasterSelect
                label="Unit *"
                options={units}
                value={field.value}
                onChange={(val) => {
                  field.onChange(val);
                  if (val) setUnmatchedUnit('');
                }}
                onAddNew={handleCreateUnitInline}
                placeholder="Select Unit..."
                isLoading={isMastersLoading}
                error={errors.unitId?.message}
              />
            )}
          />
          {unmatchedUnit && (
            <div className="p-2 bg-emerald-50/90 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-1.5 font-medium truncate">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Image Unit: <strong>"{unmatchedUnit}"</strong></span>
              </div>
              <button
                type="button"
                onClick={handleAddUnmatchedUnit}
                disabled={isCreatingMaster}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-md transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add "{unmatchedUnit}" to Master</span>
              </button>
            </div>
          )}
        </div>

        {/* 6. Discount & GST Row */}
        <div className="grid grid-cols-3 gap-2.5 p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-gray-700 block">Discount</label>
            <Controller
              name="discount"
              control={control}
              render={({ field }) => (
                <input
                  type="number"
                  step="0.01"
                  onFocus={(e) => e.target.select()}
                  value={toInputValue(field.value)}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder="0"
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-md text-xs font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              )}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-gray-700 block">Discount Type</label>
            <Controller
              name="discountType"
              control={control}
              render={({ field }) => (
                <div className="relative">
                  <select
                    value={field.value || 'Percentage'}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="w-full px-2.5 pr-7 py-1.5 bg-white border border-gray-300 rounded-md text-xs font-medium text-gray-900 appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Amount">Fixed Amount (₹)</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              )}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-gray-700 block">GST Rate (%)</label>
            <Controller
              name="gstRate"
              control={control}
              render={({ field }) => (
                <input
                  type="number"
                  step="0.01"
                  onFocus={(e) => e.target.select()}
                  value={toInputValue(field.value)}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder="0"
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-md text-xs font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              )}
            />
          </div>
        </div>

        {/* 7. Minimum Stock Alert */}
        <div className="space-y-1">
          <label className="font-medium text-gray-700 block flex items-center justify-between">
            <span>Minimum Stock Alert</span>
            <span className="text-[10px] text-gray-400 font-normal">(Low Stock Notification)</span>
          </label>
          <Controller
            name="minStockAlert"
            control={control}
            render={({ field }) => (
              <input
                type="number"
                onFocus={(e) => e.target.select()}
                value={toInputValue(field.value)}
                onChange={(e) => field.onChange(e.target.value)}
                placeholder="10"
                className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-300 rounded-lg text-gray-800 font-medium text-[12px] font-mono"
              />
            )}
          />
        </div>

        {/* Form Footer Action Buttons */}
        <div className="pt-4 flex items-center justify-end gap-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-[12px] font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2 text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg text-[12px] font-medium shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isPending ? 'Saving...' : isEditMode ? 'Update Product' : 'Save & Select Product'}
          </button>
        </div>
      </form>
    </FormDrawer>
  );
}
