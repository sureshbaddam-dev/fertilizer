import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Sparkles,
  WalletCards,
  TrendingUp,
  IndianRupee,
  DatabaseBackup,
  FileBarChart,
  Bell,
  LifeBuoy,
  ShieldCheck,
  History,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Search,
  Clock,
} from 'lucide-react';
import { adminApiService } from '../services/adminApiService';
import vedixaLogo from '../assets/vedixa_logo.png';
import { formatISTTime, formatCurrentISTDateHeader } from '../utils/adminDateUtils';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [openSubmenus, setOpenSubmenus] = useState({
    leads: location.pathname.startsWith('/admin/leads') || location.pathname.startsWith('/admin/analytics'),
  });
  const [unreadNotifications, setUnreadNotifications] = useState([]);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const currentUser = JSON.parse(localStorage.getItem('adminUser') || '{}') || { ownerName: 'Super Admin', mobile: '9848081875' };

  const fetchUnreadNotifications = async () => {
    try {
      const notifs = await adminApiService.getUnreadSupportNotifications();
      setUnreadNotifications(notifs || []);
    } catch (_err) {
      // Ignore polling errors
    }
  };

  useEffect(() => {
    fetchUnreadNotifications();
    const interval = setInterval(fetchUnreadNotifications, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  // Update expanded submenu state when route changes
  useEffect(() => {
    setOpenSubmenus((prev) => ({
      ...prev,
      leads: (location.pathname.startsWith('/admin/leads') || location.pathname.startsWith('/admin/analytics')) ? true : prev.leads,
    }));
  }, [location.pathname]);

  const toggleSubmenu = (key) => {
    setOpenSubmenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConfirmLogout = async () => {
    try {
      await adminApiService.adminLogout();
    } catch (_err) {
      // Ignore network errors
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsLogoutModalOpen(false);
      navigate('/admin/login', { replace: true });
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      await adminApiService.markSupportNotificationRead(notif._id);
    } catch (_err) {
      // Ignore
    }
    setIsNotifDropdownOpen(false);
    fetchUnreadNotifications();
    navigate('/admin/support');
  };

  // Grouped Navigation Structure as per spec
  const navGroups = [
    {
      groupTitle: 'OVERVIEW',
      items: [
        { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      groupTitle: 'MANAGEMENT',
      items: [
        { label: 'Users', path: '/admin/users', icon: Users },
        { label: 'Subscriptions', path: '/admin/subscriptions', icon: Sparkles },
        { label: 'Payments', path: '/admin/payments', icon: WalletCards },
      ],
    },
    {
      groupTitle: 'GROWTH',
      items: [
        { label: 'Website Analytics', path: '/admin/analytics/visitors', icon: TrendingUp },
      ],
    },
    {
      groupTitle: 'FINANCE',
      items: [
        { label: 'Revenue Analytics', path: '/admin/revenue', icon: IndianRupee },
      ],
    },
    {
      groupTitle: 'OPERATIONS',
      items: [
        { label: 'Backups & Recovery', path: '/admin/backups', icon: DatabaseBackup },
        { label: 'Reports', path: '/admin/reports', icon: FileBarChart },
        { label: 'Notifications', path: '/admin/notifications', icon: Bell },
        { label: 'Support Tickets', path: '/admin/support', icon: LifeBuoy, badgeCount: unreadNotifications.length },
      ],
    },
    {
      groupTitle: 'ADMINISTRATION',
      items: [
        { label: 'Admins & Roles', path: '/admin/admins', icon: ShieldCheck },
        { label: 'Audit Logs', path: '/admin/audit-logs', icon: History },
        { label: 'System Settings', path: '/admin/settings', icon: Settings },
      ],
    },
  ];

  const currentFullPath = location.pathname + location.search;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex font-sans antialiased overflow-x-hidden">
      {/* Mobile Sidebar Overlay Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'
        }`}
      >
        {/* Sidebar Header: VEDIXA Logo & VEDIXA Admin */}
        <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <img src={vedixaLogo} alt="VEDIXA" className="h-7 w-auto object-contain" />
            <div className={`${!isSidebarOpen && 'lg:hidden'}`}>
              <h1 className="text-sm font-extrabold text-slate-900 leading-none tracking-tight">VEDIXA</h1>
              <p className="text-[10px] text-emerald-600 font-bold tracking-wide uppercase">Admin</p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grouped Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {navGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <h3 className={`px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ${!isSidebarOpen && 'lg:hidden'}`}>
                {group.groupTitle}
              </h3>
              {group.items.map((item, itemIdx) => {
                const Icon = item.icon;

                if (item.submenuKey) {
                  const isOpen = openSubmenus[item.submenuKey];
                  const isParentActive = item.items.some(
                    (sub) => currentFullPath === sub.path || (sub.path.includes('?') && location.pathname === sub.path.split('?')[0])
                  );

                  return (
                    <div key={itemIdx} className="space-y-0.5">
                      <button
                        onClick={() => toggleSubmenu(item.submenuKey)}
                        className={`w-full h-10 flex items-center justify-between px-2.5 rounded-lg text-xs font-semibold transition ${
                          isParentActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                        title={!isSidebarOpen ? item.label : undefined}
                      >
                        <div className="flex items-center space-x-2.5">
                          <Icon className={`w-4 h-4 shrink-0 stroke-[2] ${isParentActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                          <span className={`${!isSidebarOpen && 'lg:hidden'} truncate`}>{item.label}</span>
                        </div>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                            isOpen ? 'rotate-180' : ''
                          } ${!isSidebarOpen && 'lg:hidden'}`}
                        />
                      </button>
                      {isOpen && (
                        <div className={`pl-7 space-y-0.5 ${!isSidebarOpen && 'lg:hidden'}`}>
                          {item.items.map((sub, subIdx) => {
                            const isSubActive = sub.path.includes('?')
                              ? currentFullPath === sub.path
                              : location.pathname === sub.path && !location.search;

                            return (
                              <NavLink
                                key={subIdx}
                                to={sub.path}
                                className={`block h-8 px-2.5 leading-8 rounded-md text-[11px] font-medium transition ${
                                  isSubActive
                                    ? 'bg-emerald-50/80 text-emerald-700 font-bold'
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                              >
                                {sub.label}
                              </NavLink>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <NavLink
                    key={itemIdx}
                    to={item.path}
                    end={item.path === '/admin/dashboard'}
                    className={({ isActive }) =>
                      `h-10 flex items-center justify-between px-2.5 rounded-lg text-xs font-semibold transition ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`
                    }
                    title={!isSidebarOpen ? item.label : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 stroke-[2] ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                          <span className={`${!isSidebarOpen && 'lg:hidden'} truncate`}>{item.label}</span>
                        </div>
                        {item.badgeCount > 0 && (
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white shrink-0 ${
                              !isSidebarOpen && 'lg:hidden'
                            }`}
                          >
                            {item.badgeCount}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer: Standalone Logout Navigation Action */}
        <div className="p-3 border-t border-slate-200 shrink-0">
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="w-full h-10 flex items-center space-x-2.5 px-2.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
            title={!isSidebarOpen ? "Logout" : undefined}
          >
            <LogOut className="w-4 h-4 shrink-0 stroke-[2] text-slate-400" />
            <span className={`${!isSidebarOpen && 'lg:hidden'} truncate`}>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP HEADER */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-40 shrink-0">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-slate-500 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative hidden md:block w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search users, mobile, leads..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Live Support Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
                className="relative p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4 stroke-[2]" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadNotifications.length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Menu */}
              {isNotifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800">Support Notifications</h4>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      {unreadNotifications.length} Unread
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {unreadNotifications.length === 0 ? (
                      <p className="px-4 py-6 text-center text-xs text-slate-400 font-medium">
                        No pending support notifications
                      </p>
                    ) : (
                      unreadNotifications.map((notif) => (
                        <div
                          key={notif._id}
                          onClick={() => handleNotificationClick(notif)}
                          className="px-4 py-3 hover:bg-slate-50 cursor-pointer transition flex items-start space-x-3"
                        >
                          <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{notif.subject}</p>
                            <p className="text-[11px] text-slate-500 truncate">From: {notif.userName} ({notif.userMobile})</p>
                            <span className="text-[10px] text-slate-400 flex items-center space-x-1 mt-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatISTTime(notif.createdAt)}</span>
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-4 py-2 border-t border-slate-100 text-center">
                    <button
                      onClick={() => { setIsNotifDropdownOpen(false); navigate('/admin/support'); }}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline"
                    >
                      View Support Tickets →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Date Pill */}
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600">
              <span>{formatCurrentISTDateHeader()}</span>
            </div>

            {/* Admin Profile & Logout */}
            <div className="flex items-center space-x-2 border-l border-slate-200 pl-3">
              <div className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs flex items-center justify-center">
                S
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-bold text-slate-800 leading-tight">Super Admin</p>
                <p className="text-[10px] text-emerald-600 font-semibold">Active Session</p>
              </div>
              <button
                onClick={() => setIsLogoutModalOpen(true)}
                title="Logout"
                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition ml-1 cursor-pointer"
              >
                <LogOut className="w-4 h-4 stroke-[2]" />
              </button>
            </div>
          </div>
        </header>

        {/* PAGE BODY */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          <Outlet />
        </main>
      </div>

      {/* LOGOUT CONFIRMATION MODAL */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center space-x-3 text-red-600 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-red-50 rounded-2xl border border-red-100">
                <LogOut className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Confirm Logout</h3>
                <p className="text-xs text-slate-500 font-medium">VEDIXA Admin Panel</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Are you sure you want to logout from the VEDIXA Admin Panel? Your active session will be closed.
            </p>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Confirm Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

