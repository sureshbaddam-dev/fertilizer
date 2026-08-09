import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Store,
  Save,
  QrCode,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import { settingService } from '../../services/settingService';
import { useSettings } from '../../contexts/SettingsContext';
import Button from '../../components/ui/Button';

export default function ShopProfilePage() {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    shopName: '',
    ownerName: '',
    mobile: '',
    whatsappNumber: '',
    email: '',
    address: '',
    gstNumber: '',
    panNumber: '',
    fertilizerLicense: '',
    pesticideLicense: '',
    seedLicense: '',
    invoicePrefix: '',
    financialYear: '',
    currency: '',
    timeZone: '',
    dateFormat: '',
    upiId: '',
    upiPayeeName: '',
  });

  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveErrorMsg, setSaveErrorMsg] = useState('');

  // 1. Consume Shared Settings from Context (Single Source of Truth)
  const { settings, isLoading } = useSettings();

  const logoInputRef = React.useRef(null);
  const ownerPhotoInputRef = React.useRef(null);

  useEffect(() => {
    const s = settings || {};
    if (s && Object.keys(s).length > 0) {
      setFormData({
        shopName: s.shopName || '',
        ownerName: s.ownerName || '',
        mobile: s.mobile || '',
        whatsappNumber: s.whatsappNumber || s.mobile || '',
        email: s.email || '',
        address: s.address || '',
        gstNumber: s.gstNumber || '',
        panNumber: s.panNumber || '',
        fertilizerLicense: s.fertilizerLicense || '',
        pesticideLicense: s.pesticideLicense || '',
        seedLicense: s.seedLicense || '',
        invoicePrefix: s.invoicePrefix || 'INV-2026',
        financialYear: s.financialYear || '2026-2027',
        currency: s.currency || 'INR (₹)',
        timeZone: s.timeZone || 'IST (UTC+05:30)',
        dateFormat: s.dateFormat || 'DD/MM/YYYY',
        upiId: s.upiId || '',
        upiPayeeName: s.upiPayeeName || '',
        logoUrl: s.logoUrl || s.shopLogo || '',
        ownerPhotoUrl: s.ownerPhotoUrl || '',
      });
    }
  }, [settings]);

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setSaveErrorMsg('Logo file size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, logoUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleOwnerPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setSaveErrorMsg('Owner photo size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, ownerPhotoUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  // 2. Save Settings Mutation
  const saveMutation = useMutation({
    mutationFn: (data) => settingService.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['shop-settings-global']);
      queryClient.invalidateQueries(['shop-settings-profile']);
      queryClient.invalidateQueries(['dashboard-summary']);
      setSaveSuccessMsg('Shop Profile & Logo updated and saved permanently to database!');
      setSaveErrorMsg('');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    },
    onError: (err) => {
      setSaveErrorMsg(err?.response?.data?.message || err?.message || 'Failed to save settings');
      setSaveSuccessMsg('');
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaveSuccessMsg('');
    setSaveErrorMsg('');
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-2xs text-center space-y-3 font-sans text-xs">
        <div className="w-5 h-5 border-2 border-[#047857] border-t-transparent rounded-full animate-spin mx-auto" />
        <span>Loading Shop Profile settings from database...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 font-sans text-xs">
      
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={logoInputRef}
        onChange={handleLogoUpload}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />
      <input
        type="file"
        ref={ownerPhotoInputRef}
        onChange={handleOwnerPhotoUpload}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />

      <div className="app-card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="app-page-header-icon">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h2 className="section-title">Shop Profile &amp; Business Settings</h2>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          icon={Save}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Success / Error Banners */}
      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 text-[#047857] border border-emerald-200 rounded-xl font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}
      {saveErrorMsg && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{saveErrorMsg}</span>
        </div>
      )}

      {/* Form Fields Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Logo & Branding Upload */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 bg-gray-50/70 border border-gray-200/80 rounded-2xl space-y-3 text-center">
            <h3 className="text-xs font-extrabold text-gray-800 text-left">Business Shop Logo</h3>
            <div className="relative w-28 h-28 rounded-2xl bg-white border border-gray-200 p-2 mx-auto flex items-center justify-center shadow-2xs group">
              {formData.logoUrl ? (
                <img src={formData.logoUrl} alt="Shop Logo" className="w-full h-full object-contain rounded-xl" />
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-400">
                  <ImageIcon className="w-8 h-8 text-gray-300" />
                  <span className="text-[10px] font-bold mt-1">No Logo</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="px-3 py-1.5 bg-[#047857] hover:bg-[#036448] text-white font-bold rounded-xl text-[11px] flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{formData.logoUrl ? 'Change Logo' : 'Upload Logo'}</span>
              </button>

              {formData.logoUrl && (
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, logoUrl: '' }))}
                  className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl cursor-pointer"
                  title="Remove Logo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <p className="text-[10.5px] text-gray-500 font-medium">
              JPG, PNG, WebP up to 2MB. Appears on Invoices, Ledger, Navbar, and Reports.
            </p>
          </div>

          {/* UPI QR & Payment Info Card */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-gray-900">
              <QrCode className="w-4 h-4 text-[#047857]" />
              <span>UPI Payment Gateway</span>
            </div>
            <div className="font-mono font-bold text-[#047857] text-xs pt-1">
              Active VPA: {formData.upiId || 'rameshfertilizers@ybl'}
            </div>
          </div>
        </div>

        {/* Right Column: Business Profile Fields */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Shop Name & Owner Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-gray-700 block">Shop / Business Name *</label>
              <input
                type="text"
                name="shopName"
                value={formData.shopName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#047857]/20 focus:border-[#047857]"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-gray-700 block">Owner / Proprietor Name *</label>
              <input
                type="text"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#047857]/20 focus:border-[#047857]"
              />
            </div>
          </div>

          {/* Contact Mobile, WhatsApp & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-gray-700 block">Mobile Phone</label>
              <input
                type="tel"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#047857]/20 focus:border-[#047857]"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-gray-700 block">WhatsApp Number</label>
              <input
                type="tel"
                name="whatsappNumber"
                value={formData.whatsappNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#047857]/20 focus:border-[#047857]"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-gray-700 block">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#047857]/20 focus:border-[#047857]"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1">
            <label className="font-bold text-gray-700 block">Full Shop Address</label>
            <textarea
              rows={2}
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#047857]/20 focus:border-[#047857]"
            />
          </div>

          {/* GSTIN & PAN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-gray-700 block">GSTIN Number</label>
              <input
                type="text"
                name="gstNumber"
                value={formData.gstNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono uppercase font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#047857]/20 focus:border-[#047857]"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-gray-700 block">PAN Number</label>
              <input
                type="text"
                name="panNumber"
                value={formData.panNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono uppercase font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#047857]/20 focus:border-[#047857]"
              />
            </div>
          </div>

          {/* Agri Licenses Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-gray-700 block">Fertilizer License No.</label>
              <input
                type="text"
                name="fertilizerLicense"
                value={formData.fertilizerLicense}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono uppercase text-gray-900 text-[11px]"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-gray-700 block">Pesticide License No.</label>
              <input
                type="text"
                name="pesticideLicense"
                value={formData.pesticideLicense}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono uppercase text-gray-900 text-[11px]"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-gray-700 block">Seed License No.</label>
              <input
                type="text"
                name="seedLicense"
                value={formData.seedLicense}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono uppercase text-gray-900 text-[11px]"
              />
            </div>
          </div>

          {/* UPI Configuration Section */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
            <h3 className="font-extrabold text-gray-900 text-xs flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-[#047857]" />
              <span>UPI Payment Gateway Configuration</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-gray-700 block">UPI VPA ID (e.g. shop@ybl, 9848081875@ibl)</label>
                <input
                  type="text"
                  name="upiId"
                  value={formData.upiId}
                  onChange={handleChange}
                  placeholder="merchant@ybl"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-mono text-emerald-800 font-bold focus:outline-none focus:ring-2 focus:ring-[#047857]/20"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-gray-700 block">Payee Business Name (on PhonePe/GPay)</label>
                <input
                  type="text"
                  name="upiPayeeName"
                  value={formData.upiPayeeName}
                  onChange={handleChange}
                  placeholder="RAMESH FERTILIZERS"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#047857]/20"
                />
              </div>
            </div>
          </div>

          {/* System Formatting Preferences */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
            <div className="space-y-1">
              <label className="font-bold text-gray-700 block">Invoice Prefix</label>
              <input
                type="text"
                name="invoicePrefix"
                value={formData.invoicePrefix}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-gray-700 block">Financial Year</label>
              <input
                type="text"
                name="financialYear"
                value={formData.financialYear}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-gray-700 block">Currency</label>
              <input
                type="text"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-gray-700 block">Date Format</label>
              <input
                type="text"
                name="dateFormat"
                value={formData.dateFormat}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold"
              />
            </div>
          </div>

        </div>

      </div>
    </form>
  );
}
