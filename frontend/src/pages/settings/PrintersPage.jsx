import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Printer, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { settingService } from '../../services/settingService';
import { useSettings } from '../../contexts/SettingsContext';

export default function PrintersPage() {
  const queryClient = useQueryClient();

  const [printerData, setPrinterData] = useState({
    printerType: 'Thermal',
    thermalPaperWidth: '80mm',
    invoiceTemplate: 'Standard',
    autoPrintOnSave: false,
  });

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { settings: s, isLoading } = useSettings();

  useEffect(() => {
    if (s && Object.keys(s).length > 0) {
      setPrinterData({
        printerType: s.printerType || 'Thermal',
        thermalPaperWidth: s.thermalPaperWidth || '80mm',
        invoiceTemplate: s.invoiceTemplate || 'Standard',
        autoPrintOnSave: Boolean(s.autoPrintOnSave),
      });
    }
  }, [settingsApi]);

  const saveMutation = useMutation({
    mutationFn: (data) => settingService.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['shop-settings-profile']);
      setSuccessMsg('Printer preferences saved permanently to database!');
      setErrorMsg('');
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (err) => {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to save printer settings');
    },
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPrinterData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    saveMutation.mutate(printerData);
  };

  if (isLoading) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-2xs text-center space-y-3 font-sans text-xs">
        <div className="w-5 h-5 border-2 border-[#047857] border-t-transparent rounded-full animate-spin mx-auto" />
        <span>Loading printer configuration settings...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-5 font-sans text-xs">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-gray-900">Printers &amp; Invoice Format Settings</h2>
            <p className="text-xs text-gray-500 font-medium">Configure thermal printer paper sizes, A4 invoice layouts, and auto-print preferences.</p>
          </div>
        </div>
        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="px-4 py-2.5 bg-[#047857] hover:bg-[#036448] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saveMutation.isPending ? 'Saving...' : 'Save Printer Settings'}</span>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Receipt Printer Box */}
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
          <h3 className="font-extrabold text-gray-900 text-xs">Receipt Printer Setup</h3>
          <div className="space-y-3">
            <div>
              <label className="font-semibold text-gray-700 block">Default Printer Type</label>
              <select
                name="printerType"
                value={printerData.printerType}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-gray-900 font-bold"
              >
                <option value="Thermal">3-Inch Thermal POS Printer (80mm)</option>
                <option value="A4">Standard A4 Laser / Inkjet Printer</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-gray-700 block">Thermal Paper Size</label>
              <select
                name="thermalPaperWidth"
                value={printerData.thermalPaperWidth}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-gray-900 font-bold"
              >
                <option value="80mm">80mm (3 Inch Standard)</option>
                <option value="58mm">58mm (2 Inch Compact)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Invoice Format Template Box */}
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
          <h3 className="font-extrabold text-gray-900 text-xs">Invoice Document Template</h3>
          <div className="space-y-3">
            <div>
              <label className="font-semibold text-gray-700 block">Print Template Format</label>
              <select
                name="invoiceTemplate"
                value={printerData.invoiceTemplate}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-gray-900 font-bold"
              >
                <option value="Standard">Standard Agri GST Tax Invoice (with Logo &amp; QR)</option>
                <option value="Compact">Compact Receipt Layout</option>
              </select>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                <input
                  type="checkbox"
                  name="autoPrintOnSave"
                  checked={printerData.autoPrintOnSave}
                  onChange={handleChange}
                  className="w-4 h-4 rounded text-[#047857] focus:ring-[#047857]"
                />
                <span>Automatically trigger print dialog after saving new invoice</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
