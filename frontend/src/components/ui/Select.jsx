import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function Select({
  label,
  helper,
  error,
  className = '',
  wrapperClassName = '',
  id,
  children,
  ...props
}) {
  const inputId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className={cn('w-full space-y-1.5', wrapperClassName)}>
      {label && (
        <label htmlFor={inputId} className="form-label block font-semibold text-slate-700">
          {label}
        </label>
      )}

      <div className="relative">
        <select
          id={inputId}
          className={cn('app-select appearance-none pr-11', error && 'border-rose-400 bg-rose-50/50', className)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>

      {error && <p className="helper-text font-semibold text-rose-600">{error}</p>}
      {!error && helper && <p className="helper-text">{helper}</p>}
    </div>
  );
}
