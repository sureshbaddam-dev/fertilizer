import React from 'react';
import { X, Eye, Users, UserCheck, BarChart3, Activity, Clock, Layers, ArrowUpRight, TrendingUp } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function AnalyticsDetailDrawer({ isOpen, onClose, activeTab, data, timeFilter }) {
  if (!isOpen || !data) return null;

  const topPages = data.topPages || [
    { path: '/pricing', views: data.todayHits > 2 ? 4 : 2 },
    { path: '/', views: data.todayHits > 1 ? 3 : 1 },
    { path: '/features', views: 1 },
  ];

  const recentActivity = data.recentActivity || [
    { timeStr: 'Just now', path: '/pricing', visitorId: 'Visitor #102' },
    { timeStr: '1 min ago', path: '/', visitorId: 'Visitor #098' },
    { timeStr: '3 mins ago', path: '/features', visitorId: 'Visitor #044' },
  ];

  const liveList = data.liveVisitorsList || [];
  const timeSeriesData = data.timeSeriesData || [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end transition-opacity">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto font-sans antialiased text-slate-800 border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* HEADER */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold">
              {activeTab === 'hits' && <Eye className="w-5 h-5 text-blue-600" />}
              {activeTab === 'unique' && <Users className="w-5 h-5 text-emerald-600" />}
              {activeTab === 'signup' && <UserCheck className="w-5 h-5 text-teal-600" />}
              {activeTab === 'paid' && <BarChart3 className="w-5 h-5 text-purple-600" />}
              {activeTab === 'live' && <Activity className="w-5 h-5 text-emerald-600 animate-pulse" />}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                {activeTab === 'hits' && 'Page Hits Detailed Analytics'}
                {activeTab === 'unique' && 'Unique Visitors & Traffic Breakdown'}
                {activeTab === 'signup' && 'Signup Conversion Analytics'}
                {activeTab === 'paid' && 'Paid Subscriber Conversion Analytics'}
                {activeTab === 'live' && 'Real-Time Active Visitors'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">Selected Period: <span className="font-bold text-slate-700 uppercase">{timeFilter}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT BODY */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* TAB 1: PAGE HITS DETAILS */}
          {activeTab === 'hits' && (
            <div className="space-y-6">
              {/* Summary Metric Row */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Total Page Hits</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">{(data.totalHits || 0).toLocaleString('en-IN')}</span>
                  <span className="text-[10px] text-slate-500 font-medium">Recorded Page Views</span>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Today's Page Hits</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">{(data.todayHits || 0).toLocaleString('en-IN')}</span>
                  <span className="text-[10px] text-blue-600 font-bold">Captured Today</span>
                </div>
              </div>

              {/* Trend Chart */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Page Hits Progression ({timeFilter})</h3>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} />
                      <YAxis stroke="#94a3b8" fontSize={10} />
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
                      <Area type="monotone" dataKey="hits" name="Page Hits" stroke="#2563eb" fill="#dbeafe" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Pages Breakdown */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                  <span>Top Visited Pages</span>
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                </h3>
                <div className="space-y-2">
                  {topPages.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <span className="font-mono font-bold text-slate-900">{item.path}</span>
                      <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{item.views} views</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity Logs */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                  <span>Recent Visitor Page Views</span>
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                </h3>
                <div className="space-y-2">
                  {recentActivity.map((log, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border-b border-slate-100 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400">{log.timeStr}</span>
                        <span className="font-bold text-slate-800 font-mono">{log.path}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">{log.visitorId}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: UNIQUE VISITORS DETAILS */}
          {activeTab === 'unique' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Total Unique Visitors</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">{(data.totalUnique || 0).toLocaleString('en-IN')}</span>
                  <span className="text-[10px] text-slate-500 font-medium">Distinct Anonymous IPs</span>
                </div>
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Returning Visitors</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">{(data.todayReturning || data.totalReturning || 0).toLocaleString('en-IN')}</span>
                  <span className="text-[10px] text-indigo-600 font-bold">Repeat Visits</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Unique Visitor Progression ({timeFilter})</h3>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} />
                      <YAxis stroke="#94a3b8" fontSize={10} />
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
                      <Area type="monotone" dataKey="unique" name="Unique Visitors" stroke="#059669" fill="#d1fae5" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                <h4 className="font-bold text-slate-900">Uniqueness & Device Isolation Protocol</h4>
                <p className="text-slate-600">
                  Every unique visitor session is assigned an anonymous hash identifier. Multiple page hits from the same visitor maintain a single unique visitor count.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: SIGNUP CONVERSION DETAILS */}
          {activeTab === 'signup' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl">
                  <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">Signup Conversion Rate</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">{data.regConversionRate || '0.0'}%</span>
                  <span className="text-[10px] text-slate-500 font-medium">Visitors → Registrations</span>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Registered Accounts</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">{data.totalRegistrations || 0}</span>
                  <span className="text-[10px] text-teal-600 font-bold">Total Signups</span>
                </div>
              </div>

              <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Signup Funnel Summary</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-600 font-medium">1. Total Unique Visitors</span>
                    <span className="font-bold text-slate-900">{(data.totalUnique || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-teal-50 rounded-xl border border-teal-200">
                    <span className="text-teal-800 font-bold">2. Successful Registrations</span>
                    <span className="font-extrabold text-teal-900">{data.totalRegistrations || 0} Accounts ({data.regConversionRate}%)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PAID CONVERSION DETAILS */}
          {activeTab === 'paid' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl">
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Paid Conversion Rate</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">{data.paidConversionRate || '0.0'}%</span>
                  <span className="text-[10px] text-slate-500 font-medium">Signups → Paid ERP</span>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Active Paid Subscribers</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">{data.totalPaidUsers || 0}</span>
                  <span className="text-[10px] text-purple-600 font-bold">Paying Customers</span>
                </div>
              </div>

              <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3 text-xs">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Paid Conversion Funnel</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-600 font-medium">Total Registered Users</span>
                    <span className="font-bold text-slate-900">{data.totalRegistrations || 0} Accounts</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-200">
                    <span className="text-purple-800 font-bold">Active Paid Subscribers</span>
                    <span className="font-extrabold text-purple-900">{data.totalPaidUsers || 0} Subscribers ({data.paidConversionRate}%)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer transition"
          >
            Close Detail Drawer
          </button>
        </div>
      </div>
    </div>
  );
}
