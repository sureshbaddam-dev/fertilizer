import React from 'react';
import { cn } from '../../utils/cn';

export default function Input({
  label,
  error,
  helper,
  icon: Icon = null,
  className = '',
  wrapperClassName = '',
  id,
  type = 'text',
  ...props
}) {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className={`space-y-1.5 w-full ${wrapperClassName}`}>
      {label && (
        <label htmlFor={inputId} className="form-label block font-semibold text-slate-700">
          {label}
        </label>
      )}
      <div className="relative w-full">
        {Icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          id={inputId}
          type={type}
          className={cn(
            'app-input',
            Icon ? 'pl-10' : 'pl-4',
            error && 'border-rose-400 bg-rose-50/50',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="helper-text font-semibold text-rose-600">{error}</p>}
      {!error && helper && <p className="helper-text">{helper}</p>}
    </div>
  );
}
