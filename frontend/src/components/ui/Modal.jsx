import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

const MAX_WIDTHS = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-6xl',
};

export default function Modal({
  isOpen = false,
  onClose,
  title,
  subtitle,
  children,
  footer = null,
  maxWidth = 'md',
  className = '',
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClass = MAX_WIDTHS[maxWidth] || MAX_WIDTHS.md;

  return (
    <div className="app-modal-backdrop">
      <div
        className={cn(`app-modal-surface ${widthClass} my-8 transition-all`, className)}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || onClose) && (
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-5">
            <div>
              {title && <h3 className="section-title">{title}</h3>}
              {subtitle && <p className="helper-text">{subtitle}</p>}
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Body */}
        <div className="max-h-[75vh] space-y-4 overflow-y-auto p-6">{children}</div>

        {/* Footer */}
        {footer && <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 p-4 sm:p-6">{footer}</div>}
      </div>
    </div>
  );
}
