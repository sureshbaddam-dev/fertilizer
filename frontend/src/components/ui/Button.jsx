import React from 'react';
import { cn } from '../../utils/cn';

const VARIANTS = {
  primary: 'btn-agri-primary text-white',
  secondary: 'btn-agri-secondary',
  danger: 'border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100',
  success: 'border border-emerald-300 bg-emerald-600 text-white hover:bg-emerald-700',
  outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  ghost: 'border border-transparent bg-transparent text-slate-700 hover:bg-slate-100',
  icon: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  floating: 'border border-emerald-700 bg-emerald-700 text-white shadow-lg shadow-emerald-700/25 hover:bg-emerald-800',
};

const SIZES = {
  sm: 'h-10 px-3 gap-1.5 text-xs',
  md: 'h-10 px-4 gap-2 text-xs font-bold',
  lg: 'h-10 px-5 gap-2 text-sm font-bold',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon: Icon = null,
  children,
  className = '',
  disabled = false,
  type = 'button',
  onClick,
  ...props
}) {
  const baseClasses =
    'button-text inline-flex items-center justify-center rounded-xl font-sans font-bold transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed select-none';
  const variantClass = VARIANTS[variant] || VARIANTS.primary;
  const sizeClass =
    variant === 'icon'
      ? 'h-10 w-10'
      : variant === 'floating'
      ? 'h-12 w-12 rounded-full'
      : SIZES[size] || SIZES.md;

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={cn(baseClasses, variantClass, sizeClass, className)}
      {...props}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className="h-[18px] w-[18px] shrink-0" />
      ) : null}
      {children && <span>{children}</span>}
    </button>
  );
}
