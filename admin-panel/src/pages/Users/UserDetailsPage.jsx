import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Database,
  Calendar,
  Phone,
  Mail,
  Activity,
  Award,
  HelpCircle,
  PauseCircle,
  PlayCircle,
  XCircle,
  ShieldAlert,
  ChevronDown,
  Copy,
  Check,
  Fingerprint,
  CreditCard,
  UserX,
  UserCheck,
  ShoppingBag,
  Users,
  FileText,
  PackageCheck,
  Receipt,
  MapPin,
  Bell,
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import GrantSubscriptionModal from '../../components/GrantSubscriptionModal';
import SendNotificationModal from '../../components/SendNotificationModal';
import TypeToConfirmModal from '../../components/TypeToConfirmModal';
import { adminApiService } from '../../services/adminApiService';

function formatAdminFullAddress(shop = {}, user = {}) {
  const rawAddr = (shop?.address || user?.address || '').trim();
  const village = (shop?.village || user?.village || '').trim();
  const mandal = (shop?.mandal || user?.mandal || '').trim();
  const district = (shop?.district || user?.district || '').trim();
  const state = (shop?.state || user?.state || '').trim();
  const pincode = (shop?.pincode || user?.pincode || '').trim();

  const parts = [];
  if (rawAddr) parts.push(rawAddr);
  if (village && !rawAddr.toLowerCase().includes(village.toLowerCase())) parts.push(village);
  if (mandal && !rawAddr.toLowerCase().includes(mandal.toLowerCase())) parts.push(mandal);
  if (district && !rawAddr.toLowerCase().includes(district.toLowerCase())) parts.push(district);
  if (state && !rawAddr.toLowerCase().includes(state.toLowerCase())) parts.push(state);

  let addressStr = parts.length > 0 ? parts.join(', ') : '';
  if (pincode && !addressStr.includes(pincode)) {
    addressStr = addressStr ? `${addressStr} - ${pincode}` : pincode;
  }

  return addressStr;
}

export default function UserDetailsPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const ticketRef = useRef(null);

  const searchParams = new URLSearchParams(location.search);
  const targetTicketId = searchParams.get('ticketId');

  const [details, setDetails] = useState(null);
  const [copiedUserId, setCopiedUserId] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [modalMode, setModalMode] = useState('GRANT'); // 'GRANT' | 'EXTEND' | 'DEMO'
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isSendNotifModalOpen, setIsSendNotifModalOpen] = useState(false);
  const [isManageMenuOpen, setIsManageMenuOpen] = useState(false);

  // Type To Confirm Modal State
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    description: '',
    requiredText: 'CONFIRM',
    confirmButtonLabel: 'Confirm',
    isDestructive: true,
    onConfirm: async () => {},
  });

  const fetchUserDetails = async () => {
    setIsLoading(true);
    try {
      const data = await adminApiService.getUserDetails(userId);
      setDetails(data);
    } catch (err) {
      console.error('Failed to load user details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  // Auto-scroll to highlighted ticket if ticketId query parameter exists
  useEffect(() => {
    if (targetTicketId && ticketRef.current) {
      setTimeout(() => {
        ticketRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    }
  }, [targetTicketId, details]);

  // User Deactivate / Reactivate Triggers (No Hard Delete)
  const triggerDeactivateUserModal = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Deactivate User Account',
      description: `This will suspend account access for ${details?.user?.ownerName}. Historical business data, subscriptions, and records will remain completely intact.`,
      requiredText: 'DEACTIVATE',
      confirmButtonLabel: 'Deactivate Account',
      isDestructive: true,
      onConfirm: async () => {
        await adminApiService.toggleUserStatus(userId, false);
        alert('User account deactivated successfully.');
        fetchUserDetails();
      },
    });
  };

  const triggerReactivateUserModal = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Reactivate User Account',
      description: `This will restore full login and access for ${details?.user?.ownerName}.`,
      requiredText: 'REACTIVATE',
      confirmButtonLabel: 'Reactivate Account',
      isDestructive: false,
      onConfirm: async () => {
        await adminApiService.toggleUserStatus(userId, true);
        alert('User account reactivated successfully.');
        fetchUserDetails();
      },
    });
  };

  // Subscription Action Triggers
  const triggerPauseModal = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Pause Subscription',
      description: `This will temporarily pause subscription access for ${details?.user?.ownerName}.`,
      requiredText: 'PAUSE',
      confirmButtonLabel: 'Pause Subscription',
      isDestructive: false,
      onConfirm: async () => {
        await adminApiService.pauseSubscription(userId);
        alert('Subscription paused successfully.');
        fetchUserDetails();
      },
    });
  };

  const triggerResumeModal = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Resume Subscription',
      description: `This will restore active subscription access for ${details?.user?.ownerName}.`,
      requiredText: 'RESUME',
      confirmButtonLabel: 'Resume Subscription',
      isDestructive: false,
      onConfirm: async () => {
        await adminApiService.resumeSubscription(userId);
        alert('Subscription resumed successfully.');
        fetchUserDetails();
      },
    });
  };

  const triggerCancelModal = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Cancel Subscription',
      description: `This will remove active subscription access for ${details?.user?.ownerName}. Historical subscription records will be preserved.`,
      requiredText: 'CANCEL',
      confirmButtonLabel: 'Confirm Cancellation',
      isDestructive: true,
      onConfirm: async () => {
        await adminApiService.cancelSubscription(userId, 'Cancelled by Admin');
        alert('Subscription cancelled successfully.');
        fetchUserDetails();
      },
    });
  };

  const triggerRevokeDemoModal = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Revoke Demo Subscription',
      description: `This will revoke trial access for ${details?.user?.ownerName}. Demo history will remain intact.`,
      requiredText: 'REVOKE',
      confirmButtonLabel: 'Confirm Revocation',
      isDestructive: true,
      onConfirm: async () => {
        await adminApiService.revokeDemoSubscription(userId, 'Demo revoked by Admin');
        alert('Demo access revoked successfully.');
        fetchUserDetails();
      },
    });
  };

  if (isLoading || !details) {
    return (
      <div className="p-12 text-center text-slate-400 font-medium">
        <Activity className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-2" />
        <p className="text-xs">Loading User Profile & Business Context...</p>
      </div>
    );
  }

  const { user, shop, subscription, subHistory = [], tickets = [], counts = {}, paymentSummary = {} } = details;
  const currentSubStatus = (subscription?.status || (subscription?.planName ? 'ACTIVE' : 'NO_SUBSCRIPTION')).toUpperCase();

  const formattedFullAddress = formatAdminFullAddress(shop, user);

  return (
    <div className="space-y-6 font-sans antialiased text-slate-800">
      {/* Back Button & Top Action Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/admin/users')}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Users</span>
        </button>

        <div className="flex flex-wrap items-center gap-3">
          {/* Send Notification Button */}
          <button
            onClick={() => setIsSendNotifModalOpen(true)}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
          >
            <Bell className="w-4 h-4" />
            <span>Send Notification</span>
          </button>

          {/* User Account Status Toggle (No Hard Delete) */}
          {user.isActive ? (
            <button
              onClick={triggerDeactivateUserModal}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition"
            >
              <UserX className="w-4 h-4" />
              <span>Deactivate Account</span>
            </button>
          ) : (
            <button
              onClick={triggerReactivateUserModal}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition"
            >
              <UserCheck className="w-4 h-4" />
              <span>Reactivate Account</span>
            </button>
          )}

          {/* Subscription Action Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsManageMenuOpen(!isManageMenuOpen)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>Manage Subscription</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {isManageMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 font-sans text-xs">
                {currentSubStatus === 'ACTIVE' && (
                  <>
                    <button
                      onClick={() => {
                        setModalMode('EXTEND');
                        setIsSubModalOpen(true);
                        setIsManageMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 font-bold text-emerald-700 flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Extend Subscription
                    </button>
                    <button
                      onClick={() => {
                        triggerPauseModal();
                        setIsManageMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 font-bold text-amber-700 flex items-center gap-2 cursor-pointer"
                    >
                      <PauseCircle className="w-3.5 h-3.5" /> Pause Subscription
                    </button>
                    <button
                      onClick={() => {
                        triggerCancelModal();
                        setIsManageMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 font-bold text-red-600 flex items-center gap-2 cursor-pointer border-t border-slate-100"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Unsubscribe / Cancel
                    </button>
                  </>
                )}

                {currentSubStatus === 'PAUSED' && (
                  <>
                    <button
                      onClick={() => {
                        triggerResumeModal();
                        setIsManageMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 font-bold text-emerald-700 flex items-center gap-2 cursor-pointer"
                    >
                      <PlayCircle className="w-3.5 h-3.5" /> Resume Subscription
                    </button>
                    <button
                      onClick={() => {
                        triggerCancelModal();
                        setIsManageMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 font-bold text-red-600 flex items-center gap-2 cursor-pointer border-t border-slate-100"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Unsubscribe / Cancel
                    </button>
                  </>
                )}

                {(currentSubStatus === 'NO_SUBSCRIPTION' || currentSubStatus === 'EXPIRED' || currentSubStatus === 'CANCELLED') && (
                  <>
                    <button
                      onClick={() => {
                        setModalMode('GRANT');
                        setIsSubModalOpen(true);
                        setIsManageMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 font-bold text-emerald-700 flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> + Grant Subscription
                    </button>
                    <button
                      onClick={() => {
                        setModalMode('DEMO');
                        setIsSubModalOpen(true);
                        setIsManageMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 font-bold text-amber-700 flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> + Grant Demo
                    </button>
                  </>
                )}

                {currentSubStatus === 'DEMO' && (
                  <>
                    <button
                      onClick={() => {
                        setModalMode('GRANT');
                        setIsSubModalOpen(true);
                        setIsManageMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 font-bold text-emerald-700 flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Grant Paid Subscription
                    </button>
                    <button
                      onClick={() => {
                        setModalMode('DEMO');
                        setIsSubModalOpen(true);
                        setIsManageMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 font-bold text-amber-700 flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Extend Demo
                    </button>
                    <button
                      onClick={() => {
                        triggerRevokeDemoModal();
                        setIsManageMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 font-bold text-red-600 flex items-center gap-2 cursor-pointer border-t border-slate-100"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Revoke Demo
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* USER PROFILE HEADER CARD */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold flex items-center justify-center text-xl shrink-0">
            {user.ownerName?.charAt(0) || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{user.ownerName}</h1>
              <StatusBadge status={user.isActive ? 'ACTIVE' : 'DEACTIVATED'} />
            </div>

            <p className="text-xs text-emerald-700 font-bold mt-0.5">
              {shop?.shopName && shop.shopName.trim() ? shop.shopName.trim() : 'No data'}
            </p>

            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5">
                <Fingerprint className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>User ID: <strong className="text-slate-900">{user._id}</strong></span>
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(user._id);
                  setCopiedUserId(true);
                  setTimeout(() => setCopiedUserId(false), 2500);
                }}
                title="Copy User ID to Clipboard"
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 transition cursor-pointer flex items-center gap-1 text-[11px] font-bold"
              >
                {copiedUserId ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied
                  </span>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2 font-medium">
              <span className="flex items-center gap-1.5 font-mono font-bold text-slate-700">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {user.mobile && user.mobile.trim() ? user.mobile.trim() : 'No data'}
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {user.email && user.email.trim() ? user.email.trim() : 'No data'}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Reg: {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : 'No data'}
              </span>
            </div>

            {formattedFullAddress && (
              <div className="flex items-start gap-1.5 text-xs text-slate-600 font-medium mt-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span className="break-words max-w-2xl">{formattedFullAddress}</span>
              </div>
            )}
          </div>
        </div>

        {/* CURRENT SUBSCRIPTION SUMMARY CARD */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 min-w-[280px]">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Subscription</span>
            <StatusBadge status={currentSubStatus} />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Plan:</span>
              <span className="font-bold text-slate-900">{subscription?.planName || 'No Active Plan'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Duration:</span>
              <span className="font-semibold text-slate-700">{subscription?.durationLabel || 'No data'}</span>
            </div>
            <div className="flex items-center justify-between font-mono">
              <span className="text-slate-500">Expiry:</span>
              <span className="font-bold text-emerald-700">
                {subscription?.expiryDate ? new Date(subscription.expiryDate).toLocaleDateString('en-IN') : 'No data'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Plan Amount:</span>
              <span className="font-bold text-slate-900">
                {subscription?.amountPaid !== undefined && subscription?.amountPaid !== null ? `₹${subscription.amountPaid}` : 'No data'}
              </span>
            </div>
          </div>
        </div>
      </div>



      {/* PAYMENT SUMMARY SECTION (REQUIREMENT 3 & 4) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-emerald-600" />
          <span>Payment Summary</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Total Amount Paid</span>
            <p className="text-2xl font-extrabold text-emerald-700">
              ₹ {(paymentSummary?.totalAmountPaid || 0).toLocaleString('en-IN')}
            </p>
            <span className="text-[10px] font-semibold text-emerald-600 block">Calculated from payment records</span>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Successful Payments</span>
            <p className="text-2xl font-extrabold text-slate-900">
              {paymentSummary?.successfulPaymentCount || 0}
            </p>
            <span className="text-[10px] font-semibold text-slate-400 block">Completed subscription transactions</span>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Last Payment Date</span>
            <p className="text-lg font-bold font-mono text-slate-800">
              {paymentSummary?.lastPaymentDate ? new Date(paymentSummary.lastPaymentDate).toLocaleDateString('en-IN') : 'No data'}
            </p>
            <span className="text-[10px] font-semibold text-slate-400 block">Most recent payment timestamp</span>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Current Plan Amount</span>
            <p className="text-2xl font-extrabold text-blue-700">
              {paymentSummary?.currentSubscriptionAmount !== undefined && paymentSummary?.currentSubscriptionAmount !== null
                ? `₹${paymentSummary.currentSubscriptionAmount}`
                : 'No data'}
            </p>
            <span className="text-[10px] font-semibold text-slate-400 block">Active subscription cost</span>
          </div>
        </div>
      </div>

      {/* BUSINESS SUMMARY COUNTS (REQUIREMENT 2 & 6) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600" />
          <span>Business Summary</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase">Total Products</span>
              <PackageCheck className="w-4 h-4 text-teal-600" />
            </div>
            <p className="text-2xl font-extrabold text-teal-700">{counts.products || 0}</p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase">Total Customers</span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-extrabold text-emerald-700">{counts.customers || 0}</p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase">Total Bills (Sales)</span>
              <FileText className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-extrabold text-amber-700">{counts.invoices || 0}</p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase">Total Purchases</span>
              <ShoppingBag className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-extrabold text-purple-700">{counts.purchases || 0}</p>
          </div>
        </div>
      </div>

      {/* SUPPORT TICKETS SECTION */}
      <div ref={ticketRef} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-amber-600" />
            <span>Support Tickets Context ({tickets.length})</span>
          </span>
          {targetTicketId && (
            <span className="text-xs bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-full animate-pulse">
              Highlighted Ticket: {targetTicketId}
            </span>
          )}
        </h3>

        {tickets.length === 0 ? (
          <p className="text-xs text-slate-400 font-medium py-4 text-center">No support tickets submitted by this user.</p>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => {
              const isTarget = targetTicketId && (t.ticketId === targetTicketId || t._id === targetTicketId);

              return (
                <div
                  key={t._id}
                  className={`p-4 rounded-xl border transition ${
                    isTarget
                      ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/30'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-900">{t.ticketId || `#TKT-${t._id.slice(-4)}`}</span>
                      <StatusBadge status={t.status} />
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {new Date(t.createdAt).toLocaleDateString('en-IN')} {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-2">{t.subject}</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{t.description || t.message}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SUBSCRIPTION & GRANT HISTORY TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-600" />
          <span>Subscription & Grant History</span>
        </h3>

        {subHistory.length === 0 ? (
          <p className="text-xs text-slate-400 font-medium py-4 text-center">No previous subscription history recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Plan</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Start Date</th>
                  <th className="p-3">Expiry Date</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Granted By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subHistory.map((sh) => (
                  <tr key={sh._id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{sh.planName}</td>
                    <td className="p-3 font-semibold">{sh.durationLabel || 'No data'}</td>
                    <td className="p-3 font-mono">{sh.startDate ? new Date(sh.startDate).toLocaleDateString('en-IN') : 'No data'}</td>
                    <td className="p-3 font-mono">{sh.expiryDate ? new Date(sh.expiryDate).toLocaleDateString('en-IN') : 'No data'}</td>
                    <td className="p-3 font-bold text-emerald-700">{sh.amountPaid !== undefined ? `₹${sh.amountPaid}` : 'No data'}</td>
                    <td className="p-3"><StatusBadge status={sh.source} /></td>
                    <td className="p-3 font-medium text-slate-500">{sh.grantedByAdminName || 'Online System'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grant / Extend / Demo Subscription Modal */}
      <GrantSubscriptionModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        user={user}
        currentSubscription={subscription}
        mode={modalMode}
        onSuccess={() => fetchUserDetails()}
      />

      {/* Send Single-User Notification Modal */}
      <SendNotificationModal
        isOpen={isSendNotifModalOpen}
        onClose={() => setIsSendNotifModalOpen(false)}
        user={user}
        onSuccess={() => fetchUserDetails()}
      />

      {/* Type To Confirm Modal for Account Status Toggle or Sub Cancel */}
      <TypeToConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
        title={confirmConfig.title}
        description={confirmConfig.description}
        requiredText={confirmConfig.requiredText}
        confirmButtonLabel={confirmConfig.confirmButtonLabel}
        isDestructive={confirmConfig.isDestructive}
        onConfirm={confirmConfig.onConfirm}
      />
    </div>
  );
}
