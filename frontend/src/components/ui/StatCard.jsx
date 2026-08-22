import React from 'react';
import { cn } from '../../utils/cn';

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon = null,
  trend = null,
  trendColor = 'emerald',
  className = '',
  onClick = null,
}) {
  const trendBg =
    trendColor === 'rose'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : trendColor === 'amber'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  return (
    <div
      onClick={onClick}
      className={cn(
        'app-card p-3.5 space-y-2',
        onClick ? 'cursor-pointer select-none transition-all duration-150' : '',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{title}</span>
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
            <Icon className="h-4 w-4 text-emerald-700" />
          </div>
        )}
      </div>

      <div className="space-y-0.5">
        <p className="font-mono text-xl font-black leading-tight text-slate-900">{value}</p>
        <div className="flex items-center justify-between gap-2">
          {subtitle && <span className="helper-text text-[11px] truncate">{subtitle}</span>}
          {trend && <span className={`app-status-badge text-[10px] shrink-0 ${trendBg}`}>{trend}</span>}
        </div>
      </div>
    </div>
  );
}
