import React from 'react';
import { Settings } from 'lucide-react';

export default function SystemSettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl font-sans antialiased text-slate-800">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-600" />
          <span>System Environment & Infrastructure Settings</span>
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">Overview of application servers, security policies, and MongoDB database health.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">System Health & Environment</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Environment Mode</span>
            <span className="text-sm font-bold text-emerald-700 block">Production Ready</span>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Database Architecture</span>
            <span className="text-sm font-bold text-blue-700 block">MongoDB Multi-Tenant Isolated</span>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Payment Gateway</span>
            <span className="text-sm font-bold text-purple-700 block">Razorpay Test Mode Verified</span>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">User Backup Permission</span>
            <span className="text-sm font-bold text-teal-700 block">Admin-Only Generation Enforced</span>
          </div>
        </div>
      </div>
    </div>
  );
}
