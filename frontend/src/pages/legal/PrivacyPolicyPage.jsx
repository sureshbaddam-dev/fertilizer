import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Home } from 'lucide-react';
import BrandLogo from '../../components/common/BrandLogo';
import { useSEO } from '../../hooks/useSEO';

export default function PrivacyPolicyPage() {
  useSEO({
    title: 'Privacy Policy | VEDIXA ERP - Fertilizer Shop Management Software',
    description: 'Read the privacy policy of VEDIXA ERP. Learn how we safeguard your agricultural retail business data, billing records, and customer privacy.',
    canonical: 'https://vedixaerp.com/privacy-policy',
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
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>Privacy &amp; Data Protection</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Vedixa ERP · Last Updated: August 26, 2026
            </p>
          </div>

          {/* Intro */}
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            At <strong className="text-slate-900 font-semibold">Vedixa ERP</strong>, we respect your privacy and are committed to protecting the business and personal data processed through our cloud ERP platform. This Privacy Policy describes how we collect, use, store, and safeguard information when you use Vedixa ERP.
          </p>

          <div className="space-y-8 text-sm sm:text-base text-slate-700 leading-relaxed">
            {/* 1. Account Information */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">1</span>
                Account &amp; Registration Information
              </h2>
              <p className="pl-8 text-slate-600">
                When you create an account or set up your store, we collect basic account details including owner name, mobile phone number, email address, shop name, store location/address, and optional statutory tax identifiers (GSTIN).
              </p>
            </section>

            {/* 2. Business Data Entered by Users */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">2</span>
                Business &amp; ERP Operational Data
              </h2>
              <p className="pl-8 text-slate-600">
                To provide billing and inventory management functionality, Vedixa ERP stores operational data entered directly by your business. This includes product catalogs, batch numbers, stock balances, purchase records, sales invoices, customer directory listings, and customer ledger transaction histories.
              </p>
            </section>

            {/* 3. Authentication & Security Data */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">3</span>
                Authentication &amp; Verification Data
              </h2>
              <p className="pl-8 text-slate-600">
                Passwords are not stored in plain text and are protected using bcrypt-based password hashing. OTPs and authentication-related information are processed and retained only as required for account verification, authentication, security, and related service functionality, subject to the applicable technical implementation and retention periods.
              </p>
            </section>

            {/* 4. Google Login Data */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">4</span>
                Google Sign-In Integration
              </h2>
              <p className="pl-8 text-slate-600">
                If you authenticate using Google Sign-In, we receive basic profile information authorized by you via Google OAuth 2.0 API, including your verified email address, full name, Google unique user ID (`sub`), and profile image URL. We do not access your Google password, contacts, or Google Drive files.
              </p>
            </section>

            {/* 5. How We Use Your Information */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">5</span>
                How We Use Collected Information
              </h2>
              <ul className="pl-8 space-y-2 text-slate-600 list-disc list-inside">
                <li>Providing core ERP billing, inventory, and ledger functionality.</li>
                <li>Verifying user identity during login and password resets.</li>
                <li>Generating, downloading, and enabling users to share supported business documents and transaction information through available application features.</li>
                <li>Managing subscription status and billing administration.</li>
                <li>Offering customer support and troubleshooting technical issues.</li>
              </ul>
            </section>

            {/* 6. Technical Security Safeguards */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">6</span>
                Data Security Safeguards
              </h2>
              <p className="pl-8 text-slate-600">
                We use appropriate authentication, access-control, and transport-security measures designed to protect account access and data transmitted through supported services, including HTTPS/TLS-based protections for data transmitted between supported clients and our services, where applicable.
              </p>
            </section>

            {/* 7. Third-Party Service Providers */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">7</span>
                Third-Party Service Providers
              </h2>
              <div className="pl-8 space-y-3 text-slate-600">
                <p>
                  We may use third-party service providers and infrastructure partners to support functions such as authentication, communications, hosting, cloud infrastructure, database services, payment processing, security, analytics, or other operational services. These providers may change from time to time as our Services evolve.
                </p>
                <p>
                  Current verified service integrations include:
                </p>
                <ul className="space-y-1.5 list-disc list-inside text-xs sm:text-sm pl-2">
                  <li><strong>Transactional Email Services (Brevo API):</strong> For dispatching verification OTP codes and account notifications.</li>
                  <li><strong>Authentication Services (Google Identity Services):</strong> For user identity verification during Google Sign-In.</li>
                  <li><strong>Cloud Infrastructure &amp; Hosting Partners:</strong> For supporting secure application execution and database operations.</li>
                </ul>
              </div>
            </section>

            {/* 8. Data Retention & Storage */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">8</span>
                Data Retention &amp; Storage
              </h2>
              <div className="pl-8 space-y-3 text-slate-600">
                <p>
                  We may retain account and business data for as long as reasonably necessary to provide and maintain the Services, maintain security, comply with applicable legal or regulatory obligations, resolve disputes, enforce our agreements, protect our legitimate interests, or for other legitimate business purposes.
                </p>
                <p>
                  The period for which data is retained may vary depending on the nature of the information, the purpose for which it is processed, applicable legal or regulatory requirements, and operational or security requirements.
                </p>
                <p>
                  Subject to applicable law and technical or legal requirements, users may request deletion or closure of their account through the available support process. Certain information may be retained where necessary or permitted for legal compliance, security, fraud prevention, dispute resolution, backup, recovery, or other legitimate purposes.
                </p>
              </div>
            </section>

            {/* 9. Policy Updates */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">9</span>
                Updates to This Policy
              </h2>
              <p className="pl-8 text-slate-600">
                We may periodically update this Privacy Policy. Any modifications will be posted on this page with an updated &quot;Last Updated&quot; revision date.
              </p>
            </section>

            {/* 10. Contact Us */}
            <section className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">10</span>
                Vedixa ERP Privacy &amp; Data Protection Desk
              </h2>
              <p className="pl-8 text-slate-600">
                If you have questions or concerns regarding this Privacy Policy or your personal data, please contact us at:
              </p>
              <div className="ml-8 mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-700 space-y-1">
                <p><strong>Vedixa ERP Privacy &amp; Data Protection Desk</strong></p>
                <p>Email: privacy@vedixaerp.com</p>
                <p>Vedixa ERP</p>
              </div>
            </section>
          </div>

          {/* Footer Back Link */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>© 2026 Vedixa ERP</span>
            <div className="flex gap-4">
              <Link to="/terms-and-conditions" className="hover:text-emerald-700 font-semibold underline">Terms &amp; Conditions</Link>
              <Link to="/refund-cancellation-policy" className="hover:text-emerald-700 font-semibold underline">Refund Policy</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
