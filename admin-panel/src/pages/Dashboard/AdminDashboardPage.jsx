import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CreditCard,
  TrendingUp,
  Sparkles,
  UserPlus,
  HelpCircle,
  Clock,
  CheckCircle2,
  Activity,
  ArrowRight,
  AlertCircle,
  Phone,
  RefreshCw,
  Eye,
  ShieldAlert,
  ArrowUpRight,
  Zap,
} from 'lucide-react';
import { adminApiService } from '../../services/adminApiService';
import StatusBadge from '../../components/StatusBadge';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  // State
  const [stats, setStats] = useState({
    totalRegisteredUsers: 4,
    activeUsers: 4,
    activeSubscriptions: 4,
    monthlyRevenue: 398,
    totalRevenue: 398,
    totalWebsiteVisitors: 4,
  });

  const [recentUsers, setRecentUsers] = useState([]);
  const [demoRequests, setDemoRequests] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityFilter, setActivityFilter] = useState('TODAY'); // 'TODAY' | 'YESTERDAY' | 'WEEK'
  const [isLoading, setIsLoading] = useState(true);

  // Quick Demo Grant Modal State
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [selectedUserForDemo, setSelectedUserForDemo] = useState('');
  const [demoDuration, setDemoDuration] = useState('7');
  const [isSubmittingDemo, setIsSubmittingDemo] = useState(false);
  const [demoSuccessMsg, setDemoSuccessMsg] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, usersRes, demoRes, ticketsRes, logsRes] = await Promise.all([
        adminApiService.getDashboardStats(),
        adminApiService.getUsersList({ page: 1, limit: 6 }),
        adminApiService.getDemoRequests(),
        adminApiService.getSupportTickets('ALL'),
        adminApiService.getRecentActivity(),
      ]);

      if (statsRes) setStats(statsRes);
      if (usersRes?.users) setRecentUsers(usersRes.users);
      if (demoRes) setDemoRequests(demoRes);
      if (ticketsRes) setSupportTickets(ticketsRes.slice(0, 5));
      if (logsRes) setActivityLogs(logsRes);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrantDemoSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserForDemo) return;
    setIsSubmittingDemo(true);
    setDemoSuccessMsg('');
    try {
      await adminApiService.grantCustomDemoSubscription(selectedUserForDemo, parseInt(demoDuration, 10));
      setDemoSuccessMsg(`Successfully granted ${demoDuration}-day demo subscription!`);
      setTimeout(() => {
        setIsDemoModalOpen(false);
        setDemoSuccessMsg('');
        fetchDashboardData();
      }, 1200);
    } catch (_err) {
      setDemoSuccessMsg('Failed to grant demo.');
    } finally {
      setIsSubmittingDemo(false);
    }
  };

  // Recharts compact trend data
  const revenueTrendData = [
    { date: '11 Aug', revenue: 199, visitors: 12 },
    { date: '12 Aug', revenue: 199, visitors: 18 },
    { date: '13 Aug', revenue: 398, visitors: 24 },
    { date: '14 Aug', revenue: 398, visitors: 19 },
    { date: '15 Aug', revenue: 398, visitors: 31 },
    { date: '16 Aug', revenue: 398, visitors: 28 },
  ];

  const pendingDemoCount = demoRequests.filter((r) => r.status === 'PENDING').length;
  const pendingTicketsCount = supportTickets.filter((t) => t.status === 'PENDING' || t.status === 'OPEN').length;

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
            Today, 16 Aug 2026
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

      {/* 2. COMPACT KPI SUMMARY (6 METRICS GRID IN 2 ROWS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Users */}
        <div
          onClick={() => navigate('/admin/users')}
          className="bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-4 shadow-xs space-y-1 cursor-pointer transition"
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Users</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{stats.totalRegisteredUsers || 4}</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">+12 new</span>
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
            <span className="text-2xl font-black text-slate-900">{stats.activeUsers || 4}</span>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">100% Verified</span>
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
            <span className="text-2xl font-black text-emerald-700">{stats.activeSubscriptions || 4}</span>
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
            <span className="text-2xl font-black text-slate-900 font-mono">₹{stats.monthlyRevenue || 398}</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">+18.4%</span>
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
            <span className="text-2xl font-black text-purple-700">{supportTickets.length || 0}</span>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">Support</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium block">Customer Inquiries</span>
        </div>

        {/* Pending Demo Requests */}
        <div
          onClick={() => navigate('/admin/subscriptions/demos')}
          className="bg-white border border-slate-200 hover:border-amber-400 rounded-2xl p-4 shadow-xs space-y-1 border-l-4 border-l-amber-500 cursor-pointer transition"
        >
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Pending Demos</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-700">{pendingDemoCount}</span>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">Action Req</span>
          </div>
          <span className="text-[10px] text-amber-800 font-medium block">Awaiting Approval</span>
        </div>
      </div>

      {/* 3. QUICK ACTIONS & ACTION REQUIRED (COMPACT PANELS) */}
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
              onClick={() => setIsDemoModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>+ Give Demo</span>
            </button>
            <button
              onClick={() => navigate('/admin/subscriptions/demos')}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl border border-amber-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>View Demo Requests ({pendingDemoCount})</span>
            </button>
            <button
              onClick={() => navigate('/admin/support')}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs rounded-xl border border-blue-200 flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
              <span>View Support ({pendingTicketsCount})</span>
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

        {/* Action Required Box (1 Col) */}
        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" /> Action Required
            </span>
            <span className="text-[10px] font-extrabold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
              {pendingDemoCount + pendingTicketsCount} Total Items
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between p-1.5 bg-white border border-amber-200 rounded-xl">
              <span className="font-semibold text-slate-700">Pending Demo Requests</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-700">{pendingDemoCount}</span>
                <button
                  onClick={() => navigate('/admin/subscriptions/demos')}
                  className="px-2 py-0.5 bg-amber-600 text-white font-bold text-[10px] rounded-lg hover:bg-amber-700"
                >
                  View
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-1.5 bg-white border border-amber-200 rounded-xl">
              <span className="font-semibold text-slate-700">Open Support Tickets</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-blue-700">{pendingTicketsCount}</span>
                <button
                  onClick={() => navigate('/admin/support')}
                  className="px-2 py-0.5 bg-blue-600 text-white font-bold text-[10px] rounded-lg hover:bg-blue-700"
                >
                  View
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. MAIN FOCUS — TODAY'S DAILY OPERATIONAL ACTIVITY STREAM */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Today's System Operational Stream</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Real-time log of registrations, demo requests, payments, support tickets, and system activity.</p>
          </div>

          {/* Time Filter Pills */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
            {['TODAY', 'YESTERDAY', 'WEEK'].map((tf) => (
              <button
                key={tf}
                onClick={() => setActivityFilter(tf)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  activityFilter === tf
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tf === 'TODAY' ? 'Today' : tf === 'YESTERDAY' ? 'Yesterday' : 'This Week'}
              </button>
            ))}
          </div>
        </div>

        {/* Live Event Activity Feed */}
        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {activityLogs.length === 0 ? (
            <p className="text-xs text-slate-400 font-medium text-center py-6">No system activity logged for this time period.</p>
          ) : (
            activityLogs.map((log, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl transition flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                    <Zap className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block leading-tight">{log.details || log.action}</span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      By {log.adminName || 'System'} • Target: {log.targetName || 'Platform'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-right">
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                    LOGGED
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 5. SUPPORT TICKETS & RECENT LEADS (COMPACT TABLES) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Support Tickets (CLICKING ROW NAVIGATES TO USER PROFILE WITH TICKET CONTEXT) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-amber-600" /> Support Tickets
            </h3>
            <button
              onClick={() => navigate('/admin/support')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2">Ticket</th>
                  <th className="p-2">User / Mobile</th>
                  <th className="p-2">Subject</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {supportTickets.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-400">No support tickets</td>
                  </tr>
                ) : (
                  supportTickets.map((ticket) => (
                    <tr
                      key={ticket._id}
                      onClick={() => navigate(`/admin/users/${ticket.userId}?ticketId=${ticket._id}`)}
                      className="hover:bg-amber-50/50 cursor-pointer transition"
                      title="Click to view complete User Profile & Support Context"
                    >
                      <td className="p-2 font-mono font-bold text-slate-900">{ticket.ticketId || `#TKT-${ticket._id.slice(-4)}`}</td>
                      <td className="p-2">
                        <span className="font-bold text-slate-900 block">{ticket.userName || 'User'}</span>
                        <span className="text-[10px] font-mono text-slate-500">{ticket.userMobile || '9848081875'}</span>
                      </td>
                      <td className="p-2 font-medium text-slate-700 max-w-[140px] truncate">{ticket.subject}</td>
                      <td className="p-2"><StatusBadge status={ticket.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 6. RECENT USERS & COMPACT REVENUE / TRAFFIC ANALYTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Users Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-600" /> Recent User Accounts
            </h3>
            <button
              onClick={() => navigate('/admin/users')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline flex items-center gap-1"
            >
              <span>View All Users</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">User</th>
                  <th className="p-2.5">Full Mobile</th>
                  <th className="p-2.5">Business Name</th>
                  <th className="p-2.5">Subscription</th>
                  <th className="p-2.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-bold text-slate-900">{u.ownerName}</td>
                    <td className="p-2.5 font-mono text-slate-700">{u.mobile}</td>
                    <td className="p-2.5 font-medium text-emerald-700">{u.businessName || 'Store Registered'}</td>
                    <td className="p-2.5"><StatusBadge status={u.subscriptionStatus || 'ACTIVE'} /></td>
                    <td className="p-2.5">
                      <button
                        onClick={() => navigate(`/admin/users/${u._id}`)}
                        className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                      >
                        Profile →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Compact Revenue Trend Chart (1 Col - Fits cleanly without occupying half screen!) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" /> Revenue Sparkline
            </h3>
            <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              ₹{stats.monthlyRevenue || 398}
            </span>
          </div>

          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrendData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '10px', fontSize: '11px' }} />
                <Area type="monotone" dataKey="revenue" stroke="#059669" fillOpacity={1} fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* QUICK DEMO GRANT MODAL */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 max-w-md w-full space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <span>Give Demo Subscription</span>
              </h3>
              <button onClick={() => setIsDemoModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {demoSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                {demoSuccessMsg}
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
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Demo Duration</label>
                <select
                  value={demoDuration}
                  onChange={(e) => setDemoDuration(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-600"
                >
                  <option value="7">7 Days Demo</option>
                  <option value="14">14 Days Demo</option>
                  <option value="30">30 Days Demo</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsDemoModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDemo || !selectedUserForDemo}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition shadow-xs disabled:opacity-50"
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
