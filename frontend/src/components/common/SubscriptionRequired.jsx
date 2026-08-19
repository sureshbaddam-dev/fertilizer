import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
import SubscriptionRequiredModal from './SubscriptionRequiredModal';

export default function SubscriptionRequired({ featureName = 'this feature' }) {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(true);

  return (
    <>
      <SubscriptionRequiredModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        featureName={featureName}
      />

      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 font-sans text-slate-800">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-xl text-center space-y-6 relative overflow-hidden">
          <div className="mx-auto w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center shadow-2xs">
            <Lock className="w-8 h-8 text-[#047857] stroke-[2.2]" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Feature Locked
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              Access to <strong className="text-slate-900">{featureName}</strong> requires an active VEDIXA ERP subscription plan.
            </p>
          </div>

          <div className="pt-2 space-y-2.5">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full btn-agri-primary py-3 text-xs font-black uppercase tracking-wider text-white rounded-xl shadow-md cursor-pointer"
            >
              Unlock Feature
            </button>

            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
