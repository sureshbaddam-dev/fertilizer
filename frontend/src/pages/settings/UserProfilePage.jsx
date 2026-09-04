import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, ShieldCheck, CreditCard, Sparkles, Save, CheckCircle2, ArrowRight } from 'lucide-react';
import { authService } from '../../services/authService';
import { subscriptionService } from '../../services/subscriptionService';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import PageLayout from '../../components/ui/PageHeaderContainer';
import UserAvatar from '../../components/ui/UserAvatar';
import { useAuth } from '../../contexts/AuthContext';

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

  // Fetch User Account Profile (Shared cache with TopNavbar)
  const { data: userRes, isLoading: isUserLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: authService.getProfile,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch Current Subscription Status
  const { data: subRes } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: subscriptionService.getMySubscription,
  });

  const currentUser = userRes?.data || userRes || authUser || authService.getCurrentUser() || {};
  const currentSub = subRes?.data?.subscription || subRes?.subscription || null;

  useEffect(() => {
    if (currentUser) {
      setFormData({
        ownerName: currentUser.ownerName || '',
        mobile: currentUser.mobile || '',
        email: currentUser.email || '',
      });
    }
  }, [userRes, authUser]);

  const profileMutation = useMutation({
    mutationFn: (data) => authService.updateProfile(data),
    onSuccess: (res) => {
      const updatedUser = res?.data || res;
      if (updatedUser) {
        updateUser(updatedUser);
      }
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      setSaveSuccessMsg('User account profile updated successfully.');
      setSaveErrorMsg('');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    },
    onError: (err) => {
      setSaveErrorMsg(err?.message || 'Failed to update user profile.');
      setSaveSuccessMsg('');
    },
  });

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setSaveSuccessMsg('');
    setSaveErrorMsg('');
    profileMutation.mutate(formData);
  };

  const daysRemaining = currentSub?.expiryDate
    ? Math.max(0, Math.ceil((new Date(currentSub.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <PageLayout title="User Profile & Security" icon={User}>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Toast Alerts */}
        {saveSuccessMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold rounded-2xl flex items-center gap-2 animate-fadeIn shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
        {saveErrorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold rounded-2xl flex items-center gap-2 animate-fadeIn shadow-xs">
            <span>{saveErrorMsg}</span>
          </div>
        )}

        {/* 1. Personal Account Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <UserAvatar src={currentUser.profileImage} name={currentUser.ownerName} size={44} />
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">Personal Account Details</h2>
              <p className="text-xs text-slate-500 font-medium">Manage your personal owner identity and contact information.</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Owner Name</label>
                <Input
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  placeholder="Enter owner full name"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number (Login ID)</label>
                <Input type="text" value={formData.mobile} disabled className="bg-slate-50 text-slate-500 cursor-not-allowed" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="owner@example.com"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={profileMutation.isPending}
                className="btn-agri-primary text-xs font-extrabold px-5 py-2.5 rounded-xl flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{profileMutation.isPending ? 'Saving...' : 'Save Account Profile'}</span>
              </Button>
            </div>
          </form>
        </div>

        {/* 2. Subscription Details Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">Account Subscription & Plan</h2>
                <p className="text-xs text-slate-500 font-medium">Your active VEDIXA subscription details.</p>
              </div>
            </div>
            <button
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
                {currentSub?.planCode || currentSub?.planName || 'STARTER'}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Status</span>
              <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{currentSub?.paymentStatus === 'SUCCESS' || currentSub?.status === 'ACTIVE' ? 'Active' : 'Active'}</span>
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Expiry Date</span>
              <span className="text-xs font-bold text-slate-700 font-mono">
                {currentSub?.expiryDate ? new Date(currentSub.expiryDate).toLocaleDateString() : '30 Days Remaining'}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Days Remaining</span>
              <span className="text-xs font-bold text-emerald-700 font-mono">{daysRemaining || 30} Days</span>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
