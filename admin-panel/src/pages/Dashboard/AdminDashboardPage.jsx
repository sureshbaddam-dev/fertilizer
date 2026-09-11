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
} from 'lucide-react';
import { adminApiService } from '../../services/adminApiService';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrentISTDateHeader } from '../../utils/adminDateUtils';
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
      await adminApiService.grantCustomDemoSubscription(selectedUserForDemo, parsedDays);
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
    date: item._id?.month || 'N/A',
    revenue: item.revenue || 0,
    count: item.count || 0,
  }));

  const pendingTicketsCount = stats.openSupportTickets || 0;

  return (
    <div className="space-y-6 font-sans antialiased text-slate-800">
      {/* 1. DASHBOARD HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Overview of your platform activity and performance.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs font-semibold">
          <span className="text-slate-600 font-medium bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl">
            {formatCurrentISTDateHeader()}
          </span>
          <button
            onClick={fetchDashboardData}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. COMPACT KPI SUMMARY (5 METRICS GRID) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Users */}
        <div
          onClick={() => navigate('/admin/users')}
          className="bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-4 shadow-xs space-y-1 cursor-pointer transition"
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Users</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{stats.totalRegisteredUsers ?? 0}</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">+{stats.newUsers ?? 0} today</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium block">Registered Accounts</span>
        </div>

        {/* Active Users */}
        <div
          onClick={() => navigate('/admin/users?filter=ACTIVE')}
          className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-4 shadow-xs space-y-1 cursor-pointer transition"
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Active Users</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{stats.activeUsers ?? 0}</span>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">Verified</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium block">Active Accounts</span>
        </div>

        {/* Active Subscriptions */}
        <div
          onClick={() => navigate('/admin/subscriptions?filter=ACTIVE')}
          className="bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-4 shadow-xs space-y-1 cursor-pointer transition"
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Active Subs</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-700">{stats.activeSubscriptions ?? 0}</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Active Access</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium block">Active Plans</span>
        </div>

        {/* Monthly Revenue */}
        <div
          onClick={() => navigate('/admin/payments')}
          className="bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-4 shadow-xs space-y-1 cursor-pointer transition"
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Monthly Revenue</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 font-mono">₹{(stats.monthlyRevenue ?? 0).toLocaleString('en-IN')}</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Online Payments</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium block">This Month</span>
        </div>

        {/* Open Support Tickets */}
        <div
          onClick={() => navigate('/admin/support')}
          className="bg-white border border-slate-200 hover:border-purple-300 rounded-2xl p-4 shadow-xs space-y-1 cursor-pointer transition"
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Support Tickets</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-purple-700">{stats.openSupportTickets || 0}</span>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">Support</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium block">Open / Pending Inquiries</span>
        </div>
      </div>

      {/* 3. QUICK ACTIONS & ACTION REQUIRED PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-600" /> Quick Administrative Actions
            </span>
            <span className="text-[10px] text-slate-400 font-medium">1-Click Shortcuts</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                if (!allowCustomAdminDemoGrants) return;
                setIsDemoModalOpen(true);
              }}
              disabled={!allowCustomAdminDemoGrants}
              title={!allowCustomAdminDemoGrants ? 'Custom demo grants are disabled in Subscription Settings' : 'Grant demo subscription to a user'}
              className={`px-3.5 py-2 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition ${
                allowCustomAdminDemoGrants
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>+ Give Demo</span>
            </button>
            <button
              onClick={() => navigate('/admin/support')}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs rounded-xl border border-blue-200 flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
              <span>View Support ({stats.openSupportTickets || 0})</span>
            </button>
            <button
              onClick={() => navigate('/admin/users')}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add User</span>
            </button>
            <button
              onClick={() => navigate('/admin/analytics/visitors')}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Website Analytics</span>
            </button>
            <button
              onClick={() => navigate('/admin/payments/transactions')}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>View Payments</span>
            </button>
          </div>
        </div>

        {/* Action Required / System Health (1 Col) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-600" /> Platform Pulse
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

      {/* 4. RECENT REGISTRATIONS & REVENUE TREND */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Registered Users */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Registrations</h2>
              <p className="text-xs text-slate-500 font-medium">Latest shop owners on the platform</p>
            </div>
            <button
              onClick={() => navigate('/admin/users')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {recentUsers.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No user registrations found.</p>
            ) : (
              recentUsers.slice(0, 5).map((u) => (
                <div
                  key={u._id}
                  onClick={() => navigate(`/admin/users/${u._id}`)}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 cursor-pointer transition"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-900 block">{u.ownerName}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{u.mobile} • {u.businessName || 'Business'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={u.subscriptionStatus || (u.isActive ? 'ACTIVE' : 'INACTIVE')} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Revenue Analytics Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Revenue Trajectory</h2>
              <p className="text-xs text-slate-500 font-medium">Monthly collection trends</p>
            </div>
            <button
              onClick={() => navigate('/admin/payments/analytics')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Analytics</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-60 w-full pt-2">
            {revenueTrendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No revenue trend data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrendData}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                    formatter={(val) => [`₹${val}`, 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#059669"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#revenueGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* 5. QUICK DEMO GRANT MODAL */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 max-w-md w-full space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <span>Grant Custom Demo Subscription</span>
              </h3>
              <button onClick={() => setIsDemoModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
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
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Select User</label>
                <select
                  value={selectedUserForDemo}
                  onChange={(e) => setSelectedUserForDemo(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-600"
                >
                  <option value="">-- Choose User --</option>
                  {recentUsers.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.ownerName} ({u.mobile})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
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
                  placeholder="e.g. 14, 30, 45"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-600"
                />
                <div className="flex gap-2 mt-2">
                  {[7, 14, 30, 45, 60].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setDemoDuration(String(days))}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
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
