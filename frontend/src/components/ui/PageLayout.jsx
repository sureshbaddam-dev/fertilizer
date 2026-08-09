import React from 'react';
import { cn } from '../../utils/cn';

export default function PageLayout({
  title,
  subtitle,
  breadcrumb,
  action = null,
  icon: Icon = null,
  children,
  className = '',
}) {
  return (
    <div className={cn('app-page-stack w-full pb-6 space-y-3.5 sm:space-y-4 font-sans', className)}>
      {/* Global Standardized Page Top Header Banner */}
      {(title || action || breadcrumb) && (
        <div className="app-page-header bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1 min-w-0">
            {breadcrumb && (
              <p className="helper-text uppercase tracking-wide text-[10px] font-bold text-slate-400">
                {breadcrumb}
              </p>
            )}
            <div className="app-page-header-meta flex items-center gap-2">
              {Icon && (
                <div className="app-page-header-icon p-2 bg-emerald-50 text-[#047857] rounded-xl shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="page-title text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                  {title}
                </h1>
                {subtitle && (
                  <p className="helper-text text-xs text-slate-500 font-medium mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>

          {action && <div className="app-toolbar shrink-0 w-full sm:w-auto">{action}</div>}
        </div>
      )}

      {/* Main Page Content */}
      <div className="app-page-stack space-y-3.5 sm:space-y-4">{children}</div>
    </div>
  );
}
