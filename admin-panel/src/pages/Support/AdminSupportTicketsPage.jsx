import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HelpCircle,
  RefreshCw,
  CheckCircle2,
  Clock,
  MessageSquare,
  AlertCircle,
  Search,
  UserCheck,
  Lock,
  Paperclip,
  Send,
  Copy,
  Image as ImageIcon,
} from 'lucide-react';
import { adminApiService } from '../../services/adminApiService';

const STATUS_TABS = [
  { id: 'ALL', label: 'All Requests' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'WAITING_FOR_USER', label: 'Waiting for User' },
  { id: 'COMPLETED', label: 'Resolved' },
  { id: 'CLOSED', label: 'Closed' },
];

export default function AdminSupportTicketsPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [tickets, setTickets] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Selected Request Modal State
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [detailedTicket, setDetailedTicket] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [newStatus, setNewStatus] = useState('IN_PROGRESS');
  const [adminReplyMessage, setAdminReplyMessage] = useState('');
  const [adminAttachments, setAdminAttachments] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [filterStatus, filterPriority, filterCategory]);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const data = await adminApiService.getSupportTickets({
        status: filterStatus,
        priority: filterPriority,
        category: filterCategory,
        search: searchQuery,
      });
      setTickets(data || []);
    } catch (_err) {
      // Graceful fallback
    } fontally: {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTickets();
  };

  const handleOpenTicketDetails = async (t) => {
    setSelectedTicket(t);
    setNewStatus(t.status === 'PENDING' ? 'IN_PROGRESS' : t.status);
    setAdminReplyMessage('');
    setAdminAttachments([]);
    setSuccessMsg('');
    setErrorMsg('');
    setIsLoadingDetails(true);

    try {
      const detailed = await adminApiService.getSupportTicketById(t._id || t.ticketId);
      setDetailedTicket(detailed || t);
    } catch (_err) {
      setDetailedTicket(t);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    setErrorMsg('');
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const data = await adminApiService.uploadSupportAttachment(formData);
        if (data?.url) {
          setAdminAttachments((prev) => [...prev, data.url]);
        }
      }
    } catch (_err) {
      setErrorMsg('Failed to upload file attachment.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendReplySubmit = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;
    if (!adminReplyMessage.trim() && !adminAttachments.length && newStatus === selectedTicket.status) {
      setErrorMsg('Please enter a reply message or select a new status.');
      return;
    }

    setIsUpdating(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      if (adminReplyMessage.trim() || adminAttachments.length) {
        await adminApiService.addAdminSupportReply(
          selectedTicket._id,
          adminReplyMessage.trim(),
          newStatus,
          adminAttachments
        );
      } else {
        await adminApiService.updateSupportTicketStatus(selectedTicket._id, newStatus);
      }

      setSuccessMsg('Request updated and user notified successfully!');
      setTimeout(async () => {
        const refreshed = await adminApiService.getSupportTicketById(selectedTicket._id);
        setDetailedTicket(refreshed);
        setSelectedTicket(refreshed);
        setAdminReplyMessage('');
        setAdminAttachments([]);
        setSuccessMsg('');
        fetchTickets();
      }, 1000);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to update request.');
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
          <Clock className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
          <span>In Progress</span>
        </span>
      );
    }
    if (st === 'WAITING_FOR_USER') {
      return (
        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-800 border border-amber-300 flex items-center space-x-1 w-fit">
          <UserCheck className="w-3.5 h-3.5 text-amber-600" />
          <span>Waiting for User</span>
        </span>
      );
    }
    if (st === 'CLOSED') {
      return (
        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center space-x-1 w-fit">
          <Lock className="w-3.5 h-3.5 text-slate-500" />
          <span>Closed</span>
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

  const getPriorityBadge = (priority) => {
    const pr = (priority || 'Medium').toLowerCase();
    if (pr === 'high') {
      return (
        <span className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-600" />
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-emerald-600" />
            <span>Support / Help Requests</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Single source of truth for user questions, issues, and help request management.
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

      {/* Search & Filters Toolbar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Request ID, user name, mobile, or subject..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap pt-1 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 font-bold rounded-xl transition cursor-pointer ${
                  filterStatus === tab.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700"
            >
              <option value="ALL">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Support Requests Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Submitted</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    Loading help requests...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    No help requests found matching your filters.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50">
                    <td
                      onClick={() => handleOpenTicketDetails(t)}
                      className="py-3.5 px-4 font-mono font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      {t.ticketId}
                    </td>
                    <td
                      onClick={() => {
                        const rawUserId = typeof t.userId === 'object' ? t.userId?._id : (t.userId || t._id);
                        if (rawUserId) navigate(`/admin/users/${rawUserId}?ticketId=${t._id}`);
                      }}
                      className="py-3.5 px-4 cursor-pointer hover:bg-slate-100/60 transition"
                      title="Click to view Admin User Profile"
                    >
                      <p className="font-bold text-slate-900">
                        {t.userId?.ownerName || t.userName || 'User'}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {t.userId?.mobile || t.userMobile || 'N/A'}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-800">{t.subject}</p>
                      <p className="text-[11px] text-slate-500 truncate max-w-xs">{t.description}</p>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600">{t.category || 'General'}</td>
                    <td className="py-3.5 px-4">{getPriorityBadge(t.priority)}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {new Date(t.createdAt).toLocaleDateString()}{' '}
                      {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(t.status)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenTicketDetails(t)}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs px-3 py-1.5 rounded-lg border border-emerald-200 transition cursor-pointer"
                      >
                        Manage / Reply
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAILED MANAGEMENT & CONVERSATION MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 max-w-2xl w-full space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <span>Manage Help Request {selectedTicket.ticketId}</span>
              </h3>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            {/* 1. USER DETAILS (WITH RECOVERY CANONICAL MONGO USER ID) */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                User Details
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">User Name</span>
                  <span className="font-extrabold text-slate-900 text-xs block">
                    {selectedTicket.userId?.ownerName || selectedTicket.userName || 'User'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Mobile</span>
                  <span className="font-mono font-bold text-slate-800 text-xs block">
                    {selectedTicket.userId?.mobile || selectedTicket.userMobile || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Business / Shop</span>
                  <span className="font-bold text-emerald-700 text-xs block">
                    {selectedTicket.businessName || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">User ID (Recovery)</span>
                  <span className="font-mono font-bold text-blue-700 text-[11px] flex items-center gap-1">
                    <span className="truncate max-w-[90px]">
                      {String(selectedTicket.userId?._id || selectedTicket.userId)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(String(selectedTicket.userId?._id || selectedTicket.userId));
                        setCopiedId(true);
                        setTimeout(() => setCopiedId(false), 2000);
                      }}
                      className="text-[10px] text-slate-500 hover:text-slate-800 underline cursor-pointer shrink-0"
                    >
                      {copiedId ? 'Copied!' : 'Copy'}
                    </button>
                  </span>
                </div>
              </div>
            </div>

            {/* 2. ORIGINAL PROBLEM */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <span className="font-mono font-bold text-emerald-800 text-xs">
                  {selectedTicket.ticketId}
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  Category: {selectedTicket.category || 'General'}
                </span>
              </div>
              <div>
                <span className="font-extrabold text-slate-900 text-xs block">{selectedTicket.subject}</span>
                <p className="text-slate-700 bg-white p-3 rounded-xl border border-slate-200 text-xs mt-1 leading-relaxed">
                  {selectedTicket.description}
                </p>
              </div>

              {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedTicket.attachments.map((att, idx) => (
                    <a
                      key={idx}
                      href={att}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-medium text-emerald-700 flex items-center gap-1"
                    >
                      <ImageIcon className="w-3 h-3 text-emerald-600" />
                      <span>{att.split('/').pop()}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* 3. CONVERSATION THREAD */}
            {detailedTicket?.messages && detailedTicket.messages.length > 0 && (
              <div className="space-y-3 border-t border-b border-slate-100 py-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Conversation Thread
                </span>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {detailedTicket.messages.map((msg, idx) => {
                    const isAdmin = msg.sender === 'ADMIN';
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl text-xs font-medium border space-y-1 ${
                          isAdmin
                            ? 'bg-purple-50/70 border-purple-200 text-purple-950'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-[11px]">
                            {isAdmin ? 'VEDIXA Support (Admin)' : (msg.senderName || 'User')}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400">
                            {new Date(msg.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="leading-relaxed">{msg.message}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STATUS UPDATE & ADMIN REPLY FORM */}
            <form onSubmit={handleSendReplySubmit} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Update Request Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-600"
                >
                  <option value="PENDING">PENDING (Pending Admin)</option>
                  <option value="IN_PROGRESS">IN_PROGRESS (In Progress)</option>
                  <option value="WAITING_FOR_USER">WAITING_FOR_USER (Waiting for User Reply)</option>
                  <option value="COMPLETED">COMPLETED / RESOLVED (Resolved)</option>
                  <option value="CLOSED">CLOSED (Closed)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Admin Reply / Message to User
                </label>
                <textarea
                  rows={3}
                  value={adminReplyMessage}
                  onChange={(e) => setAdminReplyMessage(e.target.value)}
                  placeholder="Provide answer, reply, or resolution note for the user..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Attachments for Admin */}
              <div className="flex items-center justify-between">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*,.pdf"
                  className="hidden"
                  multiple
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>{isUploading ? 'Uploading...' : 'Attach Screenshot'}</span>
                </button>

                {adminAttachments.length > 0 && (
                  <span className="text-xs text-emerald-700 font-bold">
                    {adminAttachments.length} file(s) attached
                  </span>
                )}
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating || isUploading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isUpdating ? 'Saving...' : 'Send Reply & Save Status'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
