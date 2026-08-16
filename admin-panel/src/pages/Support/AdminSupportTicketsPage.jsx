import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, RefreshCw, CheckCircle2, Clock, MessageSquare, AlertCircle, ArrowUpRight, Copy, Fingerprint } from 'lucide-react';
import { adminApiService } from '../../services/adminApiService';

export default function AdminSupportTicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newStatus, setNewStatus] = useState('COMPLETED');
  const [adminReply, setAdminReply] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [filterStatus]);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const data = await adminApiService.getSupportTickets(filterStatus === 'ALL' ? '' : filterStatus);
      setTickets(data || []);
    } catch (_err) {
      // Graceful fallback
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setIsUpdating(true);
    setSuccessMsg('');
    try {
      await adminApiService.updateSupportTicketStatus(selectedTicket._id, newStatus, adminReply);
      setSuccessMsg(`Ticket status updated to ${newStatus} successfully!`);
      setTimeout(() => {
        setSelectedTicket(null);
        setSuccessMsg('');
        fetchTickets();
      }, 1200);
    } catch (_err) {
      setSuccessMsg('Failed to update ticket status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    const st = (status || 'PENDING').toUpperCase();
    if (st === 'COMPLETED' || st === 'RESOLVED') {
      return (
        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1 w-fit">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Resolved</span>
        </span>
      );
    }
    if (st === 'IN_PROGRESS') {
      return (
        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center space-x-1 w-fit">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>In Progress</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center space-x-1 w-fit">
        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
        <span>Pending</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 font-sans antialiased text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-emerald-600" />
            <span>Support Tickets &amp; User Questions</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Single source of truth for user questions, issues, and support ticket management.
          </p>
        </div>
        <button
          onClick={fetchTickets}
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs px-3.5 py-2 rounded-xl transition flex items-center space-x-2 shadow-xs cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
        {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
              filterStatus === st
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {st === 'ALL' ? 'All Tickets' : st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Support Tickets Table (Clean User Column without duplicate User ID) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Submitted</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    Loading support tickets...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    No support tickets found for this status.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50">
                    <td
                      onClick={() => t.userId?._id && navigate(`/users/${t.userId._id}?ticketId=${t._id}`)}
                      className="py-3.5 px-4 font-mono font-bold text-emerald-700 hover:underline cursor-pointer"
                      title="Click to view User Profile"
                    >
                      {t.ticketId || `#TKT-${t._id.slice(-4)}`}
                    </td>
                    <td
                      onClick={() => t.userId?._id && navigate(`/users/${t.userId._id}?ticketId=${t._id}`)}
                      className="py-3.5 px-4 cursor-pointer hover:bg-slate-100/60 transition"
                      title="Click to view User Profile"
                    >
                      <p className="font-bold text-slate-900 flex items-center space-x-1">
                        <span>{t.userId?.ownerName || t.userName || 'User'}</span>
                        <ArrowUpRight className="w-3 h-3 text-slate-400" />
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">{t.userId?.mobile || t.userMobile || 'N/A'}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-800">{t.subject}</p>
                      <p className="text-[11px] text-slate-500 truncate max-w-xs">{t.description}</p>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600">{t.category || 'General'}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {new Date(t.createdAt).toLocaleDateString()} {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(t.status)}</td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedTicket(t);
                          setNewStatus(t.status === 'PENDING' ? 'IN_PROGRESS' : 'COMPLETED');
                          setAdminReply(t.adminReply || '');
                        }}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs px-3 py-1.5 rounded-lg border border-emerald-200 transition cursor-pointer"
                      >
                        Manage Status
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MANAGE TICKET MODAL (FULL USER DETAILS + TICKET METADATA + COMPLETION TIME) */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 max-w-lg w-full space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <span>Manage Support Ticket {selectedTicket.ticketId}</span>
              </h3>
              <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                {successMsg}
              </div>
            )}

            {/* 1. USER DETAILS SECTION */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">User Details</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">User Name</span>
                  <span className="font-extrabold text-slate-900 text-xs block">{selectedTicket.userId?.ownerName || selectedTicket.userName || 'User'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">User ID</span>
                  <span className="font-mono font-bold text-blue-700 text-xs flex items-center gap-1">
                    <span>{String(selectedTicket.userId?._id || selectedTicket.userId)}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(String(selectedTicket.userId?._id || selectedTicket.userId));
                        setCopiedId(true);
                        setTimeout(() => setCopiedId(false), 2000);
                      }}
                      className="text-[10px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      {copiedId ? 'Copied!' : 'Copy'}
                    </button>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Mobile</span>
                  <span className="font-mono font-bold text-slate-800 text-xs block">{selectedTicket.userId?.mobile || selectedTicket.userMobile || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Business / Shop</span>
                  <span className="font-bold text-emerald-700 text-xs block">{selectedTicket.businessName || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* 2. TICKET DETAILS SECTION */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <span className="font-mono font-bold text-emerald-800 text-xs">Ticket ID: {selectedTicket.ticketId}</span>
                <span className="text-[11px] font-medium text-slate-500">Category: {selectedTicket.category || 'General'}</span>
              </div>
              <div>
                <span className="font-extrabold text-slate-900 text-xs block">{selectedTicket.subject}</span>
                <p className="text-slate-700 bg-white p-3 rounded-xl border border-slate-200 text-xs mt-1 leading-relaxed">
                  {selectedTicket.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 text-slate-500 font-medium">
                <div>Submitted: <strong className="text-slate-800">{new Date(selectedTicket.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</strong></div>
                <div>Last Updated: <strong className="text-slate-800">{new Date(selectedTicket.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</strong></div>
                {(selectedTicket.completedAt || selectedTicket.resolvedAt) && (
                  <div className="col-span-2 text-emerald-700 font-bold">
                    Completed: <strong className="font-mono">{new Date(selectedTicket.completedAt || selectedTicket.resolvedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* STATUS UPDATE FORM */}
            <form onSubmit={handleUpdateStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Update Ticket Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-600"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Admin Resolution Note / Reply</label>
                <textarea
                  rows={3}
                  value={adminReply}
                  onChange={(e) => setAdminReply(e.target.value)}
                  placeholder="Provide resolution details or notes for the user..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isUpdating ? 'Saving...' : 'Save & Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
