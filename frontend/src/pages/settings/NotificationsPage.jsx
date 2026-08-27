import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Save, MessageSquare, CheckCircle2, AlertCircle, Volume2, VolumeX, ShieldCheck, Smartphone, Check, X } from 'lucide-react';
import { settingService } from '../../services/settingService';
import { useSettings } from '../../contexts/SettingsContext';
import { useWebPush } from '../../hooks/useWebPush';

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { settings: s, isLoading } = useSettings();

  const userId = s?.userId || s?._id || 'user_default';
  const soundStorageKey = `vedixa_notif_sound_${userId}`;

  const { permission, isSubscribed, isLoading: webPushLoading, isIosPwa, subscribeToPush, unsubscribeFromPush } = useWebPush();

  // Notification Sound State (Default: ON)
  const [notifSound, setNotifSound] = useState(() => {
    try {
      return localStorage.getItem(soundStorageKey) || 'ON';
    } catch (e) {
      return 'ON';
    }
  });

  const [templates, setTemplates] = useState({
    invoiceWhatsappTemplate: '',
    ledgerWhatsappTemplate: '',
    outstandingReminderTemplate: '',
  });

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (s && Object.keys(s).length > 0) {
      setTemplates({
        invoiceWhatsappTemplate:
          s.invoiceWhatsappTemplate ||
          'Dear {{CUSTOMER_NAME}},\n\nThank you for purchasing from {{SHOP_NAME}}.\n\nInvoice No: {{INVOICE_NO}}\nInvoice Amount: ₹ {{AMOUNT}}\n\nPayment Link:\n{{UPI_PAYMENT_LINK}}\n\nThank you.\n{{SHOP_NAME}}\nPhone: {{SHOP_MOBILE}}',
        ledgerWhatsappTemplate:
          s.ledgerWhatsappTemplate ||
          '🌾 {{SHOP_NAME}}\n\nDear {{CUSTOMER_NAME}},\n\nPlease find your ledger statement summary (Period: {{PERIOD}}):\n\nTotal Purchases: ₹ {{TOTAL_PURCHASES}}\nTotal Paid: ₹ {{TOTAL_PAID}}\nOutstanding Amount: ₹ {{OUTSTANDING}}\n\nTo make payment instantly, click the link below:\n{{UPI_PAYMENT_LINK}}\n\nThank you.\n{{SHOP_NAME}}\nPhone: {{SHOP_MOBILE}}',
        outstandingReminderTemplate:
          s.outstandingReminderTemplate ||
          '🌾 {{SHOP_NAME}}\n\nDear {{CUSTOMER_NAME}},\n\nThis is a friendly reminder regarding your outstanding bill balance of ₹ {{OUTSTANDING}}.\n\nPayment Link:\n{{UPI_PAYMENT_LINK}}\n\nThank you.\n{{SHOP_NAME}}\nPhone: {{SHOP_MOBILE}}',
      });
    }
  }, [s]);

  const toggleSound = (mode) => {
    setNotifSound(mode);
    try {
      localStorage.setItem(soundStorageKey, mode);
    } catch (e) {}
    setSuccessMsg(`Notification sound preference set to ${mode}!`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const saveMutation = useMutation({
    mutationFn: (data) => settingService.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['shop-settings-profile']);
      setSuccessMsg('Settings updated successfully!');
      setErrorMsg('');
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (err) => {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to save settings');
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTemplates((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    saveMutation.mutate(templates);
  };

  if (isLoading) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-2xs text-center space-y-3 font-sans text-xs">
        <div className="w-5 h-5 border-2 border-[#047857] border-t-transparent rounded-full animate-spin mx-auto" />
        <span>Loading notification settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-xs">
      {/* 1. NOTIFICATION SYSTEM & SOUND PREFERENCE CARD (ALWAYS ACTIVE) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#047857] flex items-center justify-center border border-emerald-100">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <span>System Notifications</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> ALWAYS ENABLED
                </span>
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                System and support notifications are permanently enabled for your account. Customize audio alerts below.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {notifSound === 'ON' ? (
                <Volume2 className="w-4 h-4 text-[#047857]" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
              <span className="font-extrabold text-slate-900 text-xs">Notification Sound</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Play an audio chime when new support tickets or system notifications arrive on this device.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => toggleSound('ON')}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                notifSound === 'ON'
                  ? 'bg-[#047857] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>SOUND ON</span>
            </button>
            <button
              type="button"
              onClick={() => toggleSound('OFF')}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                notifSound === 'OFF'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>MUTE SOUND</span>
            </button>
          </div>
        </div>

        {/* WEB PUSH BROWSER NOTIFICATIONS CONTROL CARD */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-700" />
              <span className="font-extrabold text-slate-900 text-xs">Browser Web Push Notifications</span>
              {isSubscribed ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600" /> ACTIVE
                </span>
              ) : permission === 'denied' ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                  <X className="w-3 h-3 text-red-600" /> BLOCKED IN BROWSER
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                  NOT ENABLED
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Receive instant desktop/mobile system notifications even when the VEDIXA tab is closed or running in the background.
            </p>
            {isIosPwa && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-medium">
                📱 <strong>iPhone/iPad Users:</strong> iOS Safari requires adding VEDIXA to your Home Screen first ("Share" button → "Add to Home Screen"). Open VEDIXA from your Home Screen to enable Web Push.
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isSubscribed ? (
              <button
                type="button"
                disabled={webPushLoading}
                onClick={async () => {
                  try {
                    await unsubscribeFromPush();
                    setSuccessMsg('Web Push notifications disabled.');
                    setTimeout(() => setSuccessMsg(''), 3000);
                  } catch (err) {
                    setErrorMsg(err.message || 'Failed to disable Web Push.');
                  }
                }}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-extrabold transition cursor-pointer disabled:opacity-50"
              >
                {webPushLoading ? 'Updating...' : 'Disable Push Alerts'}
              </button>
            ) : (
              <button
                type="button"
                disabled={webPushLoading || permission === 'unsupported'}
                onClick={async () => {
                  try {
                    await subscribeToPush();
                    setSuccessMsg('Browser Web Push notifications enabled successfully!');
                    setTimeout(() => setSuccessMsg(''), 3000);
                  } catch (err) {
                    setErrorMsg(err.message || 'Could not enable Web Push.');
                  }
                }}
                className="px-4 py-2 bg-[#047857] hover:bg-[#036448] text-white rounded-xl text-xs font-extrabold transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{webPushLoading ? 'Connecting...' : 'Enable Push Notifications'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. WHATSAPP TEMPLATES MANAGER */}
      <form onSubmit={handleSave} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-gray-900">WhatsApp Message Templates Manager</h2>
            </div>
          </div>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="px-4 py-2.5 bg-[#047857] hover:bg-[#036448] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saveMutation.isPending ? 'Saving...' : 'Save Templates'}</span>
          </button>
        </div>

        {successMsg && (
          <div className="p-3 bg-emerald-50 text-[#047857] border border-emerald-200 rounded-xl font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Available Placeholders Helper Banner */}
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-600 text-[11px] space-y-1">
          <span className="font-bold text-gray-900 block">Available Dynamic Variables:</span>
          <div className="flex flex-wrap gap-2 font-mono text-[10px]">
            <span className="bg-white px-2 py-0.5 border rounded">{"{{SHOP_NAME}}"}</span>
            <span className="bg-white px-2 py-0.5 border rounded">{"{{SHOP_MOBILE}}"}</span>
            <span className="bg-white px-2 py-0.5 border rounded">{"{{CUSTOMER_NAME}}"}</span>
            <span className="bg-white px-2 py-0.5 border rounded">{"{{INVOICE_NO}}"}</span>
            <span className="bg-white px-2 py-0.5 border rounded">{"{{AMOUNT}}"}</span>
            <span className="bg-white px-2 py-0.5 border rounded">{"{{OUTSTANDING}}"}</span>
            <span className="bg-white px-2 py-0.5 border rounded">{"{{UPI_PAYMENT_LINK}}"}</span>
          </div>
        </div>

        {/* Templates Editor Cards */}
        <div className="space-y-4">
          {/* Invoice Template */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
            <label className="font-extrabold text-gray-900 block text-xs">Sales Invoice WhatsApp Template</label>
            <textarea
              rows={4}
              name="invoiceWhatsappTemplate"
              value={templates.invoiceWhatsappTemplate}
              onChange={handleChange}
              className="w-full p-3 bg-white border border-gray-300 rounded-xl font-mono text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#047857]/20"
            />
          </div>

          {/* Ledger Template */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
            <label className="font-extrabold text-gray-900 block text-xs">Customer Ledger Statement Template</label>
            <textarea
              rows={4}
              name="ledgerWhatsappTemplate"
              value={templates.ledgerWhatsappTemplate}
              onChange={handleChange}
              className="w-full p-3 bg-white border border-gray-300 rounded-xl font-mono text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#047857]/20"
            />
          </div>

          {/* Outstanding Reminder Template */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
            <label className="font-extrabold text-gray-900 block text-xs">Outstanding Due Reminder Template</label>
            <textarea
              rows={4}
              name="outstandingReminderTemplate"
              value={templates.outstandingReminderTemplate}
              onChange={handleChange}
              className="w-full p-3 bg-white border border-gray-300 rounded-xl font-mono text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#047857]/20"
            />
          </div>
        </div>
      </form>
    </div>
  );
}
