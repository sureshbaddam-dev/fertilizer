import React from 'react';
import { cn } from '../../utils/cn';

export default function Textarea({
  label,
  helper,
  error,
  className = '',
  wrapperClassName = '',
  id,
  ...props
}) {
  const inputId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className={cn('w-full space-y-1.5', wrapperClassName)}>
      {label && (
        <label htmlFor={inputId} className="form-label block font-semibold text-slate-700">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn('app-textarea', error && 'border-rose-400 bg-rose-50/50', className)}
        {...props}
      />
      {error && <p className="helper-text font-semibold text-rose-600">{error}</p>}
      {!error && helper && <p className="helper-text">{helper}</p>}
    </div>
  );
}
