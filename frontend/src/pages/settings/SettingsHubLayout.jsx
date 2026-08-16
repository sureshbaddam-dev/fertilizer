import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Settings,
  Store,
  Tag,
  Receipt,
  Database,
  Users,
  Bell,
  HardDrive,
  Lock,
  Sliders,
  ChevronRight,
  ArrowLeft,
  Archive,
  ShieldCheck,
  User,
} from 'lucide-react';

const SETTINGS_TABS = [
  { name: 'User Profile', path: '/settings/user-profile', icon: User },
  { name: 'Shop Profile', path: '/settings/shop', icon: Store },
  { name: 'Shop Discount', path: '/settings/shop-discount', icon: Tag },
  { name: 'Taxes & GST', path: '/settings/taxes', icon: Receipt },
  { name: 'Security', path: '/settings/security', icon: Lock },
  { name: 'Preferences', path: '/settings/preferences', icon: Sliders },
  { name: 'Master Data', path: '/settings/master-data', icon: Database },
  { name: 'Notifications', path: '/settings/notifications', icon: Bell },
];

export default function SettingsHubLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const isLandingPage =
    location.pathname === '/settings' || location.pathname === '/settings/';

  const activeTab = SETTINGS_TABS.find(
    (tab) => location.pathname === tab.path || location.pathname.startsWith(tab.path + '/')
  );

  return (
    <div className="app-page-stack pb-6 font-sans">
      {/* ------------------------------------------------------------- */}
      {/* DESKTOP HEADER (Unchanged, lg:flex) */}
      {/* ------------------------------------------------------------- */}
      <div className="hidden lg:flex app-page-header md:flex-row md:items-center md:justify-between">
        <div className="app-page-header-meta">
          <div className="app-page-header-icon">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="section-title">ERP Settings &amp; System Configuration</h1>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200/70 bg-white/70 p-1.5 no-scrollbar">
          {SETTINGS_TABS.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <NavLink
                key={tab.name}
                to={tab.path}
                className={({ isActive }) =>
                  `inline-flex min-h-11 items-center gap-2 rounded-2xl px-3.5 text-sm font-semibold transition-all shrink-0 ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <IconComponent className="h-4 w-4" />
                <span>{tab.name}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MOBILE + TABLET HEADER (lg:hidden) */}
      {/* ------------------------------------------------------------- */}
      <div className="block lg:hidden">
        {isLandingPage ? (
          <div className="app-page-header flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="app-page-header-icon">
                <Settings className="h-5 w-5" />
              </div>
              <h1 className="section-title text-lg font-extrabold text-slate-900">
                ERP Settings
              </h1>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 mb-4 p-3 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer shrink-0"
              title="Back to Settings"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Settings Category
              </span>
              <span className="block truncate text-sm font-extrabold text-slate-900">
                {activeTab?.name || 'Settings'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MOBILE + TABLET CATEGORY CARDS (When on /settings landing) */}
      {/* ------------------------------------------------------------- */}
      {isLandingPage ? (
        <div>
          {/* Mobile: 1-col, Tablet: 2-col, Desktop: 3-col grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {SETTINGS_TABS.map((category) => {
              const IconComponent = category.icon;
              return (
                <button
                  key={category.name}
                  type="button"
                  onClick={() => navigate(category.path)}
                  className="flex items-center justify-between p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:border-emerald-500/50 hover:bg-emerald-50/30 transition-all cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 group-hover:bg-emerald-700 group-hover:text-white transition-colors">
                      <IconComponent className="h-5.5 w-5.5" />
                    </div>
                    <span className="truncate text-sm font-extrabold text-slate-900 group-hover:text-emerald-800">
                      {category.name}
                    </span>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-emerald-700 transition-colors" />
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Settings Sub-Route Outlet for Active Section */
        <Outlet />
      )}
    </div>
  );
}
