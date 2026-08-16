import React, { useState } from 'react';
import { AlertTriangle, X, CheckCircle2 } from 'lucide-react';

export default function TypeToConfirmModal({
  isOpen,
  onClose,
  title = 'Confirm Action',
  description,
  requiredText = 'CONFIRM',
  confirmButtonLabel = 'Confirm',
  isDestructive = true,
  onConfirm,
}) {
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const isMatched = inputText.trim() === requiredText;

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (!isMatched) return;
    setIsSubmitting(true);
    setError('');
    try {
      await onConfirm();
      setInputText('');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setInputText('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-sans antialiased text-slate-800">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${isDestructive ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
            {error}
          </div>
        )}

        <div className="text-xs text-slate-600 font-medium leading-relaxed space-y-3">
          <p>{description}</p>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Type <span className="font-mono text-red-700 font-extrabold">{requiredText}</span> to confirm:
            </label>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Type ${requiredText} here`}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-xs font-bold focus:outline-none focus:border-red-600"
              autoFocus
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isMatched || isSubmitting}
            className={`px-5 py-2.5 font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition disabled:opacity-40 disabled:cursor-not-allowed ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Processing...' : confirmButtonLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
