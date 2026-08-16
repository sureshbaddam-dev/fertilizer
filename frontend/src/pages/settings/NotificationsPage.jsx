import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Save, MessageSquare, CheckCircle2, AlertCircle } from 'lucide-react';
import { settingService } from '../../services/settingService';
import { useSettings } from '../../contexts/SettingsContext';

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const [templates, setTemplates] = useState({
    invoiceWhatsappTemplate: '',
    ledgerWhatsappTemplate: '',
    outstandingReminderTemplate: '',
  });

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { settings: s, isLoading } = useSettings();

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

  const saveMutation = useMutation({
    mutationFn: (data) => settingService.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['shop-settings-profile']);
      setSuccessMsg('WhatsApp message templates updated and saved to database!');
      setErrorMsg('');
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (err) => {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to save templates');
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
        <span>Loading WhatsApp template settings...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-5 font-sans text-xs">
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
  );
}
