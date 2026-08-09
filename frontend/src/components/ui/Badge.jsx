import React from 'react';

const VARIANTS = {
  active: 'bg-emerald-50 text-[#047857] border-emerald-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  lowstock: 'bg-amber-50 text-amber-800 border-amber-300',
  warning: 'bg-amber-50 text-amber-800 border-amber-300',
  critical: 'bg-rose-50 text-rose-700 border-rose-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  default: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function Badge({ variant = 'default', children, className = '' }) {
  const variantClass = VARIANTS[variant] || VARIANTS.default;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[13px] font-semibold border whitespace-nowrap shrink-0 ${variantClass} ${className}`}
    >
      {children}
    </span>
  );
}
