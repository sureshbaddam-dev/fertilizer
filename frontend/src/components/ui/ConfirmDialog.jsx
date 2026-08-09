import React from 'react';
import { AlertTriangle, Archive, RefreshCw, X } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'archive', // 'archive' | 'restore' | 'warning'
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  const isArchive = type === 'archive';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in zoom-in-95 duration-200">
        
        {/* Header Icon & Close */}
        <div className="flex items-start justify-between">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
              isArchive
                ? 'bg-amber-50 text-amber-600 border border-amber-200/80'
                : 'bg-emerald-50 text-emerald-600 border border-emerald-200/80'
            }`}
          >
            {isArchive ? <Archive className="w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
          </div>

          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-gray-900 leading-snug">{title}</h3>
          <p className="text-xs text-gray-500 font-medium leading-relaxed">{message}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-xs font-extrabold text-white rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 ${
              isArchive
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                : 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-700/20'
            }`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>

      </div>
    </div>
  );
}
