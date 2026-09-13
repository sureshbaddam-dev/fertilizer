import React from 'react';
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Home, ArrowLeft, FileQuestion } from 'lucide-react';
import BrandLogo from '../../components/common/BrandLogo';

export default function RouteErrorPage({ compact = false }) {
  const error = useRouteError();
  const navigate = useNavigate();
  const isDev = import.meta.env.DEV;

  let is404 = false;
  let errorMessage = "We couldn't load this page. Please try again.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      is404 = true;
      errorMessage = "The page you are looking for doesn't exist or has been moved.";
    } else if (error.statusText) {
      errorMessage = "An error occurred while loading this page. Please try again.";
    }
  } else if (error instanceof Error) {
    if (error.message?.includes('No route matches URL') || error.message?.includes('Not Found')) {
      is404 = true;
      errorMessage = "The page you are looking for doesn't exist or has been moved.";
    }
  }

  // Log error in console for debugging
  if (isDev && error) {
    console.error('[RouteErrorPage caught error]:', error);
  }

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoDashboard = () => {
    navigate('/dashboard');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  if (compact) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-4 font-sans max-w-lg mx-auto my-8">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-black text-slate-900">
            {is404 ? 'Page Not Found' : 'Something went wrong'}
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {errorMessage}
          </p>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleReload}
            className="px-4 py-2 bg-[#047857] hover:bg-[#036046] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <button
            type="button"
            onClick={handleGoDashboard}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer border border-slate-200 transition-all"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
        </div>
        {isDev && error && (
          <div className="w-full text-left pt-3 border-t border-slate-100">
            <details className="text-xs bg-rose-50/80 border border-rose-200 rounded-xl p-2.5 text-rose-900">
              <summary className="font-bold cursor-pointer select-none">
                Developer Diagnostics (Dev Only)
              </summary>
              <pre className="mt-2 text-[10px] font-mono whitespace-pre-wrap break-all overflow-x-auto p-2 bg-white rounded border border-rose-200">
                {error?.stack || error?.message || String(error)}
              </pre>
            </details>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-white to-emerald-50/20 flex flex-col items-center justify-center p-4 font-sans text-slate-800 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-900/5 p-8 flex flex-col items-center text-center space-y-6">
        {/* Brand Logo Header */}
        <div className="p-2 rounded-2xl bg-white border border-emerald-100/80 shadow-2xs">
          <BrandLogo imgClassName="h-10 w-auto" />
        </div>

        {/* Status / Category Icon */}
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xs border ${
          is404
            ? 'bg-amber-50 text-amber-600 border-amber-100'
            : 'bg-rose-50 text-rose-600 border-rose-100'
        }`}>
          {is404 ? (
            <FileQuestion className="w-7 h-7" />
          ) : (
            <AlertTriangle className="w-7 h-7" />
          )}
        </div>

        {/* Heading & Subtext */}
        <div className="space-y-2">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            {is404 ? '404 - Page Not Found' : 'Something went wrong'}
          </h1>
          <p className="text-sm font-medium text-slate-600 max-w-sm mx-auto leading-relaxed">
            {errorMessage}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
          {is404 ? (
            <>
              <button
                type="button"
                onClick={handleGoDashboard}
                className="w-full sm:flex-1 h-11 px-5 bg-[#047857] hover:bg-[#036046] active:scale-[0.98] text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Go to Dashboard</span>
              </button>

              <button
                type="button"
                onClick={handleGoBack}
                className="w-full sm:flex-1 h-11 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl flex items-center justify-center gap-2 border border-slate-200 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Go Back</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleReload}
                className="w-full sm:flex-1 h-11 px-5 bg-[#047857] hover:bg-[#036046] active:scale-[0.98] text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>

              <button
                type="button"
                onClick={handleGoDashboard}
                className="w-full sm:flex-1 h-11 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl flex items-center justify-center gap-2 border border-slate-200 transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Go to Dashboard</span>
              </button>
            </>
          )}
        </div>

        {/* Developer Diagnostics (Dev Only) */}
        {isDev && error && (
          <div className="w-full text-left pt-4 border-t border-slate-100">
            <details className="text-xs bg-rose-50/80 border border-rose-200 rounded-xl p-3 text-rose-900">
              <summary className="font-bold cursor-pointer select-none">
                Developer Diagnostics (Dev Only)
              </summary>
              <pre className="mt-2 text-[11px] font-mono whitespace-pre-wrap break-all overflow-x-auto p-2 bg-white/80 rounded border border-rose-200">
                {error?.stack || error?.message || (typeof error === 'object' ? JSON.stringify(error, null, 2) : String(error))}
              </pre>
            </details>
          </div>
        )}

        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest pt-2">
          VEDIXA Enterprise ERP
        </p>
      </div>
    </div>
  );
}
