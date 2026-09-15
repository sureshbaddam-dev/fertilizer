import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import BrandLogo from './BrandLogo';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // In development or test, log to console for debugging
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary caught error]:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback({
              error: this.state.error,
              reset: this.handleReset,
            })
          : this.props.fallback;
      }

      const isDev = import.meta.env.DEV;

      return (
        <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-white to-emerald-50/20 flex flex-col items-center justify-center p-4 font-sans text-slate-800">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-900/5 p-8 flex flex-col items-center text-center space-y-6">
            {/* Brand Logo Header */}
            <div className="p-2 rounded-2xl bg-white border border-emerald-100/80 shadow-2xs">
              <BrandLogo imgClassName="h-10 w-auto" />
            </div>

            {/* Error Icon */}
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-2xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            {/* Customer-Facing Clean Error Message */}
            <div className="space-y-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Something went wrong
              </h1>
              <p className="text-sm font-medium text-slate-600 max-w-sm mx-auto leading-relaxed">
                We couldn&apos;t load this page. Please try again.
              </p>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:flex-1 h-11 px-5 bg-[#047857] hover:bg-[#036046] active:scale-[0.98] text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:flex-1 h-11 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl flex items-center justify-center gap-2 border border-slate-200 transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Go to Dashboard</span>
              </button>
            </div>

            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest pt-2">
              VEDIXA Enterprise ERP
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
