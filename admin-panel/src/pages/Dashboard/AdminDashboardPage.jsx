import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CreditCard,
  TrendingUp,
  Sparkles,
  UserPlus,
  HelpCircle,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
  Zap,
  Store,
  Clock,
} from 'lucide-react';
import { adminApiService } from '../../services/adminApiService';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrentISTDateHeader, formatISTDate, formatRelativeTimeIST } from '../../utils/adminDateUtils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  // State
  const [stats, setStats] = useState({
    totalRegisteredUsers: 0,
    activeUsers: 0,
    activeSubscriptions: 0,
    monthlyRevenue: 0,
    totalRevenue: 0,
    totalWebsiteVisitors: 0,
    totalBusinesses: 0,
    newUsers: 0,
    openSupportTickets: 0,
    demoSubscriptions: 0,
    expiringSoon: 0,
  });

  const [recentUsers, setRecentUsers] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [subSettings, setSubSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Quick Demo Grant Modal State
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [selectedUserForDemo, setSelectedUserForDemo] = useState('');
  const [demoDuration, setDemoDuration] = useState('7');
  const [isSubmittingDemo, setIsSubmittingDemo] = useState(false);
  const [demoSuccessMsg, setDemoSuccessMsg] = useState('');
  const [demoErrorMsg, setDemoErrorMsg] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, usersRes, analyticsRes, settingsRes] = await Promise.all([
        adminApiService.getDashboardStats(),
        adminApiService.getUsersList({ page: 1, limit: 6 }),
        adminApiService.getDashboardAnalytics(),
        adminApiService.getSubscriptionSettings().catch(() => null),
      ]);

      if (statsRes) setStats(statsRes);
      if (usersRes?.users) setRecentUsers(usersRes.users);
      if (analyticsRes) setAnalyticsData(analyticsRes);
      if (settingsRes) {
        setSubSettings(settingsRes);
        if (settingsRes?.demoSettings?.defaultDemoDays) {
          setDemoDuration(String(settingsRes.demoSettings.defaultDemoDays));
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const allowCustomAdminDemoGrants = subSettings?.demoSettings?.allowCustomAdminDemoGrants !== false;

  const handleGrantDemoSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserForDemo) return;
    const parsedDays = parseInt(demoDuration, 10);
    if (isNaN(parsedDays) || parsedDays < 1) {
      setDemoErrorMsg('Please enter a valid whole number of days (at least 1).');
      return;
    }

    setIsSubmittingDemo(true);
    setDemoSuccessMsg('');
    setDemoErrorMsg('');
    try {
      await adminApiService.grantCustomDemoSubscription({
        userId: selectedUserForDemo,
        days: parsedDays,
      });
      setDemoSuccessMsg(`Successfully granted ${parsedDays}-day demo subscription!`);
      setTimeout(() => {
        setIsDemoModalOpen(false);
        setDemoSuccessMsg('');
        fetchDashboardData();
      }, 1200);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to grant demo.';
      setDemoErrorMsg(msg);
    } finally {
      setIsSubmittingDemo(false);
    }
  };

  // Recharts dynamic revenue trend data from backend analytics
  const revenueTrendData = (analyticsData?.monthlyRevenue || []).map((item) => ({
    date: item._id?.month || item.month || 'N/A',
    revenue: item.revenue || 0,
    count: item.count || 0,
  }));

  const getAvatarColor = (name) => {
    const colors = [
      'bg-emerald-100 text-emerald-800 border-emerald-200',
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-amber-100 text-amber-800 border-amber-200',
      'bg-teal-100 text-teal-800 border-teal-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
    ];
    if (!name) return colors[0];
    const code = name.charCodeAt(0) || 0;
    return colors[code % colors.length];
  };

  const getSubStatusMeta = (u) => {
    const status = u.subscriptionStatus || (u.isActive ? 'ACTIVE' : 'INACTIVE');
    const now = new Date();
    let remainingText = null;

    if (u.expiryDate) {
      const exp = new Date(u.expiryDate);
      if (!isNaN(exp.getTime())) {
        const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
          if (status === 'DEMO' || status === 'TRIAL') {
            remainingText = `${diffDays}d trial left`;
          } else {
            remainingText = `${diffDays}d active`;
          }
        } else {
          remainingText = `Expired ${formatISTDate(exp)}`;
        }
      }
    } else if (status === 'NO_PLAN' || status === 'NONE') {
      remainingText = 'No Plan';
    }

    return { status, remainingText };
  };

  return (
    <div className="space-y-4 sm:space-y-6 font-sans antialiased text-slate-800 w-full min-w-0">
      {/* 1. DASHBOARD HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 sm:pb-4">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
            Overview of platform activity, merchant onboarding & financial growth.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-xs font-semibold w-full sm:w-auto justify-between sm:justify-end shrink-0">
          <span className="text-slate-600 font-medium bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs">
            {formatCurrentISTDateHeader()}
          </span>
          <button
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer transition disabled:opacity-60 text-[11px] sm:text-xs"
            aria-label="Refresh dashboard data"
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. COMPACT KPI SUMMARY (5 METRICS RESPONSIVE GRID) */}
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {/* Total Users */}
        <div
          onClick={() => navigate('/admin/users')}
          className="bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-3 sm:p-4 shadow-xs space-y-1 cursor-pointer transition hover:shadow-sm min-w-0"
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Total Users</span>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-lg sm:text-2xl font-black text-slate-900 truncate">{stats.totalRegisteredUsers ?? 0}</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">+{stats.newUsers ?? 0}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium block truncate">Registered Accounts</span>
        </div>

        {/* Active Users */}
        <div
          onClick={() => navigate('/admin/users?filter=ACTIVE')}
          className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-3 sm:p-4 shadow-xs space-y-1 cursor-pointer transition hover:shadow-sm min-w-0"
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Active Users</span>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-lg sm:text-2xl font-black text-slate-900 truncate">{stats.activeUsers ?? 0}</span>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">Verified</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium block truncate">Active Accounts</span>
        </div>

        {/* Active Subscriptions */}
        <div
          onClick={() => navigate('/admin/subscriptions?filter=ACTIVE')}
          className="bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-3 sm:p-4 shadow-xs space-y-1 cursor-pointer transition hover:shadow-sm min-w-0"
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Active Subs</span>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-lg sm:text-2xl font-black text-emerald-700 truncate">{stats.activeSubscriptions ?? 0}</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">Active</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium block truncate">Active Plans</span>
        </div>

        {/* Monthly Revenue */}
        <div
          onClick={() => navigate('/admin/payments')}
          className="bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-3 sm:p-4 shadow-xs space-y-1 cursor-pointer transition hover:shadow-sm min-w-0"
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Monthly Rev</span>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-lg sm:text-2xl font-black text-slate-900 font-mono truncate">₹{(stats.monthlyRevenue ?? 0).toLocaleString('en-IN')}</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">Online</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium block truncate">Current Month</span>
        </div>

        {/* Open Support Tickets */}
        <div
          onClick={() => navigate('/admin/support')}
          className="col-span-1 min-[360px]:col-span-2 sm:col-span-1 bg-white border border-slate-200 hover:border-purple-300 rounded-2xl p-3 sm:p-4 shadow-xs space-y-1 cursor-pointer transition hover:shadow-sm min-w-0"
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Support Tickets</span>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-lg sm:text-2xl font-black text-purple-700 truncate">{stats.openSupportTickets || 0}</span>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded shrink-0">Inquiries</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium block truncate">Open / Pending</span>
        </div>
      </div>

      {/* 3. QUICK ACTIONS & PLATFORM PULSE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Quick Administrative Actions (2 cols on desktop) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-600 shrink-0" /> Quick Administrative Actions
            </span>
            <span className="text-[10px] text-slate-400 font-medium">1-Click Shortcuts</span>
          </div>
          <div className="grid grid-cols-2 min-[440px]:grid-cols-3 sm:flex sm:flex-wrap gap-2">
            <button
              onClick={() => {
                if (!allowCustomAdminDemoGrants) return;
                setIsDemoModalOpen(true);
              }}
              disabled={!allowCustomAdminDemoGrants}
              title={!allowCustomAdminDemoGrants ? 'Custom demo grants are disabled in Subscription Settings' : 'Grant demo subscription to a user'}
              className={`px-3 py-2 font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition text-center min-h-[38px] ${
                allowCustomAdminDemoGrants
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>+ Give Demo</span>
            </button>
            <button
              onClick={() => navigate('/admin/support')}
              className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs rounded-xl border border-blue-200 flex items-center justify-center gap-1.5 cursor-pointer transition text-center min-h-[38px]"
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">Support ({stats.openSupportTickets || 0})</span>
            </button>
            <button
              onClick={() => navigate('/admin/users')}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition text-center min-h-[38px]"
            >
              <UserPlus className="w-3.5 h-3.5 shrink-0" />
              <span>+ Add User</span>
            </button>
            <button
              onClick={() => navigate('/admin/analytics/visitors')}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition text-center min-h-[38px]"
            >
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Analytics</span>
            </button>
            <button
              onClick={() => navigate('/admin/payments')}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition text-center min-h-[38px] col-span-2 min-[440px]:col-span-1 sm:col-span-auto"
            >
              <CreditCard className="w-3.5 h-3.5 shrink-0" />
              <span>Payments</span>
            </button>
          </div>
        </div>

        {/* Platform Pulse (1 col on desktop) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 min-w-0">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" /> Platform Pulse
          </span>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-600 font-medium">Free Trials Active</span>
              <span className="font-bold text-amber-700">{stats.demoSubscriptions ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-600 font-medium">Expiring in 7 Days</span>
              <span className="font-bold text-rose-700">{stats.expiringSoon ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-600 font-medium">Total Businesses</span>
              <span className="font-bold text-slate-800">{stats.totalBusinesses ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. RECENT REGISTRATIONS & REVENUE TRAJECTORY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Registered Users — Modern SaaS Redesign */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Registrations</h2>
              <p className="text-[11px] text-slate-500 font-medium">Latest shop owners joined on VEDIXA</p>
            </div>
            <button
              onClick={() => navigate('/admin/users')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer transition"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {recentUsers.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No user registrations found.</p>
            ) : (
              recentUsers.slice(0, 5).map((u) => {
                const { status, remainingText } = getSubStatusMeta(u);
                const initial = (u.ownerName || u.businessName || 'U').trim().charAt(0).toUpperCase();
                const avatarColor = getAvatarColor(u.ownerName || u.businessName);

                return (
                  <div
                    key={u._id}
                    onClick={() => navigate(`/admin/users/${u._id}`)}
                    className="p-3 rounded-xl bg-slate-50/70 hover:bg-slate-100/90 border border-slate-200/70 hover:border-emerald-200 cursor-pointer transition flex flex-col min-[420px]:flex-row min-[420px]:items-center justify-between gap-2.5 min-[420px]:gap-3 group"
                  >
                    {/* Left: User Avatar & Info */}
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${avatarColor}`}>
                        {initial}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition truncate max-w-[140px] sm:max-w-[200px]">
                            {u.ownerName || 'Unnamed User'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium truncate">
                          <span className="font-mono text-slate-600">{u.mobile}</span>
                          {u.businessName && u.businessName !== 'N/A' && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="truncate max-w-[110px] sm:max-w-[160px] text-slate-600 flex items-center gap-1">
                                <Store className="w-3 h-3 text-slate-400 shrink-0 inline" />
                                {u.businessName}
                              </span>
                            </>
                          )}
                        </div>

                        {u.createdAt && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 shrink-0" />
                            <span>{formatRelativeTimeIST(u.createdAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Status Badge & Remaining Info */}
                    <div className="flex flex-row min-[420px]:flex-col items-center min-[420px]:items-end justify-between min-[420px]:justify-start shrink-0 space-y-0 min-[420px]:space-y-1 text-right pt-1 min-[420px]:pt-0 border-t min-[420px]:border-t-0 border-slate-100">
                      <StatusBadge status={status} />
                      {remainingText && (
                        <span className="text-[10px] font-medium text-slate-500 block">
                          {remainingText}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Revenue Analytics Chart — Compact & Modern Redesign */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2 min-w-0 overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Revenue Trajectory</h2>
              <p className="text-[11px] text-slate-500 font-medium">Monthly online collections trend</p>
            </div>
            <button
              onClick={() => navigate('/admin/revenue')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer transition"
            >
              <span>Analytics</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-36 sm:h-40 w-full pt-1 min-w-0">
            {revenueTrendData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 space-y-1">
                <TrendingUp className="w-6 h-6 text-slate-300" />
                <span>No revenue trend data available.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={revenueTrendData} margin={{ top: 4, right: 6, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: '#ffffff',
                    }}
                    formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#revenueGrad)"
                    dot={{ r: 3, fill: '#10b981', strokeWidth: 1, stroke: '#ffffff' }}
                    activeDot={{ r: 5, fill: '#059669', strokeWidth: 2, stroke: '#ffffff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* 5. QUICK DEMO GRANT MODAL */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl p-5 sm:p-6 max-w-md w-full space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Grant Custom Demo Subscription</span>
              </h3>
              <button
                onClick={() => setIsDemoModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {demoSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                {demoSuccessMsg}
              </div>
            )}

            {demoErrorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {demoErrorMsg}
              </div>
            )}

            <form onSubmit={handleGrantDemoSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Select User</label>
                <select
                  value={selectedUserForDemo}
                  onChange={(e) => setSelectedUserForDemo(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-600"
                >
                  <option value="">-- Choose User --</option>
                  {recentUsers.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.ownerName} ({u.mobile}) {u.businessName ? `- ${u.businessName}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Custom Demo Days (Positive Integer)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={demoDuration}
                  onChange={(e) => {
                    setDemoErrorMsg('');
                    setDemoDuration(e.target.value);
                  }}
                  required
                  placeholder="e.g. 7, 14, 30"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-600"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[7, 14, 30, 45, 60].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setDemoDuration(String(days))}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg cursor-pointer transition ${
                        demoDuration === String(days)
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsDemoModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDemo || !selectedUserForDemo}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingDemo ? 'Granting...' : 'Grant Demo Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

