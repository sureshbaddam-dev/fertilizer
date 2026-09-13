import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Sparkles, Save, CheckCircle2, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { authService } from '../../services/authService';
import { subscriptionService } from '../../services/subscriptionService';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import PageLayout from '../../components/ui/PageHeaderContainer';
import UserAvatar from '../../components/ui/UserAvatar';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../contexts/ToastContext';

export default function UserProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: authUser, updateUser } = useAuth();

  const [formData, setFormData] = useState({
    ownerName: '',
    mobile: '',
    email: '',
  });

  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveErrorMsg, setSaveErrorMsg] = useState('');

  // 1. Fetch Subscription Details
  const {
    data: subRes,
    isLoading: _isLoadingSub,
    isError: _isSubError,
    refetch: _refetchSub,
  } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: () => subscriptionService.getMySubscription(),
  });

  const currentSub = subRes?.data?.subscription || subRes?.subscription || subRes?.data || subRes;

  // 2. Fetch User Profile
  const {
    data: userRes,
    isLoading: isLoadingUser,
    isError: isUserError,
    error: _userError,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authService.getProfile(),
  });

  // Authoritative resolved current user
  const currentUser = userRes?.data || userRes || authUser;

  // Sync state whenever profile or authUser is resolved/updated
  useEffect(() => {
    if (currentUser) {
      setFormData({
        ownerName: currentUser.ownerName || '',
        mobile: currentUser.mobile || '',
        email: currentUser.email || '',
      });
    }
  }, [currentUser]);

  const profileMutation = useMutation({
    mutationFn: (data) => authService.updateProfile(data),
    onSuccess: (res) => {
      const updatedUser = res?.data || res;
      if (updatedUser) {
        updateUser(updatedUser);
      }
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('User account profile updated successfully');
      setSaveSuccessMsg('User account profile updated successfully.');
      setSaveErrorMsg('');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    },
    onError: (err) => {
      const msg = err?.message || 'Failed to update user profile. Please try again.';
      toast.error(msg);
      setSaveErrorMsg(msg);
      setSaveSuccessMsg('');
    },
  });

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!formData.ownerName.trim()) {
      setSaveErrorMsg('Owner Name cannot be empty.');
      return;
    }
    setSaveSuccessMsg('');
    setSaveErrorMsg('');
    profileMutation.mutate({ ownerName: formData.ownerName.trim() });
  };

  // Safe date calculations
  const daysRemaining = (() => {
    if (!currentSub?.expiryDate) return 0;
    const exp = new Date(currentSub.expiryDate);
    if (isNaN(exp.getTime())) return 0;
    const diff = exp.getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  const formattedExpiryDate = (() => {
    if (!currentSub?.expiryDate) return '30 Days Remaining';
    const exp = new Date(currentSub.expiryDate);
    if (isNaN(exp.getTime())) return '30 Days Remaining';
    return exp.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  })();

  // Initial loading state if neither query nor context has user data yet
  if (isLoadingUser && !authUser) {
    return (
      <PageLayout title="User Profile & Security" icon={User}>
        <div className="max-w-4xl mx-auto p-8 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center space-y-3 font-sans">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-100 border-t-emerald-600 animate-spin" />
          <p className="text-xs font-bold text-slate-700">Loading user profile details...</p>
        </div>
      </PageLayout>
    );
  }

  // Initial error state if user fetch completely fails and no cached user
  if (isUserError && !currentUser) {
    return (
      <PageLayout title="User Profile & Security" icon={User}>
        <div className="max-w-4xl mx-auto p-8 bg-white rounded-2xl border border-rose-200 shadow-sm flex flex-col items-center justify-center space-y-4 text-center font-sans">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">Failed to load profile details</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">Please check your network connection and try again.</p>
          </div>
          <button
            type="button"
            onClick={() => refetchUser()}
            className="px-4 py-2 bg-[#047857] hover:bg-[#036046] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="User Profile & Security" icon={User}>
      <div className="max-w-4xl mx-auto space-y-6 pb-12 font-sans">
        {/* Toast / Status Alerts */}
        {saveSuccessMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold rounded-2xl flex items-center gap-2 animate-fadeIn shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
        {saveErrorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold rounded-2xl flex items-center gap-2 animate-fadeIn shadow-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{saveErrorMsg}</span>
          </div>
        )}

        {/* 1. Personal Account Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <UserAvatar
              src={currentUser?.profileImage}
              name={currentUser?.ownerName || authUser?.ownerName || 'User'}
              size={44}
            />
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">Personal Account Details</h2>
              <p className="text-xs text-slate-500 font-medium">Manage your personal owner identity and contact information.</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Owner Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  placeholder="Enter owner full name"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Number (Login ID)
                </label>
                <Input
                  type="text"
                  value={formData.mobile}
                  disabled
                  className="bg-slate-100/80 text-slate-500 font-semibold cursor-not-allowed select-none"
                />
                <p className="text-[11px] text-slate-400 font-medium mt-1">
                  Permanent login ID phone number.
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address (Permanent Account ID)
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-slate-100/80 text-slate-500 font-semibold cursor-not-allowed select-none"
                />
                <p className="text-[11px] text-slate-400 font-medium mt-1">
                  Permanent registered login email (cannot be modified).
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={profileMutation.isPending}
                className="btn-agri-primary text-xs font-extrabold px-5 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{profileMutation.isPending ? 'Saving...' : 'Save Changes'}</span>
              </Button>
            </div>
          </form>
        </div>

        {/* 2. Subscription Details Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold border border-amber-100">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">Account Subscription &amp; Plan</h2>
                <p className="text-xs text-slate-500 font-medium">Your active VEDIXA subscription details.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/subscription/plans')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#047857] hover:bg-[#036046] text-white text-xs font-extrabold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <span>Upgrade Plan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-100">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Current Plan</span>
              <span className="text-sm font-black text-slate-900 tracking-tight">
                {currentSub?.planName || currentSub?.planCode || 'STARTER'}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Status</span>
              <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{currentSub?.paymentStatus === 'SUCCESS' || currentSub?.status === 'ACTIVE' || !currentSub?.status ? 'Active' : currentSub.status}</span>
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Expiry Date</span>
              <span className="text-xs font-bold text-slate-700 font-mono">
                {formattedExpiryDate}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Days Remaining</span>
              <span className="text-xs font-bold text-emerald-700 font-mono">
                {daysRemaining > 0 ? `${daysRemaining} Days` : '30 Days'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
