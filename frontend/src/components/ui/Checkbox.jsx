import React from 'react';
import { cn } from '../../utils/cn';

export default function Checkbox({ label, helper, className = '', wrapperClassName = '', ...props }) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3', wrapperClassName)}>
      <input
        type="checkbox"
        className={cn('mt-1 h-4 w-4 rounded border-slate-300 text-emerald-700', className)}
        {...props}
      />
      <span className="space-y-1">
        {label && <span className="table-body block font-semibold text-slate-800">{label}</span>}
        {helper && <span className="helper-text block">{helper}</span>}
      </span>
    </label>
  );
}
