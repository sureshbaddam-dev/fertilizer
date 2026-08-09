import React from 'react';
import { Database, Download, Upload, RefreshCw } from 'lucide-react';

export default function BackupRestorePage() {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-5 font-sans text-xs">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-gray-900">Backup &amp; Restore Data</h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-3">
          <h3 className="font-extrabold text-gray-900 text-sm">Manual Database Backup</h3>
          <p className="text-gray-600 text-xs">
            Export a full JSON dump of products, inventory stock, customer ledgers, and sales invoices.
          </p>
          <button
            type="button"
            onClick={() => alert('Exporting Vedixa ERP Database Backup... Backup file downloaded.')}
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Database Backup (.JSON)</span>
          </button>
        </div>

        {/* Restore Section */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Restore Database</h3>
              <p className="text-xs text-slate-500 font-medium">
                Restore Vedixa ERP records from a previously downloaded backup JSON file.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <Upload className="w-4 h-4 text-emerald-700" />
            <span>Upload Backup File</span>
          </button>
        </div>
      </div>
    </div>
  );
}
