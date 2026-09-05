import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, RefreshCw } from 'lucide-react';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import SubscriptionsTabs from '../../components/SubscriptionsTabs';
import { adminApiService } from '../../services/adminApiService';
import { formatISTDateTime } from '../../utils/adminDateUtils';

export default function SubscriptionHistoryPage() {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const data = await adminApiService.getSubscriptionHistory();
      setHistory(data || []);
    } catch (err) {
      console.error('Failed to load subscription history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const columns = [
    {
      header: 'User & Mobile',
      key: 'userName',
      render: (row) => (
        <div>
          <span className="font-extrabold text-white block">{row.userName}</span>
          <span className="text-[10px] text-slate-400 font-mono">{row.userMobile}</span>
        </div>
      ),
    },
    { header: 'Plan Code', key: 'planCode', render: (row) => <span className="font-mono text-emerald-400 font-bold">{row.planCode}</span> },
    { header: 'Duration Label', key: 'durationLabel' },
    { header: 'Start Date', key: 'startDate', render: (row) => formatISTDateTime(row.startDate, '—') },
    { header: 'Expiry Date', key: 'expiryDate', render: (row) => formatISTDateTime(row.expiryDate, '—') },
    { header: 'Amount Paid (₹)', key: 'amountPaid', render: (row) => <span className="font-bold text-white">₹{row.amountPaid}</span> },
    { header: 'Source', key: 'source', render: (row) => <StatusBadge status={row.source} /> },
    { header: 'Status', key: 'paymentStatus', render: (row) => <StatusBadge status={row.paymentStatus} /> },
    { header: 'Granted By', key: 'grantedByAdminName', render: (row) => row.grantedByAdminName || 'Online Gateway' },
    { header: 'Reason / Note', key: 'reason', render: (row) => row.reason || '-' },
  ];

  return (
    <div className="space-y-6 font-sans">
      <SubscriptionsTabs />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-purple-400" />
            <span>Immutable Subscription History Audit Log</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">Complete historical archive of every subscription purchase, extension, and admin grant.</p>
        </div>
        <button
          onClick={fetchHistory}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 border border-slate-700 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <DataTable columns={columns} data={history} searchPlaceholder="Search history by user, mobile, source, admin..." />
    </div>
  );
}
