import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Home } from 'lucide-react';
import BrandLogo from '../../components/common/BrandLogo';
import { useSEO } from '../../hooks/useSEO';

export default function RefundCancellationPolicyPage() {
  useSEO({
    title: 'Refund & Cancellation Policy | VEDIXA ERP',
    description: 'Read the subscription refund, renewal, and cancellation guidelines for VEDIXA ERP cloud software for fertilizer and agro retail businesses.',
    canonical: 'https://vedixaerp.com/refund-cancellation-policy',
    noIndex: false,
  });

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer"
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <BrandLogo textScale="normal" />
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-xl transition-all"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Login</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-sm p-6 sm:p-10 space-y-8">
          {/* Document Header */}
          <div className="border-b border-slate-100 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-extrabold border border-emerald-100 mb-3">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
              <span>Billing &amp; Subscription Terms</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Refund &amp; Cancellation Policy
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Vedixa ERP · Last Updated: August 26, 2026
            </p>
          </div>

          {/* Policy Overview */}
          <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl text-emerald-950 text-xs sm:text-sm font-medium leading-relaxed">
            <p className="font-bold text-emerald-900 mb-1">Digital Software Service Policy Notice:</p>
            Vedixa ERP is a digital Software-as-a-Service (SaaS) application. Once a subscription or digital service access has been activated, subscription fees are generally non-refundable and non-transferable.
          </div>

          <div className="space-y-8 text-sm sm:text-base text-slate-700 leading-relaxed">
            {/* 1. General Subscription Terms */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">1</span>
                Subscription Payments &amp; Activation
              </h2>
              <p className="pl-8 text-slate-600">
                All subscriptions to Vedixa ERP are billed on a prepaid basis according to your chosen plan duration. Upon successful payment processing, digital service access is granted for the designated subscription term.
              </p>
            </section>

            {/* 2. Non-Refundable Policy */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">2</span>
                General Non-Refundable Terms
              </h2>
              <p className="pl-8 text-slate-600">
                Because Vedixa ERP provides immediate access to digital cloud infrastructure, billing modules, and inventory features, payments made for subscriptions, plan upgrades, or service renewals are non-refundable and non-transferable once activated.
              </p>
            </section>

            {/* 3. Exceptional Circumstances Reviewed */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">3</span>
                Exceptional Review Circumstances
              </h2>
              <p className="pl-8 text-slate-600">
                Vedixa ERP may, in its sole discretion, review refund requests under the following exceptional payment circumstances:
              </p>
              <ul className="pl-8 space-y-2 text-slate-600 list-disc list-inside text-xs sm:text-sm">
                <li><strong>Duplicate Payment:</strong> Where a user was inadvertently charged twice for the exact same subscription plan due to a payment gateway processing duplicate.</li>
                <li><strong>Technical Multiple Payment Error:</strong> Unintended multiple successful debits for a single transaction attempt.</li>
                <li><strong>Other Exceptional Circumstances:</strong> Verified cases reviewed and approved by Vedixa ERP management on an individual case-by-case basis.</li>
              </ul>
            </section>

            {/* 4. Refund Approval & Processing Terms */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">4</span>
                Refund Approval &amp; Discretion
              </h2>
              <div className="pl-8 space-y-2 text-slate-600">
                <p>
                  Refund approval is subject strictly to Vedixa ERP review and discretion, to the extent permitted by applicable law.
                </p>
                <p>
                  Refund approval, refund eligibility, total refund amount, and refund processing timelines may be determined based on the verified technical circumstances of each submitted case.
                </p>
                <p>
                  Where a refund is approved, Vedixa ERP will initiate the refund through the applicable payment method or another appropriate method. The time taken for the refunded amount to reflect may depend on the payment provider, bank, or other third-party processing systems.
                </p>
              </div>
            </section>

            {/* 5. Subscription Cancellation */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">5</span>
                Subscription Cancellation &amp; Access Continuation
              </h2>
              <div className="pl-8 space-y-2 text-slate-600">
                <p>
                  You may submit a subscription cancellation or non-renewal request through the available support or subscription management process.
                </p>
                <p>
                  Cancelling a subscription does not automatically entitle the user to a full or partial refund for amounts already paid, except where explicitly required by applicable law.
                </p>
                <p>
                  Active subscription access will continue until the end of the already-paid subscription billing period, after which access to paid ERP features will require subscription renewal or reactivation.
                </p>
              </div>
            </section>

            {/* 6. Request Procedure */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">6</span>
                Submitting a Payment Review Request
              </h2>
              <p className="pl-8 text-slate-600">
                To request a review for a duplicate or unintended multiple payment, please submit your transaction ID, registered mobile number, and payment receipt to our support desk within 7 days of the charge:
              </p>
              <div className="ml-8 mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-700 space-y-1">
                <p><strong>Vedixa ERP Billing &amp; Refunds Desk</strong></p>
                <p>Email: billing@vedixaerp.com</p>
                <p>Vedixa ERP</p>
              </div>
            </section>
          </div>

          {/* Footer Back Link */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>© 2026 Vedixa ERP</span>
            <div className="flex gap-4">
              <Link to="/terms-and-conditions" className="hover:text-emerald-700 font-semibold underline">Terms &amp; Conditions</Link>
              <Link to="/privacy-policy" className="hover:text-emerald-700 font-semibold underline">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
