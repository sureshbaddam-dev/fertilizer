import React from 'react';
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Home, ArrowLeft, FileQuestion } from 'lucide-react';

export default function AdminRouteErrorPage({ compact = false }) {
  const error = useRouteError();
  const navigate = useNavigate();
  const isDev = import.meta.env.DEV;

  let is404 = false;
  let errorMessage = "We couldn't load this administrative page. Please try again.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      is404 = true;
      errorMessage = "The requested admin page or module was not found.";
    } else if (error.statusText) {
      errorMessage = "An administrative error occurred. Please try again.";
    }
  } else if (error instanceof Error) {
    if (error.message?.includes('No route matches URL') || error.message?.includes('Not Found')) {
      is404 = true;
      errorMessage = "The requested admin page or module was not found.";
    }
  }

  if (isDev && error) {
    console.error('[AdminRouteErrorPage caught error]:', error);
  }

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoDashboard = () => {
    navigate('/admin/dashboard');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  if (compact) {
    return (
      <div className="p-8 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm flex flex-col items-center text-center space-y-4 font-sans max-w-lg mx-auto my-8 text-slate-100">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-black text-white">
            {is404 ? 'Module Not Found' : 'Something went wrong'}
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-1">
            {errorMessage}
          </p>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleReload}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <button
            type="button"
            onClick={handleGoDashboard}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer border border-slate-600 transition"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Admin Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-900 flex flex-col items-center justify-center p-4 font-sans text-slate-100 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl p-8 flex flex-col items-center text-center space-y-6">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border ${
          is404
            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        }`}>
          {is404 ? <FileQuestion className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-black text-white tracking-tight">
            {is404 ? '404 - Admin Page Not Found' : 'Something went wrong'}
          </h1>
          <p className="text-sm font-medium text-slate-400 max-w-sm mx-auto leading-relaxed">
            {errorMessage}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
          {is404 ? (
            <>
              <button
                type="button"
                onClick={handleGoDashboard}
                className="w-full sm:flex-1 h-11 px-5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Admin Dashboard</span>
              </button>
              <button
                type="button"
                onClick={handleGoBack}
                className="w-full sm:flex-1 h-11 px-5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-sm rounded-xl flex items-center justify-center gap-2 border border-slate-600 transition-all cursor-pointer"
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
                className="w-full sm:flex-1 h-11 px-5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
              <button
                type="button"
                onClick={handleGoDashboard}
                className="w-full sm:flex-1 h-11 px-5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-sm rounded-xl flex items-center justify-center gap-2 border border-slate-600 transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Admin Dashboard</span>
              </button>
            </>
          )}
        </div>

        {isDev && error && (
          <div className="w-full text-left pt-4 border-t border-slate-700">
            <details className="text-xs bg-slate-900 border border-slate-700 rounded-xl p-3 text-rose-300">
              <summary className="font-bold cursor-pointer select-none">
                Developer Diagnostics (Dev Only)
              </summary>
              <pre className="mt-2 text-[11px] font-mono whitespace-pre-wrap break-all overflow-x-auto p-2 bg-slate-950 rounded border border-slate-800">
                {error?.stack || error?.message || (typeof error === 'object' ? JSON.stringify(error, null, 2) : String(error))}
              </pre>
            </details>
          </div>
        )}

        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest pt-2">
          VEDIXA ERP Admin Portal
        </p>
      </div>
    </div>
  );
}
