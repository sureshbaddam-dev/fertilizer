import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, ShieldCheck, RefreshCw } from 'lucide-react';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { adminApiService } from '../../services/adminApiService';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await adminApiService.getAuditLogs();
      setLogs(data || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const columns = [
    { header: 'Action', key: 'action', render: (row) => <span className="font-extrabold text-emerald-400">{row.action}</span> },
    { header: 'Admin Name', key: 'adminName', render: (row) => <span className="font-extrabold text-white">{row.adminName}</span> },
    { header: 'Admin Role', key: 'adminRole', render: (row) => <StatusBadge status={row.adminRole} /> },
    { header: 'Target Type', key: 'targetType', render: (row) => <span className="text-[10px] font-bold text-slate-400 uppercase">{row.targetType}</span> },
    { header: 'Details & Rationale', key: 'details', render: (row) => <span className="text-xs text-slate-300 font-medium">{row.details}</span> },
    { header: 'IP Address', key: 'ipAddress', render: (row) => <span className="font-mono text-slate-500 text-[10px]">{row.ipAddress || '127.0.0.1'}</span> },
    { header: 'Timestamp', key: 'createdAt', render: (row) => new Date(row.createdAt).toLocaleString('en-IN') },
  ];

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            <span>Immutable Admin Audit Trail Logs</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">Read-only security logs recording every admin login, subscription grant, backup creation, and setting modification.</p>
        </div>
        <button
          onClick={fetchLogs}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 border border-slate-700 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <DataTable columns={columns} data={logs} searchPlaceholder="Search action, admin, details, target..." />
    </div>
  );
}
