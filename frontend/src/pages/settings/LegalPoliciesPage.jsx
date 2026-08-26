import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, FileText, Shield, RefreshCw, ExternalLink, ChevronRight } from 'lucide-react';

export default function LegalPoliciesPage() {
  const policies = [
    {
      title: 'Terms & Conditions',
      description: 'Review the rules, account responsibilities, liability limits, and service terms governing Vedixa ERP.',
      path: '/terms-and-conditions',
      icon: FileText,
      badge: 'Agreement',
    },
    {
      title: 'Privacy Policy',
      description: 'Learn how your business data, account credentials, and customer information are protected and processed.',
      path: '/privacy-policy',
      icon: Shield,
      badge: 'Data Security',
    },
    {
      title: 'Refund & Cancellation Policy',
      description: 'Understand subscription billing terms, cancellation rules, and exceptional duplicate payment review criteria.',
      path: '/refund-cancellation-policy',
      icon: RefreshCw,
      badge: 'Billing Terms',
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Category Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Legal &amp; Policies
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Access Vedixa ERP system terms, data privacy practices, and subscription billing policies.
            </p>
          </div>
        </div>
      </div>

      {/* Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {policies.map((policy) => {
          const IconComponent = policy.icon;
          return (
            <Link
              key={policy.title}
              to={policy.path}
              className="flex flex-col justify-between p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:border-emerald-500/60 hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 group-hover:bg-emerald-700 group-hover:text-white transition-colors">
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-800 transition-colors">
                    {policy.badge}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 group-hover:text-emerald-800 transition-colors flex items-center justify-between">
                    <span>{policy.title}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                    {policy.description}
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:text-emerald-800">
                <span>View Full Policy</span>
                <ChevronRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
