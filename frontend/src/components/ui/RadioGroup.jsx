import React from 'react';

export default function RadioGroup({ name, options = [], value, onChange, className = '' }) {
  return (
    <div className={`grid gap-2 ${className}`}>
      {options.map((option) => (
        <label
          key={option.value}
          className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition-colors ${
            value === option.value
              ? 'border-emerald-200 bg-emerald-50/70'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange?.(option.value)}
            className="mt-1 h-4 w-4 border-slate-300 text-emerald-700"
          />
          <span className="space-y-1">
            <span className="table-body block font-semibold text-slate-900">{option.label}</span>
            {option.helper && <span className="helper-text block">{option.helper}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}
