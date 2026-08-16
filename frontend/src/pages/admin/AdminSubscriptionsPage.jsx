import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Plus, CheckCircle2, UserCheck, Calendar, Zap, AlertCircle } from 'lucide-react';
import PageLayout from '../../components/ui/PageLayout';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { subscriptionService } from '../../services/subscriptionService';

export default function AdminSubscriptionsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [targetUserId, setTargetUserId] = useState('');
  const [planCode, setPlanCode] = useState('PROFESSIONAL');
  const [durationDays, setDurationDays] = useState(30);
  const [customTokens, setCustomTokens] = useState(15);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch Subscription Plans
  const { data: plansRes } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: subscriptionService.getPlans,
  });

  const plans = plansRes?.data?.plans || plansRes?.plans || [];

  // Admin Free Activation Mutation
  const activateMutation = useMutation({
    mutationFn: subscriptionService.adminActivate,
    onSuccess: (res) => {
      setSuccessMsg('Subscription activated manually for user. Activation Type: ADMIN_MANUAL (Payment: NOT REQUIRED).');
      setErrorMsg('');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
    },
    onError: (err) => {
      setErrorMsg(err?.message || 'Failed to activate subscription');
      setSuccessMsg('');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!targetUserId.trim()) {
      setErrorMsg('Please enter a target User / Shop ID.');
      return;
    }
    activateMutation.mutate({
      targetUserId: targetUserId.trim(),
      planCode,
      durationDays: Number(durationDays),
      customDiscountTokens: Number(customTokens),
    });
  };

  return (
    <PageLayout
      title="Admin SaaS Subscription Management"
      subtitle="Manually activate user subscriptions without payment (ADMIN_MANUAL), set plan duration, and manage tokens."
      actions={
        <Button onClick={() => setIsModalOpen(true)} className="btn-agri-primary flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          <span>Manual Free Activation</span>
        </Button>
      }
    >
      <div className="space-y-6">
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-[#047857] text-xs font-bold rounded-2xl flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#047857]" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Info Banner */}
        <div className="p-5 bg-gradient-to-r from-[#047857] to-emerald-800 text-white rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-300" />
            <h3 className="text-base font-extrabold">Admin Subscription Controller</h3>
          </div>
          <p className="text-xs text-emerald-100 max-w-2xl leading-relaxed">
            As an Administrator, you can grant free active subscriptions to any store account without creating payment transactions.
            The activation will be recorded as <strong>ADMIN_MANUAL</strong> with <strong>Payment: NOT REQUIRED</strong>.
          </p>
        </div>

        {/* Plans Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div key={p.code} className="p-4 bg-white border border-gray-200 rounded-xl space-y-2 shadow-2xs">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-gray-900 text-xs">{p.name}</span>
                <span className="text-xs font-mono font-bold text-[#047857]">₹{p.price}/mo</span>
              </div>
              <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-semibold inline-block">
                Default Tokens: {p.discountTokens}
              </span>
              <p className="text-[11px] text-gray-500">{p.features?.length || 0} Features included</p>
            </div>
          ))}
        </div>
      </div>

      {/* MANUAL ACTIVATION MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Admin Free Subscription Activation">
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg">{errorMsg}</div>
          )}

          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl font-semibold">
            Activation Type: <strong>ADMIN_MANUAL</strong> | Payment: <strong>NOT REQUIRED</strong>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Target User / Shop MongoDB ID</label>
            <Input
              type="text"
              placeholder="Enter User ID (e.g. 660f...)"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full text-xs font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Select Subscription Plan</label>
            <Select value={planCode} onChange={(e) => setPlanCode(e.target.value)} className="w-full text-xs">
              <option value="STARTER">STARTER (₹199 / month)</option>
              <option value="PROFESSIONAL">PROFESSIONAL (₹399 / month)</option>
              <option value="PREMIUM">PREMIUM (₹699 / month)</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Duration (Days)</label>
              <Input
                type="number"
                min="1"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className="w-full text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Discount Tokens</label>
              <Input
                type="number"
                min="0"
                value={customTokens}
                onChange={(e) => setCustomTokens(e.target.value)}
                className="w-full text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={activateMutation.isPending}
              className="btn-agri-primary text-xs flex items-center gap-1"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{activateMutation.isPending ? 'Activating...' : 'Activate Subscription Free'}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  );
}
