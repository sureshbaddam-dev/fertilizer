import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  FileText,
  Package,
  Plus,
  Search,
  Printer,
  Share2,
  CreditCard,
  Percent,
  Check,
  HelpCircle,
  Clock,
  UserCheck,
} from 'lucide-react';
import { HELP_ARTICLES } from '../data/helpArticlesData';
import BrandLogo from '../../../components/common/BrandLogo';

export default function HelpArticleDetailView({
  articleId,
  onBack,
  onSelectCategory,
  onSelectArticle,
  onRaiseRequest,
}) {
  const [feedbackGiven, setFeedbackGiven] = useState(null); // 'yes' | 'no'
  const [activeStepId, setActiveStepId] = useState('step-1');

  const article = HELP_ARTICLES.find((a) => a.id === articleId) || HELP_ARTICLES[0];
  const relatedArticles = HELP_ARTICLES.filter(
    (a) => a.categoryId === article.categoryId && a.id !== article.id
  ).slice(0, 4);

  // Scroll Spy for TOC step highlighting
  useEffect(() => {
    const handleScroll = () => {
      const stepElements = article.steps.map((_, idx) =>
        document.getElementById(`step-${idx + 1}`)
      );

      const scrollPosition = window.scrollY + 140;

      for (let i = stepElements.length - 1; i >= 0; i--) {
        const el = stepElements[i];
        if (el && el.offsetTop <= scrollPosition) {
          setActiveStepId(`step-${i + 1}`);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [article]);

  const handleStepClick = (e, stepId) => {
    e.preventDefault();
    setActiveStepId(stepId);
    const targetEl = document.getElementById(stepId);
    if (targetEl) {
      const topOffset = targetEl.getBoundingClientRect().top + window.pageYOffset - 100;
      window.scrollTo({ top: topOffset, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6 font-sans antialiased text-slate-800 pb-12 w-full max-w-full overflow-hidden">
      {/* Top Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold flex-wrap">
          <button
            onClick={onBack}
            className="hover:text-emerald-700 flex items-center gap-1 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Help Center</span>
          </button>
          <span>/</span>
          <button
            onClick={() => onSelectCategory && onSelectCategory(article.categoryId)}
            className="hover:text-emerald-700 text-slate-700 font-bold transition cursor-pointer"
          >
            {article.categoryName}
          </button>
          <span>/</span>
          <span className="text-slate-900 font-bold truncate max-w-xs">{article.title}</span>
        </div>

        <button
          type="button"
          onClick={onRaiseRequest}
          className="px-4 py-2 bg-[#047857] hover:bg-[#065f46] text-white font-bold text-xs rounded-xl shadow-2xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <span>+ Raise a New Request</span>
        </button>
      </div>

      {/* Main Grid: Left TOC (3) + Center Article (6) + Right Sidebar (3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
        {/* Left Sidebar Table of Contents ("IN THIS ARTICLE") */}
        <div className="hidden lg:block lg:col-span-3 sticky top-24 space-y-3 bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-200/80 pb-2">
            In this article
          </h4>
          <nav className="space-y-1">
            {article.steps.map((step, idx) => {
              const stepId = `step-${idx + 1}`;
              const isActive = activeStepId === stepId;
              return (
                <a
                  key={idx}
                  href={`#${stepId}`}
                  onClick={(e) => handleStepClick(e, stepId)}
                  className={`block text-xs font-semibold px-3 py-2 rounded-xl transition ${
                    isActive
                      ? 'bg-emerald-100/80 text-[#047857] font-extrabold border-l-3 border-[#047857] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {step.title}
                </a>
              );
            })}
          </nav>
        </div>

        {/* Center Main Article Content */}
        <div className="lg:col-span-6 space-y-8 bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-2xs min-w-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              {article.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-2 leading-relaxed">
              {article.summary}
            </p>
          </div>

          {/* Complete Step-by-step Walkthrough Cards */}
          <div className="space-y-10 pt-2 divide-y divide-slate-100">
            {article.steps.map((step, idx) => {
              const stepId = `step-${idx + 1}`;
              return (
                <div id={stepId} key={idx} className="space-y-4 pt-6 first:pt-0 scroll-mt-28">
                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-xs font-black shrink-0">
                        {idx + 1}
                      </span>
                      <span>{step.title.replace(/^\d+\.\s*/, '')}</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed pl-8">
                      {step.description}
                    </p>
                  </div>

                  {/* Clean VEDIXA UI Mockup Frames for Billing Article */}
                  {article.id === 'create-new-bill' && (
                    <div className="pl-8 pt-1">
                      {/* Step 1 Mockup: Topbar Header & + New Bill button */}
                      {idx === 0 && (
                        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/80 space-y-3 shadow-2xs">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <BrandLogo className="h-6 w-auto" />
                            <div className="px-3 py-1.5 bg-[#047857] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ New Bill</span>
                              <span className="text-[10px] opacity-80">(F2)</span>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Press F2 key or click + New Bill anywhere in VEDIXA to open the quick billing drawer.
                          </p>
                        </div>
                      )}

                      {/* Step 2 Mockup: Customer Select Bar */}
                      {idx === 1 && (
                        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/80 space-y-3 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                            Select Customer
                          </span>
                          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            <div className="flex-1 relative">
                              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                readOnly
                                value="Search Ramesh Patel (9876543210)"
                                className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 font-bold"
                              />
                            </div>
                            <span className="px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold shrink-0">
                              + Add Customer
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Step 3 Mockup: Product Search & Item List */}
                      {idx === 2 && (
                        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/80 space-y-3 shadow-2xs">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <span className="text-xs font-bold text-slate-900">Add Products</span>
                            <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                              FIFO Batch Active
                            </span>
                          </div>
                          <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-slate-900 block">NPK Fertilizer 19:19:19 (50KG)</span>
                              <span className="text-[10px] text-slate-500 font-mono">Batch: BATCH-2026-A12 • Qty: 2 Bags</span>
                            </div>
                            <span className="font-mono font-bold text-emerald-700 text-xs">₹ 2,400.00</span>
                          </div>
                        </div>
                      )}

                      {/* Step 4 Mockup: Discount & Tax */}
                      {idx === 3 && (
                        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/80 space-y-3 shadow-2xs">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                            <span>Subtotal:</span>
                            <span className="font-mono">₹ 2,400.00</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-semibold flex items-center gap-1">
                              <Percent className="w-3.5 h-3.5 text-emerald-700" /> Apply Discount:
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                                Flat ₹ 100 OFF
                              </span>
                              <span className="font-mono font-bold text-emerald-700 text-xs">- ₹ 100.00</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Step 5 Mockup: Payment Mode & Status */}
                      {idx === 4 && (
                        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/80 space-y-3 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                            Payment Status &amp; Mode
                          </span>
                          <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
                            <div className="p-2 rounded-xl bg-[#047857] text-white border border-[#047857] flex items-center justify-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Fully Paid
                            </div>
                            <div className="p-2 rounded-xl bg-white text-slate-700 border border-slate-300">
                              Partial
                            </div>
                            <div className="p-2 rounded-xl bg-white text-slate-700 border border-slate-300">
                              Credit (Udhar)
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Step 6 Mockup: Save & Print Action */}
                      {idx === 5 && (
                        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/80 space-y-2 shadow-2xs">
                          <div className="flex items-center justify-end gap-2">
                            <span className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-xl text-xs font-bold">
                              Save Invoice
                            </span>
                            <span className="px-4 py-2 bg-[#047857] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                              <Printer className="w-3.5 h-3.5" /> Save &amp; Print Invoice
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Step 7 Mockup: Print / Download / WhatsApp */}
                      {idx === 6 && (
                        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/80 space-y-3 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                            Post-Save Invoice Actions
                          </span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
                              <Share2 className="w-3.5 h-3.5" /> Share on WhatsApp
                            </span>
                            <span className="px-3 py-1.5 bg-white text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5">
                              <Printer className="w-3.5 h-3.5 text-slate-600" /> Print Receipt
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Sidebar (3 Columns): Feedback, Related Articles, Need Help */}
        <div className="lg:col-span-3 space-y-6">
          {/* Was this helpful? Rating Widget */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-3">
            <h4 className="font-extrabold text-slate-900 text-xs">Was this helpful?</h4>
            {feedbackGiven === null ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFeedbackGiven('yes')}
                  className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Yes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackGiven('no')}
                  className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ThumbsDown className="w-3.5 h-3.5 text-rose-600" />
                  <span>No</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Thank you for your feedback!</span>
              </div>
            )}
          </div>

          {/* Related Articles Card */}
          {relatedArticles.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-3">
              <h4 className="font-extrabold text-slate-900 text-xs border-b border-slate-100 pb-2">
                Related Articles
              </h4>
              <div className="space-y-2">
                {relatedArticles.map((rel) => (
                  <button
                    key={rel.id}
                    type="button"
                    onClick={() => onSelectArticle(rel.id)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-emerald-50/70 transition flex items-center gap-2 group cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span className="text-xs font-semibold text-slate-700 group-hover:text-emerald-800 transition line-clamp-1">
                      {rel.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Still need help? Card */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-5 shadow-2xs space-y-3">
            <h4 className="font-extrabold text-emerald-950 text-xs">Still need help?</h4>
            <p className="text-xs text-emerald-800 leading-relaxed font-medium">
              If you can&apos;t find the answer you&apos;re looking for, please raise a request.
            </p>
            <button
              type="button"
              onClick={onRaiseRequest}
              className="w-full py-2 bg-[#047857] hover:bg-[#065f46] text-white font-bold text-xs rounded-xl shadow-2xs transition cursor-pointer"
            >
              + Raise a New Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
