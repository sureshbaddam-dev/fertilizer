import React, { useState } from 'react';
import {
  Search,
  Package,
  FileText,
  ShoppingBag,
  Users,
  Truck,
  Layers,
  BarChart3,
  CreditCard,
  Settings,
  HelpCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { HELP_CATEGORIES, POPULAR_ARTICLES, HELP_ARTICLES } from '../data/helpArticlesData';

const ICON_MAP = {
  Package,
  FileText,
  ShoppingBag,
  Users,
  Truck,
  Layers,
  BarChart3,
  CreditCard,
  Settings,
  HelpCircle,
};

export default function HelpSupportHome({ onSelectArticle, onSelectCategory, onOpenMyRequests, onRaiseRequest }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArticles = searchQuery.trim()
    ? HELP_ARTICLES.filter(
        (art) =>
          art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          art.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
          art.categoryName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-8 font-sans antialiased text-slate-800 pb-8">
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Help &amp; Support</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Find answers, learn how to use VEDIXA, or contact our support team.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenMyRequests}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-emerald-700" />
            <span>My Requests</span>
          </button>
          <button
            type="button"
            onClick={onRaiseRequest}
            className="px-4 py-2 bg-[#047857] hover:bg-[#065f46] text-white font-bold text-xs rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>+ Raise a New Request</span>
          </button>
        </div>
      </div>

      {/* Hero Search Section with Illustration */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-50 border border-slate-200/90 p-6 sm:p-10 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-8 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
              <span>VEDIXA Knowledge Base &amp; Support</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              How can we help you?
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-lg">
              Find answers, learn how to use VEDIXA, or contact our support team.
            </p>

            {/* Large Search Box */}
            <div className="relative max-w-xl pt-2">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for help articles..."
                className="w-full h-12 pl-11 pr-4 bg-white border border-slate-300 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-[#047857]/15 shadow-2xs transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Friendly SVG Illustration */}
          <div className="hidden md:flex md:col-span-4 justify-center items-center">
            <div className="w-44 h-44 rounded-full bg-emerald-100/60 border border-emerald-200/80 flex items-center justify-center p-4 shadow-inner relative">
              <svg viewBox="0 0 200 200" className="w-36 h-36">
                <circle cx="100" cy="100" r="90" fill="#E6F4EA" />
                <path d="M60 140 C60 110, 140 110, 140 140 Z" fill="#34A853" />
                <circle cx="100" cy="85" r="30" fill="#FFD599" />
                <rect x="70" y="70" width="60" height="15" rx="7" fill="#202124" />
                <circle cx="65" cy="85" r="10" fill="#202124" />
                <circle cx="135" cy="85" r="10" fill="#202124" />
                <path d="M85 95 Q100 110 115 95" stroke="#202124" strokeWidth="3" fill="none" strokeLinecap="round" />
                <rect x="75" y="130" width="50" height="35" rx="5" fill="#3C4043" />
                <rect x="80" y="135" width="40" height="25" rx="3" fill="#80868B" />
              </svg>
              <div className="absolute top-2 right-2 bg-white px-2.5 py-1 rounded-full text-[10px] font-bold text-emerald-800 shadow-2xs border border-emerald-200">
                24/7 Care
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Search Results View (If query is typed) */}
      {searchQuery.trim() !== '' && (
        <div className="space-y-3 bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900">
            Search Results for &ldquo;{searchQuery}&rdquo; ({filteredArticles.length})
          </h3>

          {filteredArticles.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium">
              No matching help articles found. Try searching another term or raise a request with support.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredArticles.map((art) => (
                <div
                  key={art.id}
                  onClick={() => onSelectArticle(art.id)}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition cursor-pointer space-y-1.5"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    {art.categoryName}
                  </span>
                  <h4 className="font-extrabold text-slate-900 text-xs flex items-center justify-between">
                    <span>{art.title}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </h4>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{art.summary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Popular Help Articles Section */}
      {searchQuery.trim() === '' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Popular Help Articles</h3>
            <button
              onClick={() => onSelectCategory('all')}
              className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {POPULAR_ARTICLES.map((art) => {
              const IconComp = ICON_MAP[art.icon] || HelpCircle;
              return (
                <div
                  key={art.id}
                  onClick={() => onSelectArticle(art.id)}
                  className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer space-y-3 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white transition-colors">
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs group-hover:text-emerald-800 transition-colors">
                      {art.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1 line-clamp-2">
                      {art.summary}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Browse by Category Section */}
      {searchQuery.trim() === '' && (
        <div className="space-y-4 pt-2">
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Browse by Category</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {HELP_CATEGORIES.map((cat) => {
              const IconComp = ICON_MAP[cat.icon] || HelpCircle;
              return (
                <div
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer flex items-start gap-3.5 group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-slate-900 text-xs group-hover:text-emerald-800 transition">
                        {cat.title}
                      </h4>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {cat.articleCount} Articles
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-2">
                      {cat.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
