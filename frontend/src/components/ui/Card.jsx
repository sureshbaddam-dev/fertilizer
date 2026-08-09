import React from 'react';
import { cn } from '../../utils/cn';

export default function Card({
  title,
  subtitle,
  icon: Icon = null,
  action = null,
  children,
  footer = null,
  className = '',
  ...props
}) {
  return (
    <div
      className={cn('app-card flex flex-col justify-between', className)}
      {...props}
    >
      <div className="space-y-4">
        {/* Header Section */}
        {(title || action) && (
          <div className="app-card-header">
            <div className="flex items-center gap-2.5">
              {Icon && (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700">
                  <Icon className="h-5 w-5 text-emerald-700" />
                </div>
              )}
              <div>
                {title && <h3 className="card-title">{title}</h3>}
                {subtitle && <p className="helper-text">{subtitle}</p>}
              </div>
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
        )}

        {/* Body Content */}
        <div>{children}</div>
      </div>

      {/* Footer Section */}
      {footer && <div className="mt-4 border-t border-slate-100 pt-4">{footer}</div>}
    </div>
  );
}
