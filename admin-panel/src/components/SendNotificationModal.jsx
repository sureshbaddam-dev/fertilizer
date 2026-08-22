import React, { useState, useEffect } from 'react';
import { X, Bell, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { adminApiService } from '../services/adminApiService';

export default function SendNotificationModal({ isOpen, onClose, user, onSuccess }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('GENERAL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setMessage('');
      setType('GENERAL');
      setError('');
      setSuccessMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!user?._id) {
      setError('Target User ID is missing.');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a notification title.');
      return;
    }
    if (!message.trim()) {
      setError('Please enter a notification message.');
      return;
    }

    const validTypes = [
      'GENERAL',
      'IMPORTANT',
      'PAYMENT',
      'SUBSCRIPTION',
      'ACCOUNT',
      'SYSTEM_ANNOUNCEMENT',
      'SUBSCRIPTION_EXPIRY',
      'MAINTENANCE',
      'PROMOTIONAL',
      'SYSTEM',
    ];
    if (!validTypes.includes(type)) {
      setError('Selected notification type is invalid.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      await adminApiService.sendUserNotification({
        userId: user._id,
        title: title.trim(),
        message: message.trim(),
        notificationType: type,
        type: type.toLowerCase(),
      });

      setSuccessMsg('Notification sent successfully.');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to send notification. Please try again.';
      setError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-sans antialiased text-slate-800">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold border border-indigo-200">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Send Notification</h3>
              <p className="text-xs text-slate-500 font-medium">Send a notification to this user only.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Recipient Information Card */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1.5 text-xs font-medium text-slate-700">
          <div className="flex justify-between">
            <span className="text-slate-500">Recipient:</span>
            <span className="font-bold text-slate-900">{user.ownerName || user.username || 'User'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Email:</span>
            <span className="font-semibold text-slate-800">{user.email || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">User ID:</span>
            <span className="font-mono text-slate-600 select-all">{user._id}</span>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Notification Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Notification Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter notification title"
              disabled={isSubmitting}
              required
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Message <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your notification message..."
              rows={4}
              disabled={isSubmitting}
              required
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition disabled:bg-slate-100 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Notification Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition disabled:bg-slate-100 cursor-pointer font-medium"
            >
              <option value="GENERAL">General</option>
              <option value="IMPORTANT">Important</option>
              <option value="PAYMENT">Payment</option>
              <option value="SUBSCRIPTION">Subscription</option>
              <option value="ACCOUNT">Account</option>
              <option value="SYSTEM_ANNOUNCEMENT">System</option>
            </select>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Sending...' : 'Send Notification'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
