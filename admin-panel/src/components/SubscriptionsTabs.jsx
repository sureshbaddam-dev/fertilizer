import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function SubscriptionsTabs() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { label: 'Overview', path: '/admin/subscriptions' },
    { label: 'Plans', path: '/admin/subscriptions/settings' },
    { label: 'Demo Requests', path: '/admin/subscriptions/demos' },
    { label: 'History', path: '/admin/subscriptions/history' },
  ];

  return (
    <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-6 font-sans">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              isActive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
