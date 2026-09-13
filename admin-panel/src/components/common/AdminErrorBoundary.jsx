import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class AdminErrorBoundary extends React.Component {
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
    if (import.meta.env.DEV) {
      console.error('[AdminErrorBoundary caught error]:', error, errorInfo);
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

  handleGoDashboard = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/admin/dashboard';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback({ error: this.state.error, reset: this.handleReset })
          : this.props.fallback;
      }

      const isDev = import.meta.env.DEV;

      return (
        <div className="min-h-screen w-full bg-slate-900 flex flex-col items-center justify-center p-4 font-sans text-slate-100">
          <div className="w-full max-w-lg bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl p-8 flex flex-col items-center text-center space-y-6">
            {/* Error Icon */}
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20 shadow-sm">
              <AlertTriangle className="w-7 h-7" />
            </div>

            {/* Admin Message */}
            <div className="space-y-2">
              <h1 className="text-xl font-black text-white tracking-tight">
                Something went wrong
              </h1>
              <p className="text-sm font-medium text-slate-400 max-w-sm mx-auto leading-relaxed">
                We couldn&apos;t load this administrative module. Please try again.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:flex-1 h-11 px-5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoDashboard}
                className="w-full sm:flex-1 h-11 px-5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-sm rounded-xl flex items-center justify-center gap-2 border border-slate-600 transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Admin Dashboard</span>
              </button>
            </div>

            {/* Developer Diagnostics (Dev Only) */}
            {isDev && this.state.error && (
              <div className="w-full text-left pt-4 border-t border-slate-700">
                <details className="text-xs bg-slate-900 border border-slate-700 rounded-xl p-3 text-rose-300">
                  <summary className="font-bold cursor-pointer select-none">
                    Developer Diagnostics (Dev Only)
                  </summary>
                  <pre className="mt-2 text-[11px] font-mono whitespace-pre-wrap break-all overflow-x-auto p-2 bg-slate-950 rounded border border-slate-800">
                    {this.state.error?.toString()}
                    {'\n\nComponent Stack:\n'}
                    {this.state.errorInfo?.componentStack}
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

    return this.props.children;
  }
}

export default AdminErrorBoundary;
