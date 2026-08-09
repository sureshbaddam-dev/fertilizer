import React from 'react';
import { cn } from '../../utils/cn';

export default function SectionHeader({
  title,
  subtitle,
  icon: Icon = null,
  action = null,
  className = '',
}) {
  return (
    <div className={cn('flex items-center justify-between gap-4 pb-1', className)}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700">
            <Icon className="h-5 w-5 text-emerald-700" />
          </div>
        )}
        <div>
          <h2 className="section-title leading-snug">
            {title}
          </h2>
          {subtitle && (
            <p className="helper-text">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
