import React, { useState, useEffect } from 'react';
import { Eye, Users, TrendingUp, RefreshCw, BarChart3, Radio, Activity, ShieldCheck, UserCheck } from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { adminApiService } from '../../services/adminApiService';
import AnalyticsDetailDrawer from '../../components/AnalyticsDetailDrawer';

export default function WebsiteAnalyticsPage() {
  const [timeFilter, setTimeFilter] = useState('MONTH'); // 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Detail Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState('hits'); // 'hits' | 'unique' | 'signup' | 'paid'

  const fetchAnalytics = async (showLoading = true, period = timeFilter) => {
    if (showLoading) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const result = await adminApiService.getVisitorAnalytics(period);
      setData(result);
    } catch (err) {
      console.error('Failed to load visitor analytics:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(true, timeFilter);
  }, [timeFilter]);

  const openDrawer = (tab) => {
    setActiveDrawerTab(tab);
    setIsDrawerOpen(true);
  };

  if (isLoading || !data) {
    return (
      <div className="p-12 text-center text-slate-400 font-medium font-sans">
        <Activity className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
        <p className="text-xs">Loading Website Visitor & Traffic Analytics...</p>
      </div>
    );
  }

  const timeSeriesData = data.timeSeriesData || [];

  return (
    <div className="space-y-5 font-sans antialiased text-slate-800">
      {/* 1. HEADER WITH TIME FILTERS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-600" />
            <span>Website Visitor & Traffic Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Historical visitor traffic analytics, page hits, unique vs returning visitors, and conversion funnels.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Time Filter Pills */}
          <div className="flex items-center space-x-1 bg-white border border-slate-200 p-1 rounded-xl shadow-2xs">
            {[
              { label: 'Day', value: 'DAY' },
              { label: 'Week', value: 'WEEK' },
              { label: 'Month', value: 'MONTH' },
              { label: 'Year', value: 'YEAR' },
            ].map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTimeFilter(tf.value)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  timeFilter === tf.value
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchAnalytics(true, timeFilter)}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. COMPACT CLICKABLE KPI CARDS (4 IN 1 ROW ON DESKTOP) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Page Hits */}
        <div
          onClick={() => openDrawer('hits')}
          className="bg-white border border-slate-200 hover:border-blue-500 rounded-2xl p-4 shadow-2xs space-y-1 cursor-pointer transition transform hover:-translate-y-0.5"
          title="Click to view detailed Page Hits breakdown"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Page Hits ({timeFilter})</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
              <Eye className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between pt-0.5">
            <span className="text-2xl font-black text-slate-900">{(data.todayHits || data.totalHits || 0).toLocaleString('en-IN')}</span>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
              Total Hits
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium block">Click for top pages & timeline →</span>
        </div>

        {/* Unique Visitors */}
        <div
          onClick={() => openDrawer('unique')}
          className="bg-white border border-slate-200 hover:border-emerald-500 rounded-2xl p-4 shadow-2xs space-y-1 cursor-pointer transition transform hover:-translate-y-0.5"
          title="Click to view Unique Visitors breakdown"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Unique Visitors ({timeFilter})</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between pt-0.5">
            <span className="text-2xl font-black text-slate-900">{(data.todayUnique || data.totalUnique || 0).toLocaleString('en-IN')}</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              Distinct IPs
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium block">Click for returning visitors →</span>
        </div>

        {/* Signup Conversion */}
        <div
          onClick={() => openDrawer('signup')}
          className="bg-white border border-slate-200 hover:border-teal-500 rounded-2xl p-4 shadow-2xs space-y-1 cursor-pointer transition transform hover:-translate-y-0.5"
          title="Click to view Signup Conversion breakdown"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Signup Conversion</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between pt-0.5">
            <span className="text-2xl font-black text-slate-900">{data.regConversionRate || '0.0'}%</span>
            <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
              {data.totalRegistrations || 0} Users
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium block">Click for conversion funnel →</span>
        </div>

        {/* Paid Conversion */}
        <div
          onClick={() => openDrawer('paid')}
          className="bg-white border border-slate-200 hover:border-purple-500 rounded-2xl p-4 shadow-2xs space-y-1 cursor-pointer transition transform hover:-translate-y-0.5"
          title="Click to view Paid Conversion breakdown"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Paid Conversion</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center">
              <BarChart3 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between pt-0.5">
            <span className="text-2xl font-black text-slate-900">{data.paidConversionRate || '0.0'}%</span>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
              {data.totalPaidUsers || 0} Paid
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium block">Click for revenue details →</span>
        </div>
      </div>

      {/* 3. VISITOR TREND CHART (PERIOD DYNAMIC & INTERACTIVE CLICK) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Website Visitor & Page Views Trend ({timeFilter})</h2>
            <p className="text-[11px] text-slate-500 font-medium">Click chart points to inspect period analytics breakdown</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Page Hits
            </span>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Unique Visitors
            </span>
          </div>
        </div>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeSeriesData} onClick={() => openDrawer('hits')}>
              <defs>
                <linearGradient id="colorHits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorUnique" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="hits" name="Page Hits" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorHits)" dot={{ r: 4 }} />
              <Area type="monotone" dataKey="unique" name="Unique Visitors" stroke="#059669" strokeWidth={2.5} fillOpacity={1} fill="url(#colorUnique)" dot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. VISITOR BREAKDOWN & CONVERSION FUNNEL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Unique vs Returning Breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900">Unique vs Returning Visitors Breakdown</h2>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeSeriesData.slice(-10)} onClick={() => openDrawer('unique')}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px' }} />
                <Bar dataKey="unique" name="Unique" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="returning" name="Returning" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900">Website Conversion Funnel</h2>
          <div className="space-y-2.5">
            <div
              onClick={() => openDrawer('hits')}
              className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50 border border-blue-200 cursor-pointer hover:bg-blue-100 transition"
            >
              <div className="flex items-center space-x-2.5">
                <Eye className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">1. Total Page Views</span>
              </div>
              <span className="text-xs font-bold text-blue-700">{(data.totalHits || 0).toLocaleString('en-IN')} Views (100%)</span>
            </div>

            <div
              onClick={() => openDrawer('unique')}
              className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 cursor-pointer hover:bg-emerald-100 transition"
            >
              <div className="flex items-center space-x-2.5">
                <Users className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">2. Unique Devices / Visitors</span>
              </div>
              <span className="text-xs font-bold text-emerald-700">{(data.totalUnique || 0).toLocaleString('en-IN')} Visitors</span>
            </div>

            <div
              onClick={() => openDrawer('signup')}
              className="flex items-center justify-between p-2.5 rounded-xl bg-teal-50 border border-teal-200 cursor-pointer hover:bg-teal-100 transition"
            >
              <div className="flex items-center space-x-2.5">
                <UserCheck className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-bold text-slate-800">3. Registered User Accounts</span>
              </div>
              <span className="text-xs font-bold text-teal-700">{data.totalRegistrations || 0} Accounts ({data.regConversionRate}%)</span>
            </div>

            <div
              onClick={() => openDrawer('paid')}
              className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50 border border-purple-200 cursor-pointer hover:bg-purple-100 transition"
            >
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold text-slate-800">4. Paid ERP Subscribers</span>
              </div>
              <span className="text-xs font-bold text-purple-700">{data.totalPaidUsers || 0} Subscribers ({data.paidConversionRate}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* DETAIL DRAWER / MODAL */}
      <AnalyticsDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeTab={activeDrawerTab}
        data={data}
        timeFilter={timeFilter}
      />
    </div>
  );
}
