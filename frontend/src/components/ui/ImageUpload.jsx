import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UploadCloud, Image as ImageIcon, X, Loader2, Sparkles, Search, Check } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { productService } from '../../services/productService';
import { normalizeImageUrl } from '../../utils/imageUtils';
import CloudinaryProductImageModal from '../products/CloudinaryProductImageModal';

export default function ImageUpload({
  value,
  onChange,
  label = 'Product Image',
  endpoint = '/products/upload-image',
  fieldName = 'image',
  productName = '',
  brand = '',
  category = '',
  onSelectImageDetails,
}) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const fileInputRef = useRef(null);

  // Compute full src for preview using centralized normalizer
  const fullSrc = normalizeImageUrl(value);

  // Non-blocking query to check if matching images exist in Shared Library for current productName
  const { data: libraryMatches } = useQuery({
    queryKey: ['cloudinary-product-image-matches', productName, brand],
    queryFn: () => (productName?.trim().length >= 2 ? productService.searchCloudinaryProductImages({ query: productName, brand, limit: 4 }) : null),
    enabled: Boolean(productName && productName.trim().length >= 2 && !value),
    staleTime: 60 * 1000,
  });

  const matchingImages = libraryMatches?.data?.images || libraryMatches?.images || [];
  const matchCount = matchingImages.length;

  const [duplicateConfirmData, setDuplicateConfirmData] = useState(null); // { file, existingAsset }

  const handleFileSelected = async (file, options = {}) => {
    if (!file) return;

    // Validate size (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File size exceeds maximum 5 MB limit');
      return;
    }

    // Validate type (PNG, JPG, JPEG, WEBP)
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Only PNG, JPG, JPEG, and WEBP images are supported (SVG disabled for security)');
      return;
    }

    setErrorMsg(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append(fieldName, file);
      if (productName) formData.append('productName', productName);
      if (brand) formData.append('brand', brand);
      if (category) formData.append('category', category);

      let targetEndpoint = endpoint;
      if (options.forceUpload) {
        targetEndpoint += (targetEndpoint.includes('?') ? '&' : '?') + 'forceUpload=true';
      }

      const res = await apiClient.post(targetEndpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedUrl = res.data?.imageUrl || res.data?.data?.imageUrl;
      if (uploadedUrl) {
        onChange(uploadedUrl);
        queryClient.invalidateQueries({ queryKey: ['cloudinary-product-images-search'] });
        queryClient.invalidateQueries({ queryKey: ['cloudinary-product-image-matches'] });
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      const isExactDuplicate =
        err.code === 'EXACT_DUPLICATE_IMAGE' ||
        err.isExactDuplicate ||
        err.statusCode === 409 ||
        err.response?.data?.isExactDuplicate ||
        err.response?.status === 409;

      const duplicateAsset = err.duplicate || err.response?.data?.duplicate || err.existingAsset || err.response?.data?.existingAsset;

      if (isExactDuplicate && duplicateAsset) {
        setDuplicateConfirmData({ file, duplicate: duplicateAsset });
      } else {
        setErrorMsg(err.message || 'Image upload failed. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const matchedDuplicate = duplicateConfirmData?.duplicate || {};
  const duplicateImgUrl =
    matchedDuplicate?.secureUrl ||
    matchedDuplicate?.url ||
    matchedDuplicate?.imageUrl ||
    (matchedDuplicate?.existingAsset && (matchedDuplicate.existingAsset.secure_url || matchedDuplicate.existingAsset.url));

  const duplicateDisplayName =
    matchedDuplicate.productName ||
    matchedDuplicate.metadata?.productName ||
    matchedDuplicate.metadata?.product_name ||
    matchedDuplicate.displayName ||
    matchedDuplicate.display_name ||
    matchedDuplicate.filename ||
    matchedDuplicate.publicId ||
    matchedDuplicate.public_id ||
    'Existing Product Image';

  const productNameValue = (
    matchedDuplicate.productName ||
    matchedDuplicate.metadata?.productName ||
    matchedDuplicate.metadata?.product_name ||
    matchedDuplicate.displayName ||
    matchedDuplicate.display_name ||
    ''
  ).trim();

  const brandValue = (
    matchedDuplicate.brand ||
    matchedDuplicate.metadata?.brand ||
    matchedDuplicate.metadata?.brand_name ||
    ''
  ).trim();

  const categoryValue = (
    matchedDuplicate.category ||
    matchedDuplicate.metadata?.category ||
    matchedDuplicate.metadata?.category_name ||
    ''
  ).trim();

  const unitValue = (
    matchedDuplicate.unit ||
    matchedDuplicate.metadata?.unit ||
    matchedDuplicate.metadata?.unit_name ||
    ''
  ).trim();

  return (
    <div className="space-y-1.5 text-[12px]">
      <div className="flex items-center justify-between">
        {label && <label className="font-medium text-gray-700 block">{label}</label>}
        <button
          type="button"
          onClick={() => setIsLibraryOpen(true)}
          className="text-[11px] font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1 hover:underline cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Search Shared Library</span>
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp,image/jpg"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelected(e.target.files[0]);
          }
        }}
        className="hidden"
      />

      {/* Similar Image Detection Banner */}
      {!value && matchCount > 0 && (
        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-[11px] text-emerald-900 animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">
              <strong>{matchCount}</strong> existing image{matchCount === 1 ? '' : 's'} found in library
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsLibraryOpen(true)}
            className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-bold shrink-0 cursor-pointer transition-colors"
          >
            Reuse Image
          </button>
        </div>
      )}

      {/* Live Preview vs Upload Zone */}
      {value ? (
        <div className="p-2 bg-gray-50 border border-gray-300 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
              <img src={fullSrc} alt="Preview" className="max-h-full max-w-full object-cover rounded" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-800 block">Image Attached</span>
              <span className="text-[10px] text-emerald-600 font-medium block">Shared catalog image</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsLibraryOpen(true)}
              className="px-2 py-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <Search className="w-3 h-3" />
              <span>Change</span>
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50 transition-colors cursor-pointer"
              title="Remove Image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-colors ${isDragging ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-300 bg-gray-50/50 hover:bg-emerald-50/20'
              }`}
          >
            {isUploading ? (
              <div className="flex items-center justify-center gap-1.5 py-1 text-emerald-700 text-[11px] font-medium">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading Image...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-1">
                <UploadCloud className="w-5 h-5 text-gray-400" />
                <div className="text-[11px] text-gray-600">
                  <span className="font-medium text-emerald-700">Choose Image File</span> or drag and drop
                </div>
                <p className="text-[10px] text-gray-400">Supported: PNG, JPG, JPEG, WEBP (Max 5 MB)</p>
              </div>
            )}
          </div>
        </div>
      )}

      {errorMsg && <p className="text-[10px] text-red-500 font-normal mt-0.5">{errorMsg}</p>}

      {/* Exact Duplicate Image Confirmation Modal */}
      {duplicateConfirmData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col md:flex-row max-h-[90vh]">

            {/* LEFT SIDE: Prominent Large Image Preview (45-50% width on Desktop, Stacked Top on Mobile) */}
            <div className="md:w-1/2 bg-slate-50 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-200 relative min-h-[260px] md:min-h-[380px]">
              <div className="w-full h-full flex items-center justify-center p-3 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                {duplicateImgUrl ? (
                  <img
                    src={duplicateImgUrl}
                    alt={duplicateDisplayName}
                    className="max-w-full max-h-[300px] md:max-h-[360px] object-contain rounded-lg transition-transform duration-200 hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 p-8 space-y-2">
                    <ImageIcon className="w-12 h-12 stroke-[1.5]" />
                    <span className="text-xs font-medium">Image Preview Unavailable</span>
                  </div>
                )}
              </div>
              <div className="mt-3 text-center">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  Exact SHA-256 Content Match
                </span>
              </div>
            </div>

            {/* RIGHT SIDE: Details & Actions (50-55% width on Desktop) */}
            <div className="md:w-1/2 p-6 flex flex-col justify-between space-y-5 bg-white overflow-y-auto">

              {/* Header */}
              <div className="space-y-3.5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-100 rounded-xl text-amber-700 shrink-0">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base leading-tight">Exact Duplicate Found</h3>
                      <p className="text-[11px] text-amber-700 font-semibold">Identical binary image detected</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDuplicateConfirmData(null)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed border-b border-gray-100 pb-3">
                  This exact image file already exists in your product image library. Check the visual preview on the left to verify if you want to use the existing image or upload another copy.
                </p>

                {/* Matched Asset Metadata Card */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">MATCHED ASSET DETAILS</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      SHA-256 Verified Match
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-0.5">
                    {/* Product Name */}
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">PRODUCT NAME</span>
                      <div className="font-extrabold text-slate-900 text-sm md:text-base leading-tight truncate" title={productNameValue || 'Not available'}>
                        {productNameValue || <span className="text-slate-400 font-normal italic">Not available</span>}
                      </div>
                    </div>

                    {/* Compact Single Line Metadata Row */}
                    <div className="flex items-center gap-2 flex-wrap text-xs text-slate-700 font-medium pt-1.5 border-t border-slate-200/60">
                      <span>
                        <strong className="text-slate-500 font-semibold">Brand:</strong>{' '}
                        {brandValue ? (
                          <span className="text-slate-900 font-bold">{brandValue}</span>
                        ) : (
                          <span className="text-slate-400 italic">Not available</span>
                        )}
                      </span>

                      <span className="text-slate-300 font-bold">•</span>

                      <span>
                        <strong className="text-slate-500 font-semibold">Category:</strong>{' '}
                        {categoryValue ? (
                          <span className="text-slate-900 font-bold">{categoryValue}</span>
                        ) : (
                          <span className="text-slate-400 italic">Not available</span>
                        )}
                      </span>

                      <span className="text-slate-300 font-bold">•</span>

                      <span>
                        <strong className="text-slate-500 font-semibold">Unit:</strong>{' '}
                        {unitValue ? (
                          <span className="text-slate-900 font-bold">{unitValue}</span>
                        ) : (
                          <span className="text-slate-400 italic">Not available</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-100 space-y-2">
                <div className="flex flex-col sm:flex-row items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDuplicateConfirmData(null)}
                    className="w-full sm:w-auto px-3.5 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const dup = matchedDuplicate || {};
                      const selectedObj = {
                        imageUrl: dup.imageUrl || dup.secureUrl || dup.url,
                        secureUrl: dup.secureUrl || dup.imageUrl || dup.url,
                        productName: productNameValue,
                        brand: brandValue,
                        category: categoryValue,
                        unit: unitValue,
                        sha256: dup.sha256 || '',
                      };
                      onChange(selectedObj.imageUrl);
                      if (onSelectImageDetails) {
                        onSelectImageDetails(selectedObj);
                      }
                      setDuplicateConfirmData(null);
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer text-center flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Use Existing Image</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const fileToUpload = duplicateConfirmData.file;
                      setDuplicateConfirmData(null);
                      if (fileToUpload) {
                        handleFileSelected(fileToUpload, { forceUpload: true });
                      }
                    }}
                    className="w-full sm:w-auto px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300/80 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-center"
                  >
                    Upload Anyway
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Shared Image Library Search Modal */}
      <CloudinaryProductImageModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        initialQuery={productName}
        brand={brand}
        category={category}
        onSelectImage={(imgData) => {
          onChange(imgData.imageUrl);
          if (onSelectImageDetails && typeof onSelectImageDetails === 'function') {
            onSelectImageDetails(imgData);
          }
        }}
      />
    </div>
  );
}
