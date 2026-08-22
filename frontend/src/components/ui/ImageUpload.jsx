import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { apiClient, getApiBaseUrl } from '../../services/apiClient';

const API_BASE_URL = getApiBaseUrl();
const SERVER_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

export default function ImageUpload({
  value,
  onChange,
  label = 'Product Image',
  endpoint = '/products/upload-image',
  fieldName = 'image',
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Compute full src for preview if value starts with /uploads
  const fullSrc = value ? (value.startsWith('/uploads') ? `${SERVER_URL}${value}` : value) : '';

  const handleFileSelected = async (file) => {
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

      const res = await apiClient.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedUrl = res.data?.imageUrl;
      if (uploadedUrl) {
        onChange(uploadedUrl);
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      setErrorMsg(err.message || 'Image upload failed. Please try again.');
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

  return (
    <div className="space-y-1 text-[12px]">
      {label && <label className="font-medium text-gray-700 block">{label}</label>}

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

      {/* Live Preview vs Upload Zone */}
      {value ? (
        <div className="p-2 bg-gray-50 border border-gray-300 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
              <img src={fullSrc} alt="Preview" className="max-h-full max-w-full object-cover rounded" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-emerald-800 block">Image Selected</span>
              <span className="text-[10px] text-gray-400 font-mono truncate max-w-[150px] block">{value}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1 text-[10px] font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Choose Image
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
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
            isDragging ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-300 bg-gray-50/50 hover:bg-emerald-50/20'
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
                <span className="font-medium text-emerald-700">Choose Image</span> or drag and drop
              </div>
              <p className="text-[10px] text-gray-400">Supported: PNG, JPG, JPEG, WEBP (Max 5 MB)</p>
            </div>
          )}
        </div>
      )}

      {errorMsg && <p className="text-[10px] text-red-500 font-normal mt-0.5">{errorMsg}</p>}
    </div>
  );
}
