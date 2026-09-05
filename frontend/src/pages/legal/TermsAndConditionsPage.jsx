import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Home } from 'lucide-react';
import BrandLogo from '../../components/common/BrandLogo';
import { useSEO } from '../../hooks/useSEO';

export default function TermsAndConditionsPage() {
  useSEO({
    title: 'Terms & Conditions | VEDIXA ERP - Fertilizer Shop Management Software',
    description: 'Review the official terms and conditions for using the VEDIXA ERP platform, fertilizer billing software, and cloud business management services.',
    canonical: 'https://vedixaerp.com/terms-and-conditions',
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
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>Legal Document</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Terms &amp; Conditions
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Vedixa ERP · Last Updated: August 26, 2026
            </p>
          </div>

          {/* Intro Text */}
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
            Welcome to <strong className="text-slate-900 font-semibold">Vedixa ERP</strong>. These Terms &amp; Conditions (&quot;Terms&quot;) govern your access to and use of the Vedixa ERP cloud platform, website, software applications, and related services offered by Vedixa ERP (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). By creating an account, registering for, or using our Services, you agree to be bound by these Terms.
          </p>

          {/* Policy Sections */}
          <div className="space-y-8 text-sm sm:text-base text-slate-700 leading-relaxed">
            {/* Section 1 */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">1</span>
                Acceptance of Terms
              </h2>
              <p className="pl-8 text-slate-600">
                By accessing or using Vedixa ERP, you acknowledge that you have read, understood, and agree to comply with these Terms, as well as our <Link to="/privacy-policy" className="text-emerald-700 underline font-semibold">Privacy Policy</Link> and <Link to="/refund-cancellation-policy" className="text-emerald-700 underline font-semibold">Refund &amp; Cancellation Policy</Link>. If you do not agree with any part of these Terms, you must not access or use the software.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">2</span>
                Eligibility and Account Registration
              </h2>
              <p className="pl-8 text-slate-600">
                You must be at least 18 years of age and legally competent to enter into a binding contract under applicable laws to register an account. During registration, you agree to provide accurate, complete, and updated business details, owner names, contact numbers, and email addresses.
              </p>
            </section>

            {/* Section 3 */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">3</span>
                Account Security and User Responsibility
              </h2>
              <p className="pl-8 text-slate-600">
                You are responsible for maintaining the confidentiality of your login credentials (passwords, OTP codes, and authentication tokens). You accept full responsibility for all activities and transactions that occur under your registered business account. You agree to notify Vedixa ERP immediately of any unauthorized access or security breach.
              </p>
            </section>

            {/* Section 4 */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">4</span>
                Use of Vedixa ERP Services
              </h2>
              <p className="pl-8 text-slate-600">
                Vedixa ERP grants you a non-exclusive, non-transferable, revocable license to access and use our software strictly for managing billing, inventory, customer ledgers, sales, purchases, and business reports.
              </p>
            </section>

            {/* Section 5 */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">5</span>
                Subscription and Payments
              </h2>
              <p className="pl-8 text-slate-600">
                Access to certain premium modules and continuous ERP cloud features requires an active subscription. Subscription fees are billed in advance according to the selected plan. You agree to pay all applicable fees on time.
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">6</span>
                Refund &amp; Cancellation Reference
              </h2>
              <p className="pl-8 text-slate-600">
                All payments made to Vedixa ERP are governed by our official <Link to="/refund-cancellation-policy" className="text-emerald-700 underline font-semibold">Refund &amp; Cancellation Policy</Link>. Once digital service access or subscriptions have been activated, subscription fees are generally non-refundable except under verified exceptional payment error conditions.
              </p>
            </section>

            {/* Section 7 */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">7</span>
                User Data and Data Responsibility
              </h2>
              <p className="pl-8 text-slate-600">
                You retain ownership of all business data, customer records, inventory entries, and invoices uploaded or recorded in your Vedixa ERP account. You are solely responsible for ensuring the accuracy, legality, and statutory compliance of all data entered into the application.
              </p>
            </section>

            {/* Section 8 - DATA LOSS CLAUSE */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">8</span>
                Data Loss, Corruption, and Service Interruptions
              </h2>
              <div className="pl-8 space-y-3 text-slate-600">
                <p>
                  While Vedixa ERP implements reasonable technical and organizational safeguards designed to protect the Services and data processed through them, temporary service disruptions, data loss, data corruption, database degradation, cloud infrastructure outages, network connectivity failures, hardware failures, cyber incidents, software bugs, accidental deletion, force majeure events, or recovery failures may occur due to technical or external factors, including circumstances beyond our reasonable control.
                </p>
                <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-900 text-xs sm:text-sm font-medium space-y-2">
                  <p className="font-bold text-amber-950">
                    Important Liability Limitation &amp; User Backup Notice:
                  </p>
                  <p>
                    To the maximum extent permitted by applicable law, Vedixa ERP shall not be liable for any indirect, incidental, consequential, special, business, profit, revenue, or business record losses resulting from data loss, unavailability, or service interruptions.
                  </p>
                  <p>
                    Users are strongly encouraged and remain responsible for maintaining appropriate independent backups of their critical business records, invoices, and statutory tax data.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 9 */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">9</span>
                Service Availability
              </h2>
              <p className="pl-8 text-slate-600">
                We strive to maintain high uptime for our cloud software. However, we do not guarantee uninterrupted or error-free operations. Scheduled maintenance, updates, or emergency hardware upgrades may temporarily affect service availability.
              </p>
            </section>

            {/* Section 10 */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">10</span>
                Prohibited Use
              </h2>
              <p className="pl-8 text-slate-600">
                You agree not to modify, reverse engineer, decompile, resell, sub-license, copy, or exploit any portion of Vedixa ERP. You shall not use the service for fraudulent, illegal, or unauthorized business activities.
              </p>
            </section>

            {/* Section 11 */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">11</span>
                Intellectual Property
              </h2>
              <p className="pl-8 text-slate-600">
                All software source code, designs, branding, logos, trademarks, and interface elements of Vedixa ERP are the exclusive intellectual property of Vedixa ERP.
              </p>
            </section>

            {/* Section 12 */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">12</span>
                Third-Party Services
              </h2>
              <p className="pl-8 text-slate-600">
                Vedixa ERP integrates with third-party service providers (such as Brevo for transactional email OTPs and Google Identity Services for authentication). Your use of these services is subject to their respective terms and operational performance.
              </p>
            </section>

            {/* Section 13 - UPDATED LIMITATION OF LIABILITY */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">13</span>
                Limitation of Liability
              </h2>
              <div className="pl-8 space-y-3 text-slate-600">
                <p>
                  To the maximum extent permitted by applicable law, Vedixa ERP shall not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for any loss of profits, revenue, goodwill, business opportunities, business records, or data arising from or relating to the use of, inability to use, or interruption of the Services.
                </p>
                <p>
                  To the maximum extent permitted by applicable law, Vedixa ERP&apos;s aggregate liability for all claims arising out of or relating to the Services or these Terms shall not exceed the amount actually paid by the user to Vedixa ERP for the applicable Services during the three (3) months immediately preceding the event giving rise to the claim.
                </p>
                <p>
                  Nothing in these Terms excludes or limits any liability that cannot be excluded or limited under applicable law.
                </p>
              </div>
            </section>

            {/* Section 14 */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">14</span>
                Indemnification
              </h2>
              <p className="pl-8 text-slate-600">
                You agree to indemnify, defend, and hold harmless Vedixa ERP, its directors, officers, and employees from any third-party claims, liabilities, damages, or costs resulting from your breach of these Terms or unauthorized use of the platform.
              </p>
            </section>

            {/* Section 15 */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">15</span>
                Suspension or Termination
              </h2>
              <p className="pl-8 text-slate-600">
                Vedixa ERP reserves the right to suspend or terminate your account if you violate these Terms, fail to pay subscription fees, or engage in activities that jeopardize the security or operation of the software.
              </p>
            </section>

            {/* Section 16 */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">16</span>
                Changes to Service and Terms
              </h2>
              <p className="pl-8 text-slate-600">
                We may update these Terms from time to time to reflect service enhancements or statutory updates. Continued use of Vedixa ERP following posted updates constitutes your acceptance of the revised Terms.
              </p>
            </section>

            {/* Section 17 */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">17</span>
                Governing Law and Dispute Resolution
              </h2>
              <div className="pl-8 space-y-2 text-slate-600">
                <p>
                  These Terms shall be governed by and construed in accordance with the laws of India.
                </p>
                <p>
                  In the event of any dispute arising out of or relating to these Terms or the use of Vedixa ERP, the parties shall first make reasonable efforts to resolve the matter through mutual discussion and communication.
                </p>
                <p>
                  If a dispute cannot be resolved amicably, it shall be subject to the jurisdiction of the competent courts as determined in accordance with applicable law.
                </p>
              </div>
            </section>

            {/* Section 18 */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">18</span>
                Contact Information
              </h2>
              <p className="pl-8 text-slate-600">
                If you have questions, feedback, or concerns regarding these Terms &amp; Conditions, please contact us at:
              </p>
              <div className="ml-8 mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-700 space-y-1">
                <p><strong>Vedixa ERP Support &amp; Compliance Team</strong></p>
                <p>Email: support@vedixaerp.com</p>
                <p>Vedixa ERP</p>
              </div>
            </section>
          </div>

          {/* Footer Back Link */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>© 2026 Vedixa ERP</span>
            <div className="flex gap-4">
              <Link to="/privacy-policy" className="hover:text-emerald-700 font-semibold underline">Privacy Policy</Link>
              <Link to="/refund-cancellation-policy" className="hover:text-emerald-700 font-semibold underline">Refund Policy</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
