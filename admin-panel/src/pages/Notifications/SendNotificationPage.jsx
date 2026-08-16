import React, { useState, useEffect } from 'react';
import { Bell, Send, CheckCircle2, History } from 'lucide-react';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { adminApiService } from '../../services/adminApiService';

export default function SendNotificationPage() {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetAudience: 'ALL_USERS',
    notificationType: 'SYSTEM_ANNOUNCEMENT',
  });
  const [history, setHistory] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchHistory = async () => {
    try {
      const data = await adminApiService.getNotificationsHistory();
      setHistory(data || []);
    } catch (err) {
      console.error('Failed to load notification history:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSending(true);
    setSuccessMsg('');
    try {
      await adminApiService.sendAdminNotification(formData);
      setSuccessMsg('Notification broadcasted successfully!');
      setFormData({ title: '', message: '', targetAudience: 'ALL_USERS', notificationType: 'SYSTEM_ANNOUNCEMENT' });
      fetchHistory();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert('Failed to send notification: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const columns = [
    { header: 'Title', key: 'title', render: (row) => <span className="font-bold text-slate-900">{row.title}</span> },
    { header: 'Message', key: 'message', render: (row) => <span className="text-xs text-slate-600">{row.message}</span> },
    { header: 'Target Audience', key: 'targetAudience', render: (row) => <StatusBadge status={row.targetAudience} /> },
    { header: 'Type', key: 'notificationType', render: (row) => <span className="text-[10px] font-bold text-slate-500">{row.notificationType}</span> },
    { header: 'Delivered', key: 'deliveredCount', render: (row) => <span className="font-bold text-emerald-700">{row.deliveredCount} Users</span> },
    { header: 'Sent Date', key: 'createdAt', render: (row) => new Date(row.createdAt).toLocaleString('en-IN') },
    { header: 'Sent By Admin', key: 'sentByAdminName' },
  ];

  return (
    <div className="space-y-8 font-sans antialiased text-slate-800 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-600" />
          <span>System Broadcasts & User Notifications</span>
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">Broadcast system announcements, subscription expiry warnings, or promotional updates to users.</p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* FORM CARD */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">Create New Broadcast Notification</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Target Audience</label>
            <select
              value={formData.targetAudience}
              onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs font-bold focus:outline-none focus:border-emerald-600"
            >
              <option value="ALL_USERS">All Users</option>
              <option value="EXPIRING_SOON">Expiring Subscription Users (Next 7 Days)</option>
              <option value="DEMO_USERS">Active Demo Users</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Notification Category</label>
            <select
              value={formData.notificationType}
              onChange={(e) => setFormData({ ...formData, notificationType: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs font-bold focus:outline-none focus:border-emerald-600"
            >
              <option value="SYSTEM_ANNOUNCEMENT">System Announcement</option>
              <option value="SUBSCRIPTION_EXPIRY">Subscription Expiry Warning</option>
              <option value="PAYMENT">Payment & Billing Update</option>
              <option value="MAINTENANCE">Scheduled Maintenance</option>
              <option value="PROMOTIONAL">Promotional Offer</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Notification Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Important System Maintenance Tonight"
            required
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs font-bold focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Message Content</label>
          <textarea
            rows={3}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            placeholder="Enter detailed notification text..."
            required
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSending}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isSending ? 'Broadcasting...' : 'Broadcast Notification'}</span>
          </button>
        </div>
      </form>

      {/* NOTIFICATION HISTORY */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <History className="w-4 h-4 text-amber-600" />
          <span>Notification History Log</span>
        </h2>
        <DataTable columns={columns} data={history} searchPlaceholder="Search notifications..." />
      </div>
    </div>
  );
}
