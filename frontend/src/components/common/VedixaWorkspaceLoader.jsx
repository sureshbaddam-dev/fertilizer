import React from 'react';
import BrandLogo from './BrandLogo';

export default function VedixaWorkspaceLoader({
  message = 'Preparing your workspace...',
  subtext = 'Initializing secure ERP session',
  compact = false,
}) {
  if (compact) {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-3 font-sans">
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-100 border-t-emerald-600 animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-xs font-bold text-slate-700">{message}</p>
          {subtext && <p className="text-[11px] text-slate-400 mt-0.5">{subtext}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-white to-emerald-50/20 flex flex-col items-center justify-center p-4 font-sans text-slate-800 animate-in fade-in duration-200">
      {/* Centered Glass Card */}
      <div className="w-full max-w-sm bg-white/90 backdrop-blur-md rounded-3xl border border-emerald-100/80 shadow-xl shadow-emerald-900/5 p-8 flex flex-col items-center text-center space-y-5">
        {/* Brand Mark with Ambient Shimmer Ring */}
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-2.5 rounded-2xl bg-emerald-500/10 blur-md animate-pulse" />
          <div className="relative p-2 rounded-2xl bg-white border border-emerald-100/60 shadow-2xs">
            <BrandLogo imgClassName="h-10 w-auto" />
          </div>
        </div>

        {/* Loading Headings */}
        <div className="space-y-1">
          <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
            {message}
          </h2>
          {subtext && (
            <p className="text-xs font-medium text-slate-500">
              {subtext}
            </p>
          )}
        </div>

        {/* Sleek Horizontal Indeterminate Progress Bar */}
        <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
          <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full w-24 animate-[progressPulse_1.4s_ease-in-out_infinite]" />
        </div>

        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest pt-1">
          VEDIXA Enterprise ERP
        </p>
      </div>

      <style>{`
        @keyframes progressPulse {
          0% {
            left: -30%;
            width: 30%;
          }
          50% {
            left: 35%;
            width: 50%;
          }
          100% {
            left: 100%;
            width: 30%;
          }
        }
      `}</style>
    </div>
  );
}
