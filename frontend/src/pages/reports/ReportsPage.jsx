import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import OpeningStockListModal from '../../components/inventory/OpeningStockListModal';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  ShoppingBag,
  Package,
  Users,
  AlertTriangle,
  ShieldCheck,
  Layers,
  Calendar,
  Filter,
  FileText,
  FileSpreadsheet,
  Printer,
  Search,
  Wallet,
  Scale,
  Award,
  Zap,
  CreditCard,
  Building2,
  AlertCircle,
  CheckCircle2,
  Clock,
  PackageX,
  X,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';

import { reportsService } from '../../services/reportsService';
import PageLayout from '../../components/ui/PageHeaderContainer';
import { exportReportToPDF, exportReportToExcel, printExecutiveReport } from '../../utils/reportExporter';

const BRAND_GREEN = '#047857';
const BRAND_EMERALD = '#10B981';
const CHART_COLORS = ['#047857', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];

export default function ReportsPage() {
  const navigate = useNavigate();

  // Main Tab State: 'SALES' | 'PURCHASES' | 'OVERALL_BUSINESS'
  const [activeTab, setActiveTab] = useState('SALES');
  const [showFilters, setShowFilters] = useState(false);

  // Customer Receivables Modal State
  const [showReceivablesModal, setShowReceivablesModal] = useState(false);
  const [modalSearch, setModalSearch] = useState('');

  // Opening Stock Modal State
  const [showOpeningStockModal, setShowOpeningStockModal] = useState(false);

  // Global Filters
  const [filters, setFilters] = useState({
    dateRange: 'THIS_MONTH',
    customer: 'ALL',
    supplier: 'ALL',
    category: 'ALL',
    product: 'ALL',
    paymentMode: 'ALL',
  });

  // Fetch Live Analytics Payload from Backend
  const { data: biApi, isLoading } = useQuery({
    queryKey: ['reports-bi', filters],
    queryFn: () => reportsService.getBIAnalytics(filters),
    staleTime: 2 * 60 * 1000,
  });

  const biData = useMemo(() => biApi?.data || biApi || {}, [biApi]);

  const salesData = biData.sales || {};
  const purchasesData = biData.purchases || {};
  const overallData = biData.overallBusiness || {};

  const filteredCustomerList = useMemo(() => {
    const list = overallData.customerReceivablesList || [];
    return list.filter((c) => {
      const q = modalSearch.trim().toLowerCase();
      return !q ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.mobile && c.mobile.toLowerCase().includes(q));
    });
  }, [overallData.customerReceivablesList, modalSearch]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      dateRange: 'THIS_MONTH',
      customer: 'ALL',
      supplier: 'ALL',
      category: 'ALL',
      product: 'ALL',
      paymentMode: 'ALL',
    });
  };

  return (
    <PageLayout
      title="Business Reports & Analytics"
      breadcrumb="Vedixa ERP > Reports"
      icon={BarChart3}
      action={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportReportToPDF(biData, filters.dateRange, activeTab)}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>Export PDF</span>
          </button>
          <button
            type="button"
            onClick={() => exportReportToExcel(biData, filters.dateRange, activeTab)}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </button>
          <button
            type="button"
            onClick={printExecutiveReport}
            className="px-3 py-1.5 bg-[#047857] hover:bg-emerald-800 text-white rounded-xl font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6 text-slate-800 font-sans">
        {/* ========================================================================= */}
        {/* TOP SECTION: 3 MAIN NAVIGATION TABS */}
        {/* ========================================================================= */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            {/* 3 Main Navigation Tabs */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setActiveTab('SALES')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center gap-2 ${
                  activeTab === 'SALES'
                    ? 'bg-[#047857] text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>1. SALES</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('PURCHASES')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center gap-2 ${
                  activeTab === 'PURCHASES'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>2. PURCHASES</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('OVERALL_BUSINESS')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center gap-2 ${
                  activeTab === 'OVERALL_BUSINESS'
                    ? 'bg-purple-700 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>3. OVERALL BUSINESS</span>
              </button>
            </div>

            {/* Filter Trigger Toggle */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center gap-2 self-start md:self-auto ${
                showFilters || Object.values(filters).some((v) => v !== 'ALL' && v !== 'THIS_MONTH')
                  ? 'bg-emerald-50 text-[#047857] border-emerald-300 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4 h-4 text-[#047857]" />
              <span>Filters Bar</span>
            </button>
          </div>

          {/* Contextual Filter Bar */}
          {showFilters && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-[#047857]" /> Contextual Dashboard Filters
                </h4>
                <button type="button" onClick={resetFilters} className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer">
                  Reset Filters
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Time Period</label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#047857]"
                  >
                    <option value="TODAY">Today</option>
                    <option value="THIS_WEEK">This Week</option>
                    <option value="THIS_MONTH">This Month</option>
                    <option value="THIS_YEAR">This Year</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Customer</label>
                  <select
                    value={filters.customer}
                    onChange={(e) => handleFilterChange('customer', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#047857]"
                  >
                    <option value="ALL">All Customers</option>
                    <option value="WALKIN">Walk-in Customer</option>
                    <option value="REGULAR">Regular Farmers</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Supplier</label>
                  <select
                    value={filters.supplier}
                    onChange={(e) => handleFilterChange('supplier', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#047857]"
                  >
                    <option value="ALL">All Suppliers</option>
                    <option value="IFFCO">IFFCO India</option>
                    <option value="COROMANDEL">Coromandel</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Category</label>
                  <select
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#047857]"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="NITROGEN">Nitrogen Fertilizers</option>
                    <option value="NPK">NPK Complexes</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Payment Mode</label>
                  <select
                    value={filters.paymentMode}
                    onChange={(e) => handleFilterChange('paymentMode', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#047857]"
                  >
                    <option value="ALL">All Payment Modes</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Credit">Credit</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1 CONTENT : SALES */}
        {/* ========================================================================= */}
        {activeTab === 'SALES' && (
          <div className="space-y-6">
            {/* Sales KPIs Grid (9 Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-3.5">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
                <span className="text-[11px] font-extrabold uppercase text-slate-400">Today's Sales</span>
                <p className="text-lg font-extrabold font-mono text-slate-900">₹ {(salesData.todaySales || 0).toLocaleString('en-IN')}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
                <span className="text-[11px] font-extrabold uppercase text-slate-400">Weekly Sales</span>
                <p className="text-lg font-extrabold font-mono text-slate-900">₹ {(salesData.weeklySales || 0).toLocaleString('en-IN')}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
                <span className="text-[11px] font-extrabold uppercase text-slate-400">Monthly Sales</span>
                <p className="text-lg font-extrabold font-mono text-slate-900">₹ {(salesData.monthlySales || 0).toLocaleString('en-IN')}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
                <span className="text-[11px] font-extrabold uppercase text-slate-400">Yearly Sales</span>
                <p className="text-lg font-extrabold font-mono text-slate-900">₹ {(salesData.yearlySales || 0).toLocaleString('en-IN')}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1 bg-emerald-50/50 border-emerald-200">
                <span className="text-[11px] font-extrabold uppercase text-emerald-800">Total Sales</span>
                <p className="text-xl font-black font-mono text-emerald-900">₹ {(salesData.totalSales || 0).toLocaleString('en-IN')}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
                <span className="text-[11px] font-extrabold uppercase text-slate-400">Total Collection</span>
                <p className="text-lg font-extrabold font-mono text-emerald-700">₹ {(salesData.totalCollection || 0).toLocaleString('en-IN')}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
                <span className="text-[11px] font-extrabold uppercase text-slate-400">Outstanding Dues</span>
                <p className="text-lg font-extrabold font-mono text-amber-700">₹ {(salesData.outstandingCollection || 0).toLocaleString('en-IN')}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
                <span className="text-[11px] font-extrabold uppercase text-slate-400">Sales Growth %</span>
                <p className="text-lg font-extrabold font-mono text-emerald-700">+{salesData.salesGrowth || 0}%</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1 col-span-2 sm:col-span-1">
                <span className="text-[11px] font-extrabold uppercase text-slate-400">Avg Bill Value</span>
                <p className="text-lg font-extrabold font-mono text-slate-900">₹ {(salesData.avgBillValue || 0).toLocaleString('en-IN')}</p>
              </div>
            </div>

            {/* Sales Charts Grid (3 Charts) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* 1. Daily Sales Trend */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-700">Daily Sales Trend</h4>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesData.charts?.dailySalesTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                      <Tooltip formatter={(v) => `₹ ${Number(v).toLocaleString('en-IN')}`} />
                      <Area type="monotone" dataKey="sales" name="Daily Sales" stroke={BRAND_GREEN} fill={BRAND_GREEN} fillOpacity={0.2} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 2. Monthly Sales Trend */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-700">Monthly Sales Trend</h4>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesData.charts?.monthlySalesTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                      <Tooltip formatter={(v) => `₹ ${Number(v).toLocaleString('en-IN')}`} />
                      <Bar dataKey="sales" name="Monthly Sales" fill={BRAND_GREEN} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 3. Yearly Sales Trend */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-700">Yearly Sales Trend</h4>
                <div className="h-56 w-full flex items-center justify-center">
                  {(salesData.charts?.yearlySalesTrend || []).length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesData.charts?.yearlySalesTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                        <Tooltip formatter={(v) => `₹ ${Number(v).toLocaleString('en-IN')}`} />
                        <Bar dataKey="sales" name="Yearly Sales" fill="#10B981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-10 text-slate-400 space-y-1">
                      <BarChart3 className="w-8 h-8 mx-auto stroke-1 text-slate-300" />
                      <p className="text-xs font-bold">No Sales Data Available</p>
                      <p className="text-[10px] text-slate-400">Create sales invoices to view yearly trends</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sales Tables Grid (4 Tables) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Top Customers */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-800">Top Customers</h4>
                {/* DESKTOP TABLE */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-extrabold text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-2">Customer</th>
                        <th className="py-2 px-2 text-right">Sales (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                      {(salesData.tables?.topCustomers || []).length > 0 ? (
                        (salesData.tables?.topCustomers || []).slice(0, 5).map((c, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-2 font-bold truncate max-w-[100px]">{c.name}</td>
                            <td className="py-2 px-2 text-right font-mono text-emerald-800">₹ {(c.revenue || 0).toLocaleString('en-IN')}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="py-4 text-center text-[11px] text-slate-400 font-medium">No Customers Found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE CARDS */}
                <div className="block md:hidden space-y-2">
                  {(salesData.tables?.topCustomers || []).length > 0 ? (
                    (salesData.tables?.topCustomers || []).slice(0, 5).map((c, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between text-xs font-sans">
                        <span className="font-extrabold text-slate-900 truncate max-w-[150px]">{c.name}</span>
                        <span className="font-mono font-bold text-emerald-800 text-xs">₹ {(c.revenue || 0).toLocaleString('en-IN')}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-xs text-slate-400 py-2 italic">No Customers Found</p>
                  )}
                </div>
              </div>

              {/* 2. Top Selling Products */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-800">Top Selling Products</h4>
                {/* DESKTOP TABLE */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-extrabold text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-2">Product</th>
                        <th className="py-2 px-2 text-center">Qty</th>
                        <th className="py-2 px-2 text-right">Revenue (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                      {(salesData.tables?.topSellingProducts || []).length > 0 ? (
                        (salesData.tables?.topSellingProducts || []).slice(0, 5).map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-2 font-bold truncate max-w-[90px]">{p.name}</td>
                            <td className="py-2 px-2 text-center font-mono text-slate-600">{p.quantitySold || 0}</td>
                            <td className="py-2 px-2 text-right font-mono text-emerald-800">₹ {(p.salesValue || 0).toLocaleString('en-IN')}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-[11px] text-slate-400 font-medium">No Sales Yet</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE CARDS */}
                <div className="block md:hidden space-y-2">
                  {(salesData.tables?.topSellingProducts || []).length > 0 ? (
                    (salesData.tables?.topSellingProducts || []).slice(0, 5).map((p, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between text-xs font-sans">
                        <div>
                          <span className="font-extrabold text-slate-900 block truncate max-w-[140px]">{p.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono block">Qty: {p.quantitySold || 0}</span>
                        </div>
                        <span className="font-mono font-bold text-emerald-800 text-xs">₹ {(p.salesValue || 0).toLocaleString('en-IN')}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-xs text-slate-400 py-2 italic">No Sales Yet</p>
                  )}
                </div>
              </div>

              {/* 3. Recent Sales */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-800">Recent Sales Invoices</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-extrabold text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-2">Invoice</th>
                        <th className="py-2 px-2 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                      {(salesData.tables?.recentSales || []).slice(0, 5).map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-2 font-mono font-bold text-[#047857]">{s.docNo}</td>
                          <td className="py-2 px-2 text-right font-mono">₹ {(s.amount || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. Outstanding Customers */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-800">Outstanding Customers</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-extrabold text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-2">Customer</th>
                        <th className="py-2 px-2 text-right">Due (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                      {(salesData.tables?.outstandingCustomers || []).slice(0, 5).map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-2 font-bold truncate max-w-[100px]">{c.name}</td>
                          <td className="py-2 px-2 text-right font-mono text-amber-700">₹ {(c.dues || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2 CONTENT : PURCHASES */}
        {/* ========================================================================= */}
        {activeTab === 'PURCHASES' && (
          <div className="space-y-6">
            {/* Purchase KPIs Grid (8 Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-3.5">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
                <span className="text-[11px] font-extrabold uppercase text-slate-400">Today's Purchase</span>
                <p className="text-lg font-extrabold font-mono text-slate-900">₹ {(purchasesData.todayPurchase || 0).toLocaleString('en-IN')}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
                <span className="text-[11px] font-extrabold uppercase text-slate-400">Weekly Purchase</span>
                <p className="text-lg font-extrabold font-mono text-slate-900">₹ {(purchasesData.weeklyPurchase || 0).toLocaleString('en-IN')}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
                <span className="text-[11px] font-extrabold uppercase text-slate-400">Monthly Purchase</span>
                <p className="text-lg font-extrabold font-mono text-slate-900">₹ {(purchasesData.monthlyPurchase || 0).toLocaleString('en-IN')}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
                <span className="text-[11px] font-extrabold uppercase text-slate-400">Yearly Purchase</span>
                <p className="text-lg font-extrabold font-mono text-slate-900">₹ {(purchasesData.yearlyPurchase || 0).toLocaleString('en-IN')}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1 bg-blue-50/50 border-blue-200">
                <span className="text-[11px] font-extrabold uppercase text-blue-800">Total Purchase</span>
                <p className="text-xl font-black font-mono text-blue-900">₹ {(purchasesData.totalPurchase || 0).toLocaleString('en-IN')}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
                <span className="text-[11px] font-extrabold uppercase text-slate-400">Amount Paid</span>
                <p className="text-lg font-extrabold font-mono text-blue-700">₹ {(purchasesData.amountPaid || 0).toLocaleString('en-IN')}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
                <span className="text-[11px] font-extrabold uppercase text-slate-400">Outstanding Payables</span>
                <p className="text-lg font-extrabold font-mono text-rose-700">₹ {(purchasesData.outstandingPayables || 0).toLocaleString('en-IN')}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
                <span className="text-[11px] font-extrabold uppercase text-slate-400">Purchase Growth %</span>
                <p className="text-lg font-extrabold font-mono text-blue-700">+{purchasesData.purchaseGrowth || 0}%</p>
              </div>
            </div>

            {/* Purchase Charts Grid (3 Charts) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* 1. Daily Purchase Trend */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-700">Daily Procurement Trend</h4>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={purchasesData.charts?.purchaseTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                      <Tooltip formatter={(v) => `₹ ${Number(v).toLocaleString('en-IN')}`} />
                      <Area type="monotone" dataKey="purchase" name="Purchases" stroke="#2563EB" fill="#2563EB" fillOpacity={0.2} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 2. Monthly Purchase */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-700">Monthly Purchase Expense</h4>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={purchasesData.charts?.monthlyPurchase || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                      <Tooltip formatter={(v) => `₹ ${Number(v).toLocaleString('en-IN')}`} />
                      <Bar dataKey="purchase" name="Monthly Purchase" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 3. Supplier Purchase Trend */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-700">Supplier Purchase Share</h4>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={purchasesData.charts?.supplierPurchaseTrend || []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                      <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                      <Tooltip formatter={(v) => `₹ ${Number(v).toLocaleString('en-IN')}`} />
                      <Bar dataKey="amount" name="Purchased" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Purchase Tables Grid (4 Tables) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Top Suppliers */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-800">Top Suppliers</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-extrabold text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-2">Supplier</th>
                        <th className="py-2 px-2 text-right">Purchased (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                      {(purchasesData.tables?.topSuppliers || []).slice(0, 5).map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-2 font-bold truncate max-w-[100px]">{s.supplierName}</td>
                          <td className="py-2 px-2 text-right font-mono text-blue-700">₹ {(s.totalPurchased || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. Recent Purchases */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-800">Recent Purchase Bills</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-extrabold text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-2">Bill No</th>
                        <th className="py-2 px-2 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                      {(purchasesData.tables?.recentPurchases || []).slice(0, 5).map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-2 font-mono font-bold text-blue-700">{p.docNo}</td>
                          <td className="py-2 px-2 text-right font-mono">₹ {(p.amount || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Outstanding Suppliers */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-800">Outstanding Payables</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-extrabold text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-2">Supplier</th>
                        <th className="py-2 px-2 text-right">Due (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                      {(purchasesData.tables?.outstandingSuppliers || []).slice(0, 5).map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-2 font-bold truncate max-w-[100px]">{s.supplierName}</td>
                          <td className="py-2 px-2 text-right font-mono text-rose-700">₹ {(s.balance || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. Most Purchased Products */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-800">Most Purchased Items</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-extrabold text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-2">Product</th>
                        <th className="py-2 px-2 text-right">Valuation (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                      {(purchasesData.tables?.mostPurchasedProducts || []).slice(0, 5).map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-2 font-bold truncate max-w-[100px]">{p.name}</td>
                          <td className="py-2 px-2 text-right font-mono">₹ {(p.value || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3 CONTENT : OVERALL BUSINESS (OWNER DASHBOARD) */}
        {/* ========================================================================= */}
        {activeTab === 'OVERALL_BUSINESS' && (
          <div className="space-y-6">
            {/* Business Health Badge Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-slate-500 tracking-wider">BUSINESS HEALTH RATING</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                        (overallData.businessHealth?.score ?? 0) >= 90
                          ? 'bg-emerald-100 text-emerald-800'
                          : (overallData.businessHealth?.score ?? 0) >= 75
                          ? 'bg-purple-100 text-purple-800'
                          : (overallData.businessHealth?.score ?? 0) >= 50
                          ? 'bg-amber-100 text-amber-800'
                          : (overallData.businessHealth?.score ?? 0) >= 25
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {overallData.businessHealth?.status
                        ? `${overallData.businessHealth.status} (${overallData.businessHealth.score}/100)`
                        : 'Evaluating...'}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900">VEDIXA ERP Business Health Engine</h3>
                </div>
              </div>
            </div>

            {/* Intelligent Business Alert Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {(overallData.insights || []).map((card) => (
                <div
                  key={card.id}
                  className={`p-4 rounded-2xl border shadow-2xs space-y-1.5 ${
                    card.type === 'WARNING'
                      ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                      : card.type === 'SUCCESS' || card.type === 'HEALTHY'
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider">{card.type} ALERT</span>
                    {card.type === 'WARNING' ? <AlertTriangle className="w-4 h-4 text-rose-600" /> : <ShieldCheck className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <h4 className="text-xs font-extrabold leading-snug">{card.title}</h4>
                  <p className="text-[11px] font-medium opacity-90 leading-relaxed">{card.description}</p>
                </div>
              ))}
            </div>

            {/* Row 1: 5 Primary Executive KPIs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-3.5">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
                <span className="text-[11px] font-extrabold uppercase text-slate-400">Total Sales</span>
                <p className="text-lg font-extrabold font-mono text-slate-900">₹ {(overallData.totalSales || 0).toLocaleString('en-IN')}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
                <span className="text-[11px] font-extrabold uppercase text-slate-400">Total Purchase</span>
                <p className="text-lg font-extrabold font-mono text-slate-900">₹ {(overallData.totalPurchase || 0).toLocaleString('en-IN')}</p>
              </div>

              {/* Opening Stock Value - Interactive & Clickable */}
              <div
                onClick={() => setShowOpeningStockModal(true)}
                className="bg-gradient-to-br from-indigo-50/50 via-white to-indigo-50/30 border-2 border-indigo-200/90 hover:border-indigo-400 p-4 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer group space-y-1 relative"
                title="Click to view full opening stock item breakdown"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase text-indigo-700">Opening Stock Value</span>
                  <span className="text-[10px] font-extrabold text-indigo-600 group-hover:underline flex items-center gap-0.5">
                    <span>View List</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
                <p className="text-lg font-extrabold font-mono text-indigo-700">₹ {(overallData.openingStockValue || 0).toLocaleString('en-IN')}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
                <span className="text-[11px] font-extrabold uppercase text-emerald-800">Gross Profit</span>
                <p className="text-lg font-extrabold font-mono text-emerald-700">₹ {(overallData.grossProfit || 0).toLocaleString('en-IN')}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
                <span className="text-[11px] font-extrabold uppercase text-purple-700">Profit %</span>
                <p className="text-lg font-extrabold font-mono text-purple-700">{overallData.profitPct || 0}%</p>
              </div>
            </div>

            {/* Row 2: Secondary KPIs (4 Cards) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
                <span className="text-[11px] font-extrabold uppercase text-slate-400">Current Stock Value</span>
                <p className="text-lg font-extrabold font-mono text-slate-900">
                  ₹ {(overallData.currentStockValue ?? overallData.inventoryValue ?? 0).toLocaleString('en-IN')}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
                <span className="text-[11px] font-extrabold uppercase text-emerald-800">Cash Collection</span>
                <p className="text-lg font-extrabold font-mono text-emerald-700">
                  ₹ {(overallData.cashCollection || 0).toLocaleString('en-IN')}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
                <span className="text-[11px] font-extrabold uppercase text-rose-800">Supplier Dues</span>
                <p className="text-lg font-extrabold font-mono text-rose-700">
                  ₹ {(overallData.supplierOutstanding || overallData.supplierDues || 0).toLocaleString('en-IN')}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
                <span className="text-[11px] font-extrabold uppercase text-slate-400">Advance Collections</span>
                <p className="text-lg font-extrabold font-mono text-slate-900">
                  ₹ {(overallData.advanceCollections || 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Row 3: Customer Receivables Card */}
            <div
              onClick={() => setShowReceivablesModal(true)}
              className="bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30 border-2 border-purple-200/90 hover:border-purple-400 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-purple-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-purple-900 tracking-wider">Customer Receivables</h4>
                    <p className="text-[11px] text-slate-500 font-medium">Total outstanding amount to be collected from customers</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowReceivablesModal(true);
                  }}
                  className="text-xs font-extrabold text-purple-700 hover:text-purple-950 group-hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>View Customers</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                <div className="bg-white/95 p-3 rounded-xl border border-purple-100 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Users className="w-3.5 h-3.5 text-purple-600" />
                    <span className="text-[11px] font-extrabold text-slate-700">Customers with Outstanding Dues</span>
                  </div>
                  <p className="text-lg font-black font-mono text-purple-900">
                    {(overallData.customerReceivablesList || []).length}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium leading-tight">
                    Active accounts with due balances
                  </p>
                </div>

                <div className="bg-purple-100/70 p-3 rounded-xl border border-purple-300 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-purple-800">
                    <Layers className="w-3.5 h-3.5 text-purple-700" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-purple-900">Total Outstanding</span>
                  </div>
                  <p className="text-xl font-black font-mono text-purple-950">
                    ₹ {(overallData.totalCustomerDues || overallData.customerOutstanding || salesData.outstandingCollection || 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-purple-800 font-bold leading-tight">
                    Cumulative customer dues
                  </p>
                </div>
              </div>
            </div>

            {/* 5 Owner Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* 1. Sales vs Purchase */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-800">Sales vs Purchase</h4>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={overallData.charts?.salesVsPurchase || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                      <Tooltip formatter={(v) => `₹ ${Number(v).toLocaleString('en-IN')}`} />
                      <Area type="monotone" dataKey="sales" name="Sales" stroke={BRAND_GREEN} fill={BRAND_GREEN} fillOpacity={0.2} strokeWidth={2} />
                      <Area type="monotone" dataKey="purchase" name="Purchase" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 2. Profit Trend */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-800">Profit Trend</h4>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={overallData.charts?.profitTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                      <Tooltip formatter={(v) => `₹ ${Number(v).toLocaleString('en-IN')}`} />
                      <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 3. Inventory Trend */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-800">Inventory Trend</h4>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={overallData.charts?.inventoryTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                      <Tooltip formatter={(v) => `₹ ${Number(v).toLocaleString('en-IN')}`} />
                      <Area type="monotone" dataKey="value" name="Stock Value" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.2} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 4. Cash Flow */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-800">Net Cash Flow</h4>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overallData.charts?.cashFlow || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                      <Tooltip formatter={(v) => `₹ ${Number(v).toLocaleString('en-IN')}`} />
                      <Bar dataKey="cashFlow" name="Cash Flow" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 5. Business Growth */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3 lg:col-span-2">
                <h4 className="text-xs font-extrabold uppercase text-slate-800">Yearly Business Growth Comparison</h4>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overallData.charts?.businessGrowth || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                      <Tooltip formatter={(v) => `₹ ${Number(v).toLocaleString('en-IN')}`} />
                      <Legend />
                      <Bar dataKey="sales" name="Total Sales" fill={BRAND_GREEN} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="purchase" name="Total Purchase" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="profit" name="Gross Profit" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 4 Inventory & Velocity Tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Top Profitable Products */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-800">Top Profitable Products</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-extrabold text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-2">Product</th>
                        <th className="py-2 px-2 text-right">Profit (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                      {(overallData.tables?.topProfitableProducts || []).slice(0, 5).map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-2 font-bold truncate max-w-[100px]">{p.name}</td>
                          <td className="py-2 px-2 text-right font-mono text-emerald-800 font-bold">₹ {(p.profit || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. Fast Moving Products */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-800">Fast Moving Products</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-extrabold text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-2">Product</th>
                        <th className="py-2 px-2 text-right">Revenue (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                      {(overallData.tables?.fastMovingProducts || []).slice(0, 5).map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-2 font-bold truncate max-w-[100px]">{p.name}</td>
                          <td className="py-2 px-2 text-right font-mono text-emerald-800">₹ {(p.salesValue || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Slow Moving Products */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-800">Slow Moving Products</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-extrabold text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-2">Product</th>
                        <th className="py-2 px-2 text-right">Revenue (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                      {(overallData.tables?.slowMovingProducts || []).slice(0, 5).map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-2 font-bold truncate max-w-[100px]">{p.name}</td>
                          <td className="py-2 px-2 text-right font-mono text-slate-600">₹ {(p.salesValue || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. Dead Stock Products */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-800">Dead Stock (Unsold)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-extrabold text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-2">Product</th>
                        <th className="py-2 px-2 text-right">Valuation (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                      {(overallData.tables?.deadStock || []).slice(0, 5).map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-2 font-bold truncate max-w-[100px]">{p.name}</td>
                          <td className="py-2 px-2 text-right font-mono text-amber-700 font-bold">₹ {(p.value || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CUSTOMER RECEIVABLES / DUES MODAL DIALOG */}
        {/* ========================================================================= */}
        {showReceivablesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Customer Receivables & Dues</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      All customers with outstanding opening balances or unpaid invoice dues
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReceivablesModal(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center font-bold text-lg cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Summary Metrics Bar */}
              <div className="p-4 bg-purple-50/40 border-b border-purple-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black uppercase text-purple-900 block">Total Customer Outstanding</span>
                  <span className="text-xl font-black font-mono text-purple-950">
                    ₹ {(overallData.totalCustomerDues || overallData.customerOutstanding || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-slate-500 block">Total Due Accounts</span>
                  <span className="text-sm font-black font-mono text-slate-800">
                    {(overallData.customerReceivablesList || []).length} customers
                  </span>
                </div>
              </div>

              {/* Search Control */}
              <div className="p-4 border-b border-slate-100">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by customer name or mobile..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Customer Dues Table */}
              <div className="overflow-y-auto flex-1 p-4">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-500 font-extrabold text-[10px] uppercase sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Mobile</th>
                      <th className="py-2.5 px-3 text-right">Outstanding Due (₹)</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                    {filteredCustomerList.length > 0 ? (
                      filteredCustomerList.map((c) => (
                        <tr key={c.id} className="hover:bg-purple-50/40 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-extrabold text-slate-900">{c.name}</div>
                            <span className="text-[10px] text-slate-400 font-medium uppercase">{c.customerType || 'Customer'}</span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-600">{c.mobile || '-'}</td>
                          <td className="py-3 px-3 text-right font-mono font-black text-purple-900 text-sm">
                            ₹ {(c.dues || c.totalDue || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {c.customerType === 'ADDED' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowReceivablesModal(false);
                                  navigate(`/customers/${c.id}/ledger`);
                                }}
                                className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-lg font-bold text-[11px] cursor-pointer transition-colors whitespace-nowrap"
                              >
                                View Ledger
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowReceivablesModal(false);
                                  navigate('/customers');
                                }}
                                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] cursor-pointer transition-colors whitespace-nowrap"
                              >
                                View Details
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-slate-400 font-medium">
                          No customers found matching the criteria
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>
                  Showing {filteredCustomerList.length} of {(overallData.customerReceivablesList || []).length} customer(s)
                </span>
                <button
                  type="button"
                  onClick={() => setShowReceivablesModal(false)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Opening Stock Details Modal */}
        <OpeningStockListModal
          isOpen={showOpeningStockModal}
          onClose={() => setShowOpeningStockModal(false)}
          expectedTotalValue={overallData.openingStockValue}
        />
      </div>
    </PageLayout>
  );
}
