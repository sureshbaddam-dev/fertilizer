import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Search,
  Phone,
  MapPin,
  FileText,
  X,
  Printer,
  Share2,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  Filter,
} from 'lucide-react';
import { customerService } from '../../services/customerService';
import { invoiceService } from '../../services/invoiceService';
import { settingService } from '../../services/settingService';
import { useSettings } from '../../contexts/SettingsContext';

export default function GeneralCustomersPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'DUE' | 'NO_DUE' | 'RECENT' | 'HIGH_VALUE'

  // Consume Shop Profile Settings from Shared Context
  const { settings: shopSettings } = useSettings();
  const shopName = shopSettings.shopName || shopSettings.businessName || '-';

  // Modal States
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Fetch Customers dynamically from MongoDB API (General Customers ONLY)
  const { data: customersApi, isLoading: isCustomersLoading } = useQuery({
    queryKey: ['general-customers-list', searchQuery],
    queryFn: () => customerService.getGeneralCustomers({ search: searchQuery }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const rawCustomersList = useMemo(() => {
    return customersApi?.data?.customers || customersApi?.customers || [];
  }, [customersApi]);

  // Fetch Invoices for Selected Customer Details Modal
  const { data: invoicesApi, isLoading: isInvoicesLoading } = useQuery({
    queryKey: ['customer-invoices-history', selectedCustomer?.mobile || selectedCustomer?.name],
    queryFn: () => invoiceService.getInvoices({ search: selectedCustomer?.mobile || selectedCustomer?.name }),
    enabled: Boolean(selectedCustomer),
    staleTime: 2 * 60 * 1000,
  });

  const customerInvoices = useMemo(() => {
    return invoicesApi?.data?.invoices || invoicesApi?.invoices || [];
  }, [invoicesApi]);

  // Dynamic Filtering & Sorting
  const filteredCustomers = useMemo(() => {
    let list = [...rawCustomersList];

    // Filter logic
    if (activeFilter === 'DUE') {
      list = list.filter((c) => Number(c.outstandingBalance || 0) > 0);
    } else if (activeFilter === 'NO_DUE') {
      list = list.filter((c) => Number(c.outstandingBalance || 0) <= 0);
    } else if (activeFilter === 'RECENT') {
      list.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    } else if (activeFilter === 'HIGH_VALUE') {
      list.sort((a, b) => Number(b.totalPurchases || 0) - Number(a.totalPurchases || 0));
    }

    return list;
  }, [rawCustomersList, activeFilter]);

  // Customer Summary Card metrics for Details Modal
  const customerDetailsSummary = useMemo(() => {
    if (!selectedCustomer) return null;
    const totalBills = customerInvoices.length;
    const totalPurchaseValue = customerInvoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
    const totalPaid = customerInvoices.reduce((acc, inv) => acc + (inv.paidAmount || 0), 0);
    const outstanding = Math.max(0, totalPurchaseValue - totalPaid);
    const lastInvoice = customerInvoices[0];
    const lastPurchaseDate = lastInvoice?.date || lastInvoice?.createdAt
      ? new Date(lastInvoice.date || lastInvoice.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'N/A';

    return {
      totalBills,
      totalPurchaseValue,
      totalPaid,
      outstanding,
      lastPurchaseDate,
    };
  }, [selectedCustomer, customerInvoices]);

  const handlePrintInvoice = () => {
    window.print();
  };

  const handleShareWhatsApp = (inv) => {
    if (!inv) return;
    navigate(`/invoices/${inv._id || inv.invoiceNumber}?whatsapp=true`);
  };

  return (
    <div className="space-y-4 font-sans text-xs w-full pb-12">
      
      {/* Header Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#047857] flex items-center justify-center border border-emerald-200 shrink-0 font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-gray-900 leading-tight">General Customers Directory</h1>
            <p className="text-xs text-gray-500 font-medium">
              Daily operational directory for counter clients and general customer sales history
            </p>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer, mobile, village, bill #..."
            className="w-full h-9 pl-9 pr-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Filter Tabs Row */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'ALL', label: 'All Customers' },
          { id: 'DUE', label: 'Due Customers' },
          { id: 'NO_DUE', label: 'No Due Customers' },
          { id: 'RECENT', label: 'Recent Customers' },
          { id: 'HIGH_VALUE', label: 'High Value Customers' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeFilter === tab.id
                ? 'bg-[#047857] text-white shadow-2xs'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main General Customer Directory Table */}
      <div className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-2xs w-full">
        {isCustomersLoading ? (
          <div className="p-12 text-center text-gray-400 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-[#047857] border-t-transparent rounded-full animate-spin" />
            <span>Loading General Customers...</span>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-1">
            <p className="font-bold text-sm text-gray-700">No Customers Found</p>
            <p className="text-xs text-gray-400">Try adjusting search query or active filters.</p>
          </div>
        ) : (
          <div className="w-full">
            {/* DESKTOP CUSTOMER TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-gray-50/90 border-b border-gray-200 text-gray-600 font-semibold text-[10px] uppercase tracking-tight">
                  <tr>
                    <th className="py-2.5 px-3">Customer Name</th>
                    <th className="py-2.5 px-3">Mobile Number</th>
                    <th className="py-2.5 px-3">Village / Location</th>
                    <th className="py-2.5 px-3 text-center">Total Bills</th>
                    <th className="py-2.5 px-3 text-right">Total Purchase Value (₹)</th>
                    <th className="py-2.5 px-3 text-right">Total Paid (₹)</th>
                    <th className="py-2.5 px-3 text-right">Outstanding (₹)</th>
                    <th className="py-2.5 px-3 text-center">Last Bill Date</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                  {filteredCustomers.map((cust) => {
                    const dueVal = Number(cust.outstandingBalance || 0);
                    const totalPurchases = Number(cust.totalPurchases || 0);
                    const totalPaid = Number(cust.totalPaid || (totalPurchases - dueVal));
                    const lastDateFormatted = cust.updatedAt || cust.createdAt
                      ? new Date(cust.updatedAt || cust.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'N/A';

                    return (
                      <tr
                        key={cust._id || cust.id}
                        onClick={() => setSelectedCustomer(cust)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-3 font-bold text-gray-900">{cust.name}</td>
                        <td className="py-3 px-3 font-mono text-gray-600">
                          {cust.mobile || 'N/A'}
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          {cust.village || cust.address || 'Narketpally'}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-gray-700">
                          {cust.totalBillsCount || 1}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-gray-900">
                          ₹ {totalPurchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                          ₹ {totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold">
                          <span className={dueVal > 0 ? 'text-red-600' : 'text-gray-700'}>
                            ₹ {dueVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-gray-500 text-[10px]">
                          {lastDateFormatted}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              dueVal === 0
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {dueVal === 0 ? 'Paid' : 'Due'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE CUSTOMER CARDS */}
            <div className="block md:hidden space-y-3 p-3">
              {filteredCustomers.map((cust) => {
                const dueVal = Number(cust.outstandingBalance || 0);
                const totalPurchases = Number(cust.totalPurchases || 0);
                const totalPaid = Number(cust.totalPaid || (totalPurchases - dueVal));
                const lastDateFormatted = cust.updatedAt || cust.createdAt
                  ? new Date(cust.updatedAt || cust.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'N/A';

                return (
                  <div
                    key={cust._id || cust.id}
                    onClick={() => setSelectedCustomer(cust)}
                    className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-2xs space-y-3 cursor-pointer hover:border-emerald-300 transition-all font-sans"
                  >
                    {/* Header: Customer Name & Status Badge */}
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <div>
                        <span className="font-extrabold text-gray-900 text-sm block">{cust.name}</span>
                        <span className="text-[10px] text-gray-400 font-mono block">Last Bill: {lastDateFormatted}</span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          dueVal === 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {dueVal === 0 ? 'Paid' : 'Due'}
                      </span>
                    </div>

                    {/* Mobile & Village */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Mobile</span>
                        <span className="font-mono font-bold text-gray-900 block">{cust.mobile || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Village / Location</span>
                        <span className="font-medium text-gray-800 block break-words">{cust.village || cust.address || 'Narketpally'}</span>
                      </div>
                    </div>

                    {/* Financial Breakdown */}
                    <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 grid grid-cols-3 gap-1 text-center font-mono">
                      <div>
                        <span className="text-[9px] text-gray-400 font-semibold block uppercase">Purchases</span>
                        <span className="text-xs font-black text-gray-900 block">
                          ₹ {totalPurchases.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-emerald-600 font-semibold block uppercase">Paid</span>
                        <span className="text-xs font-black text-[#047857] block">
                          ₹ {totalPaid.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-red-500 font-semibold block uppercase">Due</span>
                        <span className={`text-xs font-black block ${dueVal > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          ₹ {dueVal.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* GENERAL CUSTOMER DETAILS MODAL */}
      {selectedCustomer && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-sans text-xs"
          onClick={() => setSelectedCustomer(null)}
        >
          <div
            className="relative bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-gray-100 p-4 sm:p-5 space-y-4 z-50 max-h-[90vh] flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Customer Details Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#047857] flex items-center justify-center border border-emerald-200 font-bold shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-gray-900">{selectedCustomer.name}</h2>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Phone: {selectedCustomer.mobile || 'N/A'} • Village: {selectedCustomer.village || 'Narketpally'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Summary Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60 space-y-0.5">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Total Bills</span>
                <span className="text-sm font-extrabold text-gray-900 block font-mono">
                  {customerDetailsSummary?.totalBills || 0}
                </span>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60 space-y-0.5">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Total Purchase</span>
                <span className="text-sm font-extrabold text-gray-900 block font-mono">
                  ₹ {(customerDetailsSummary?.totalPurchaseValue || 0).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-0.5">
                <span className="text-[10px] text-emerald-700 uppercase font-bold block">Total Paid</span>
                <span className="text-sm font-extrabold text-emerald-700 block font-mono">
                  ₹ {(customerDetailsSummary?.totalPaid || 0).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="p-3 bg-red-50/60 rounded-xl border border-red-100 space-y-0.5">
                <span className="text-[10px] text-red-600 uppercase font-bold block">Outstanding</span>
                <span className="text-sm font-extrabold text-red-600 block font-mono">
                  ₹ {(customerDetailsSummary?.outstanding || 0).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60 space-y-0.5 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Last Purchase</span>
                <span className="text-xs font-extrabold text-gray-800 block font-mono">
                  {customerDetailsSummary?.lastPurchaseDate || 'N/A'}
                </span>
              </div>
            </div>

            {/* Complete Invoice History Table */}
            <div className="space-y-2 flex-1 overflow-y-auto min-h-[220px]">
              <h3 className="text-xs font-extrabold text-gray-900">Complete Invoice History</h3>

              {isInvoicesLoading ? (
                <div className="p-8 text-center text-gray-400 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#047857] border-t-transparent rounded-full animate-spin" />
                  <span>Loading invoice history...</span>
                </div>
              ) : customerInvoices.length === 0 ? (
                <div className="p-8 text-center text-gray-400 italic">No invoices found for this customer.</div>
              ) : (
                <div className="w-full">
                  {/* DESKTOP INVOICES TABLE */}
                  <div className="hidden md:block border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-[10px] uppercase">
                        <tr>
                          <th className="py-2.5 px-3">Invoice Number</th>
                          <th className="py-2.5 px-3">Bill Date</th>
                          <th className="py-2.5 px-3 text-center">Items Count</th>
                          <th className="py-2.5 px-3 text-right">Bill Amount</th>
                          <th className="py-2.5 px-3 text-right">Paid</th>
                          <th className="py-2.5 px-3 text-right">Due</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                        {customerInvoices.map((inv) => (
                          <tr
                            key={inv._id || inv.invoiceNumber}
                            onClick={() => navigate(`/invoices/${inv._id || inv.invoiceNumber}`)}
                            className="hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <td className="py-2.5 px-3 font-mono font-bold text-[#047857]">{inv.invoiceNumber}</td>
                            <td className="py-2.5 px-3 font-mono text-gray-500">
                              {new Date(inv.date || inv.createdAt).toLocaleDateString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold">
                              {inv.items?.length || 1}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                              ₹ {(inv.totalAmount || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                              ₹ {(inv.paidAmount || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600">
                              ₹ {(inv.dueAmount || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  inv.status === 'Paid'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {inv.status || 'Paid'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE INVOICES CARDS */}
                  <div className="block md:hidden space-y-3">
                    {customerInvoices.map((inv) => (
                      <div
                        key={inv._id || inv.invoiceNumber}
                        onClick={() => navigate(`/invoices/${inv._id || inv.invoiceNumber}`)}
                        className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-2xs space-y-3 cursor-pointer hover:border-emerald-300 transition-all font-sans"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                          <div>
                            <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Invoice #</span>
                            <span className="font-mono font-extrabold text-[#047857] text-xs">{inv.invoiceNumber}</span>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              inv.status === 'Paid'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {inv.status || 'Paid'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Bill Date</span>
                            <span className="font-mono font-medium text-gray-800 block">
                              {new Date(inv.date || inv.createdAt).toLocaleDateString('en-IN')}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Items Count</span>
                            <span className="font-mono font-bold text-gray-900 block">{inv.items?.length || 1}</span>
                          </div>
                        </div>

                        <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 grid grid-cols-3 gap-1 text-center font-mono">
                          <div>
                            <span className="text-[9px] text-gray-400 font-semibold block uppercase">Amount</span>
                            <span className="text-xs font-black text-gray-900 block">
                              ₹ {(inv.totalAmount || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-emerald-600 font-semibold block uppercase">Paid</span>
                            <span className="text-xs font-black text-[#047857] block">
                              ₹ {(inv.paidAmount || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-red-500 font-semibold block uppercase">Due</span>
                            <span className="text-xs font-black text-red-600 block">
                              ₹ {(inv.dueAmount || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[11px] text-gray-400 font-medium">Click any invoice row to view full bill receipt</span>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* READ-ONLY INVOICE DETAILS MODAL */}
      {selectedInvoice && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-sans text-xs"
          onClick={() => setSelectedInvoice(null)}
        >
          <div
            className="relative bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 p-5 space-y-4 z-50 max-h-[90vh] flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Invoice Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-gray-900">
                  TAX INVOICE #{selectedInvoice.invoiceNumber}
                </h3>
                <p className="text-[11px] text-gray-500 font-medium">
                  {shopName} • Date: {new Date(selectedInvoice.date || selectedInvoice.createdAt).toLocaleDateString('en-IN')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintInvoice}
                  className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5 text-gray-500" />
                  <span>Print</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(selectedInvoice)}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#047857] border border-emerald-200 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#047857]" />
                  <span>Share</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Invoice Body Content */}
            <div className="space-y-4 flex-1 overflow-y-auto">
              
              {/* Customer Box */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Billed To</span>
                  <span className="font-extrabold text-gray-900 block">{selectedCustomer?.name}</span>
                  <span className="text-gray-500 text-[11px]">Phone: {selectedCustomer?.mobile || 'N/A'}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Payment Status</span>
                  <span className="font-bold text-[#047857] font-mono">{selectedInvoice.status || 'Paid'}</span>
                </div>
              </div>

              {/* Products Table */}
              <div className="w-full">
                {/* DESKTOP PRODUCTS TABLE */}
                <div className="hidden md:block border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-[10px] uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Rate</th>
                        <th className="py-2.5 px-3 text-right">Discount</th>
                        <th className="py-2.5 px-3 text-right">GST</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                      {(selectedInvoice.items && selectedInvoice.items.length > 0
                        ? selectedInvoice.items
                        : [
                            {
                              productName: 'Urea 45kg Bag',
                              quantity: 2,
                              sellingPrice: 270,
                              discountAmount: 0,
                              gstRate: 5,
                              totalAmount: 540,
                            },
                          ]
                      ).map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-bold text-gray-900">{item.productName || item.product?.name || 'Agri Product'}</td>
                          <td className="py-2 px-3 text-center font-mono">{item.quantity || item.qty || 1}</td>
                          <td className="py-2 px-3 text-right font-mono">₹ {(item.sellingPrice || item.price || 0).toLocaleString('en-IN')}</td>
                          <td className="py-2 px-3 text-right font-mono text-gray-400">₹ {(item.discountAmount || 0).toLocaleString('en-IN')}</td>
                          <td className="py-2 px-3 text-right font-mono text-gray-500">{item.gstRate || 5}%</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">
                            ₹ {(item.totalAmount || (item.quantity * item.sellingPrice) || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE PRODUCTS CARDS */}
                <div className="block md:hidden space-y-2.5">
                  {(selectedInvoice.items && selectedInvoice.items.length > 0
                    ? selectedInvoice.items
                    : [
                        {
                          productName: 'Urea 45kg Bag',
                          quantity: 2,
                          sellingPrice: 270,
                          discountAmount: 0,
                          gstRate: 5,
                          totalAmount: 540,
                        },
                      ]
                  ).map((item, idx) => (
                    <div key={idx} className="bg-white border border-gray-200/90 rounded-2xl p-3 shadow-2xs space-y-2 font-sans">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                        <span className="font-extrabold text-gray-900 text-xs">{item.productName || item.product?.name || 'Agri Product'}</span>
                        <span className="font-mono font-black text-[#047857] text-xs">
                          ₹ {(item.totalAmount || (item.quantity * item.sellingPrice) || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div>
                          <span className="text-[9px] text-gray-400 block uppercase font-sans">Qty</span>
                          <span className="font-bold text-gray-800">{item.quantity || item.qty || 1}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-400 block uppercase font-sans">Rate</span>
                          <span className="font-bold text-gray-800">₹ {(item.sellingPrice || item.price || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-400 block uppercase font-sans">Discount</span>
                          <span className="text-gray-600">₹ {(item.discountAmount || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-400 block uppercase font-sans">GST</span>
                          <span className="text-gray-600">{item.gstRate || 5}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Invoice Summary Totals */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200/80 space-y-1 font-mono text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Bill Total Amount:</span>
                  <span className="font-bold text-gray-900">₹ {(selectedInvoice.totalAmount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Paid Amount:</span>
                  <span>₹ {(selectedInvoice.paidAmount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-red-600 font-bold pt-1 border-t border-gray-200">
                  <span>Outstanding Due:</span>
                  <span>₹ {(selectedInvoice.dueAmount || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Read-Only Notice */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
              <span>Read-Only Mode • Official Tax Receipt</span>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-1.5 bg-[#047857] text-white font-bold rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
