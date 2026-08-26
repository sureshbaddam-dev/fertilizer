import React from 'react';
import { Outlet } from 'react-router-dom';
import { CheckCircle2, Shield, ShieldCheck, Smile, Heart, Sun, ChevronDown } from 'lucide-react';
import BrandLogo from '../components/common/BrandLogo';
import loginProductsImg from '../assets/login_products.png';
import PageTracker from '../components/PageTracker';

export default function AuthLayout() {
  return (
    <div className="min-h-screen lg:h-screen w-full bg-slate-100 flex items-center justify-center p-2 sm:p-3 md:p-4 lg:p-6 font-sans overflow-y-auto lg:overflow-hidden">
      <PageTracker />
      {/* Main Container Card */}
      <div className="w-full max-w-5xl xl:max-w-6xl bg-white md:bg-emerald-50/40 rounded-2xl md:rounded-3xl border border-emerald-100/80 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 max-h-full lg:max-h-[92vh] my-auto">
        
        {/* ========================================================= */}
        {/* DESKTOP / LAPTOP / TABLET LEFT BRANDING PANEL (≥768px)   */}
        {/* ========================================================= */}
        <div className="hidden md:flex md:col-span-6 lg:col-span-7 flex-col justify-between p-4 sm:p-5 lg:p-7 relative bg-gradient-to-b from-emerald-50/70 via-emerald-50/30 to-emerald-100/50 border-r border-emerald-100/60 overflow-y-auto">
          <div className="space-y-3 lg:space-y-4">
            {/* Brand Logo */}
            <BrandLogo textScale="lg" />

            {/* Headline */}
            <div className="space-y-0.5">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
                Smart Billing for
              </h1>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-extrabold text-emerald-800 tracking-tight">
                Fertilizers, Seeds & Pesticides
              </h2>
            </div>

            {/* Feature List */}
            <div className="space-y-1.5 lg:space-y-2 pt-1">
              {[
                'Fast & Easy Billing',
                'Inventory & Stock Management',
                'Customer & Ledger Management',
                'WhatsApp Bills & Payment Link',
                'Detailed Reports & Analytics',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-xs lg:text-sm font-semibold text-gray-700">
                  <CheckCircle2 className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-emerald-600 fill-emerald-600/20 shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Product Bag Composition */}
          <div className="my-2 lg:my-4 flex justify-center items-center">
            <img
              src={loginProductsImg}
              alt="Fertilizer Products"
              className="max-h-28 md:max-h-36 lg:max-h-48 xl:max-h-56 object-contain drop-shadow-md"
            />
          </div>

          {/* Bottom Trust Badges */}
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1 sm:gap-1.5 bg-white/80 backdrop-blur-xs p-2 lg:p-2.5 rounded-xl border border-emerald-100/80 shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] lg:text-[11px] font-semibold text-gray-700 justify-center">
                <Shield className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-emerald-600 shrink-0" />
                <span>Secure</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] lg:text-[11px] font-semibold text-gray-700 justify-center">
                <ShieldCheck className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-emerald-600 shrink-0" />
                <span>Reliable</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] lg:text-[11px] font-semibold text-gray-700 justify-center">
                <Smile className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-emerald-600 shrink-0" />
                <span>Easy to Use</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] lg:text-[11px] font-semibold text-gray-700 justify-center">
                <Heart className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-emerald-600 shrink-0" />
                <span>Always with You</span>
              </div>
            </div>

            <p className="text-center text-[10px] text-gray-500 font-medium">
              © 2026 Vedixa ERP. All rights reserved.
            </p>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT FORM CARD PANEL (Desktop / Laptop / Tablet)        */}
        {/* ========================================================= */}
        <div className="hidden md:flex md:col-span-6 lg:col-span-5 flex-col justify-center p-4 sm:p-6 lg:p-8 bg-white relative overflow-y-auto">
          {/* Form Card Slot */}
          <div className="max-w-sm mx-auto w-full py-1">
            <Outlet />
          </div>
        </div>

        {/* ========================================================= */}
        {/* MOBILE COMPACT SINGLE-COLUMN FLOW (<768px)                */}
        {/* ========================================================= */}
        <div className="flex md:hidden flex-col p-3 sm:p-4 bg-white space-y-3 overflow-y-auto max-h-[92vh]">
          {/* Compact Top Header */}
          <div className="flex items-center justify-center border-b border-gray-100 pb-2">
            <BrandLogo iconSize="w-5 h-5" textScale="normal" />
          </div>

          {/* Compact Hero Banner */}
          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 p-2.5 rounded-xl border border-emerald-100 flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <h2 className="text-xs font-extrabold text-gray-900 leading-tight">
                Smart Billing for Fertilizers, Seeds & Pesticides
              </h2>
              <div className="flex flex-wrap gap-x-2 gap-y-0.5 pt-0.5">
                {['Fast Billing', 'Inventory', 'WhatsApp Bills'].map((f) => (
                  <span key={f} className="text-[9px] font-semibold text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <img src={loginProductsImg} alt="Products" className="h-12 object-contain shrink-0 drop-shadow-xs" />
          </div>

          {/* Form Card Slot - IMMEDIATELY VISIBLE ON MOBILE */}
          <div className="w-full py-1">
            <Outlet />
          </div>

          {/* Mobile Footer Trust Bar */}
          <div className="pt-2 border-t border-gray-100 space-y-1.5">
            <div className="grid grid-cols-4 gap-1 text-[9px] font-semibold text-gray-600 text-center">
              <div className="flex items-center justify-center gap-1">
                <Shield className="w-3 h-3 text-emerald-600" />
                <span>Secure</span>
              </div>
              <div className="flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Reliable</span>
              </div>
              <div className="flex items-center justify-center gap-1">
                <Smile className="w-3 h-3 text-emerald-600" />
                <span>Easy</span>
              </div>
              <div className="flex items-center justify-center gap-1">
                <Heart className="w-3 h-3 text-emerald-600" />
                <span>Always</span>
              </div>
            </div>
            <p className="text-center text-[9px] text-gray-400">© 2026 Vedixa ERP</p>
          </div>
        </div>

      </div>
    </div>
  );
}
