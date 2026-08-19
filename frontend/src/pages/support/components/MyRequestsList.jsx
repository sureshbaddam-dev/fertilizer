import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Clock, CheckCircle2, AlertCircle, HelpCircle, UserCheck, Lock } from 'lucide-react';
import { supportService } from '../../../services/supportService';

const TABS = [
  { id: 'ALL', label: 'All' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'WAITING_FOR_USER', label: 'Waiting for You' },
  { id: 'COMPLETED', label: 'Resolved' },
  { id: 'CLOSED', label: 'Closed' },
];

export default function MyRequestsList({ onSelectRequest, onRaiseRequest }) {
  const [activeTab, setActiveTab] = useState('ALL');

  const { data: ticketsRes, isLoading } = useQuery({
    queryKey: ['user-requests'],
    queryFn: () => supportService.getUserTickets(),
    refetchInterval: 15000,
  });

  const allTickets = ticketsRes?.data?.tickets || ticketsRes?.tickets || [];

  const getTabCount = (tabId) => {
    if (tabId === 'ALL') return allTickets.length;
    if (tabId === 'COMPLETED') {
      return allTickets.filter((t) => (t.status || '').toUpperCase() === 'COMPLETED' || (t.status || '').toUpperCase() === 'RESOLVED').length;
    }
    return allTickets.filter((t) => (t.status || '').toUpperCase() === tabId).length;
  };

  const filteredTickets = allTickets.filter((t) => {
    const st = (t.status || 'PENDING').toUpperCase();
    if (activeTab === 'ALL') return true;
    if (activeTab === 'COMPLETED') return st === 'COMPLETED' || st === 'RESOLVED';
    return st === activeTab;
  });

  const getStatusBadge = (status) => {
    const st = (status || 'PENDING').toUpperCase();
    if (st === 'COMPLETED' || st === 'RESOLVED') {
      return (
        <span className="px-2.5 py-1 text-[11px] font-extrabold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Resolved</span>
        </span>
      );
    }
    if (st === 'IN_PROGRESS') {
      return (
        <span className="px-2.5 py-1 text-[11px] font-extrabold rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 w-fit">
          <Clock className="w-3 h-3 text-blue-600 animate-pulse" />
          <span>In Progress</span>
        </span>
      );
    }
    if (st === 'WAITING_FOR_USER') {
      return (
        <span className="px-2.5 py-1 text-[11px] font-extrabold rounded-full bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1 w-fit">
          <UserCheck className="w-3 h-3 text-amber-600" />
          <span>Waiting for You</span>
        </span>
      );
    }
    if (st === 'CLOSED') {
      return (
        <span className="px-2.5 py-1 text-[11px] font-extrabold rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1 w-fit">
          <Lock className="w-3 h-3 text-slate-500" />
          <span>Closed</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-[11px] font-extrabold rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-fit">
        <AlertCircle className="w-3 h-3 text-amber-600" />
        <span>Pending</span>
      </span>
    );
  };

  const getPriorityIndicator = (priority) => {
    const pr = (priority || 'Medium').toLowerCase();
    if (pr === 'high') {
      return (
        <span className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping" />
          <span>High</span>
        </span>
      );
    }
    if (pr === 'low') {
      return (
        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-400" />
          <span>Low</span>
        </span>
      );
    }
    return (
      <span className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        <span>Medium</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 font-sans antialiased text-slate-800 pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">My Requests</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Track and manage your ongoing support requests and conversations.
          </p>
        </div>
        <button
          type="button"
          onClick={onRaiseRequest}
          className="px-4 py-2 bg-[#047857] hover:bg-[#065f46] text-white font-bold text-xs rounded-xl shadow-2xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <span>+ Raise a New Request</span>
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 text-xs">
        {TABS.map((tab) => {
          const count = getTabCount(tab.id);
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 font-bold rounded-xl shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-[#047857] text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  isActive ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Requests Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    Loading your requests...
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 space-y-3">
                    <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-800 text-sm">No help requests found in this view</p>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      Have a question or need assistance with VEDIXA? Raise a new support request anytime.
                    </p>
                    <button
                      onClick={onRaiseRequest}
                      className="px-4 py-2 bg-[#047857] text-white font-bold text-xs rounded-xl cursor-pointer"
                    >
                      + Raise a New Request
                    </button>
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => (
                  <tr
                    key={t._id}
                    onClick={() => onSelectRequest(t._id || t.ticketId)}
                    className="hover:bg-slate-50/90 transition cursor-pointer group"
                  >
                    <td className="py-4 px-4 font-mono font-bold text-emerald-700 group-hover:underline">
                      {t.ticketId}
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-bold text-slate-900 group-hover:text-emerald-800 transition">
                        {t.subject}
                      </p>
                      <p className="text-[11px] text-slate-500 line-clamp-1 max-w-xs">{t.description}</p>
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-600">{t.category || 'General'}</td>
                    <td className="py-4 px-4">{getPriorityIndicator(t.priority)}</td>
                    <td className="py-4 px-4">{getStatusBadge(t.status)}</td>
                    <td className="py-4 px-4 text-right">
                      <div className="inline-flex items-center gap-1 font-medium text-slate-500">
                        <span>
                          {new Date(t.updatedAt || t.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          {new Date(t.updatedAt || t.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
