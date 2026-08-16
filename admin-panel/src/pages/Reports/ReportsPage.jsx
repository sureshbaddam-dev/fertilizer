import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Users, Sparkles, DollarSign, TrendingUp } from 'lucide-react';
import { adminApiService } from '../../services/adminApiService';

export default function ReportsPage() {
  const [reportType, setReportType] = useState('USERS'); // 'USERS', 'SUBSCRIPTIONS', 'REVENUE', 'LEADS'
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      if (reportType === 'USERS') {
        const u = await adminApiService.getUsersList({ limit: 100 });
        setData(u.users || []);
      } else if (reportType === 'SUBSCRIPTIONS' || reportType === 'REVENUE') {
        const h = await adminApiService.getSubscriptionHistory();
        setData(h || []);
      }
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [reportType]);

  const handleExportCSV = () => {
    if (!data || data.length === 0) return alert('No data available to export');
    const keys = Object.keys(data[0] || {}).filter((k) => typeof data[0][k] !== 'object');
    const headerRow = keys.join(',');
    const rows = data.map((row) => keys.map((k) => `"${String(row[k] || '').replace(/"/g, '""')}"`).join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headerRow, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `REPORT_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6 font-sans antialiased text-slate-800">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <span>Reports & Data Exports</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Generate user growth, subscription lifecycle, and revenue reports.</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* REPORT TYPE SELECTOR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-xs">
        {[
          { label: 'User Report', key: 'USERS', icon: Users },
          { label: 'Subscriptions Report', key: 'SUBSCRIPTIONS', icon: Sparkles },
          { label: 'Revenue Report', key: 'REVENUE', icon: DollarSign },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setReportType(t.key)}
            className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              reportType === t.key
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <t.icon className="w-4 h-4" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* REPORT SUMMARY TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{reportType} REPORT DATA</h2>
          <span className="text-xs text-slate-500 font-semibold">{data?.length || 0} Records</span>
        </div>

        {isLoading ? (
          <p className="text-xs text-slate-400 font-medium py-8 text-center">Generating report data...</p>
        ) : !data || data.length === 0 ? (
          <p className="text-xs text-slate-400 font-medium py-8 text-center">No report data found.</p>
        ) : (
          <div className="overflow-x-auto max-h-[450px]">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200 sticky top-0">
                <tr>
                  {Object.keys(data[0] || {})
                    .filter((k) => typeof data[0][k] !== 'object' && !k.startsWith('_'))
                    .slice(0, 7)
                    .map((k) => (
                      <th key={k} className="p-3">
                        {k}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {Object.keys(data[0] || {})
                      .filter((k) => typeof data[0][k] !== 'object' && !k.startsWith('_'))
                      .slice(0, 7)
                      .map((k) => (
                        <td key={k} className="p-3 font-medium">
                          {String(row[k] || 'N/A')}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
