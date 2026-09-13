import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import BrandLogo from '../../components/common/BrandLogo';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-white to-emerald-50/20 flex flex-col items-center justify-center p-4 font-sans text-slate-800 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-900/5 p-8 flex flex-col items-center text-center space-y-6">
        {/* Brand Logo Header */}
        <div className="p-2 rounded-2xl bg-white border border-emerald-100/80 shadow-2xs">
          <BrandLogo imgClassName="h-10 w-auto" />
        </div>

        {/* 404 Status Icon */}
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-2xs">
          <FileQuestion className="w-7 h-7" />
        </div>

        {/* Heading & Subtext */}
        <div className="space-y-2">
          <div className="inline-block px-3 py-1 bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-black rounded-full uppercase tracking-wider">
            Error 404
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Page Not Found
          </h1>
          <p className="text-sm font-medium text-slate-600 max-w-sm mx-auto leading-relaxed">
            The page you are looking for doesn&apos;t exist, has been removed, or the link is broken.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="w-full sm:flex-1 h-11 px-5 bg-[#047857] hover:bg-[#036046] active:scale-[0.98] text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Go to Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:flex-1 h-11 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl flex items-center justify-center gap-2 border border-slate-200 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        </div>

        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest pt-2">
          VEDIXA Enterprise ERP
        </p>
      </div>
    </div>
  );
}
