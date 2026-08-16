import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Search, Phone, FileText, X, Download, ArrowUpRight, CheckCircle, AlertCircle } from 'lucide-react';
import { customerService } from '../../services/customerService';
import { invoiceService } from '../../services/invoiceService';

export default function GeneralCustomerPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Fetch Customers from Single Source of Truth API
  const { data: customersApi, isLoading } = useQuery({
    queryKey: ['customers-settings', searchQuery],
    queryFn: () => customerService.getCustomers({ search: searchQuery }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const customersList = useMemo(() => {
    return customersApi?.data?.customers || customersApi?.customers || [];
  }, [customersApi]);

  // Fetch Invoices for Selected Customer Modal
  const { data: invoicesApi, isLoading: isInvoiceLoading } = useQuery({
    queryKey: ['customer-invoices-modal', selectedCustomer?.mobile || selectedCustomer?.name],
    queryFn: () => invoiceService.getInvoices({ search: selectedCustomer?.mobile || selectedCustomer?.name }),
    enabled: Boolean(selectedCustomer && isInvoiceModalOpen),
    staleTime: 2 * 60 * 1000,
  });

  const customerInvoices = useMemo(() => {
    return invoicesApi?.data?.invoices || invoicesApi?.invoices || [];
  }, [invoicesApi]);

  const handleRowClick = (customer) => {
    setSelectedCustomer(customer);
    setIsInvoiceModalOpen(true);
  };

  return (
    <div className="space-y-4 font-sans text-xs w-full pb-10">
      
      {/* Header Card */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#047857] flex items-center justify-center border border-emerald-200 shrink-0 font-bold">
            <Users className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-gray-900 leading-tight">General Customer Directory</h2>
            <p className="text-[11px] text-gray-500 font-medium">
              Click any customer row below to inspect their complete counter bill history and payment logs
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search general customers..."
            className="w-full h-9 pl-9 pr-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Main Customers Table */}
      <div className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-2xs w-full">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-[#047857] border-t-transparent rounded-full animate-spin" />
            <span>Loading General Customers list...</span>
          </div>
        ) : customersList.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-1">
            <p className="font-bold text-sm text-gray-700">No General Customers Found</p>
            <p className="text-xs text-gray-400">All registered customers and counter clients will appear here.</p>
          </div>
        ) : (
          <div className="w-full">
            {/* DESKTOP TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-gray-50/90 border-b border-gray-200 text-gray-600 font-semibold text-[10px] uppercase tracking-tight">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Customer Name</th>
                    <th className="py-2.5 px-3">Mobile Number</th>
                    <th className="py-2.5 px-3 text-right">Outstanding Dues (₹)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-normal text-gray-800">
                  {customersList.map((cust, idx) => {
                    const dueVal = Number(cust.outstandingBalance || 0);
                    return (
                      <tr
                        key={cust._id || cust.id || idx}
                        onClick={() => handleRowClick(cust)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        <td className="py-2.5 px-3 text-gray-400 font-medium text-[10px]">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-gray-900">{cust.name}</td>
                        <td className="py-2.5 px-3 font-mono font-medium text-gray-600 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span>{cust.mobile || 'N/A'}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          {dueVal > 0 ? (
                            <span className="text-red-600">₹ {dueVal.toLocaleString('en-IN')}</span>
                          ) : (
                            <span className="text-gray-700">₹ 0.00</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              dueVal > 0
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-emerald-50 text-[#047857] border border-emerald-200'
                            }`}
                          >
                            {dueVal > 0 ? 'Due' : 'Healthy'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleRowClick(cust)}
                            className="p-1 rounded hover:bg-emerald-50 text-emerald-700 font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Ledger</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}
            <div className="block md:hidden space-y-3 p-3">
              {customersList.map((cust, idx) => {
                const dueVal = Number(cust.outstandingBalance || 0);
                return (
                  <div
                    key={cust._id || cust.id || idx}
                    onClick={() => handleRowClick(cust)}
                    className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-2xs space-y-3 cursor-pointer hover:border-emerald-300 transition-all font-sans"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <div>
                        <span className="font-extrabold text-gray-900 text-sm block">{cust.name}</span>
                        <span className="font-mono text-xs text-gray-600">{cust.mobile || 'N/A'}</span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          dueVal > 0
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-emerald-50 text-[#047857] border border-emerald-200'
                        }`}
                      >
                        {dueVal > 0 ? 'Due' : 'Healthy'}
                      </span>
                    </div>

                    <div className="text-xs">
                      <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Outstanding Dues</span>
                      <span className={`font-mono font-black text-xs block ${dueVal > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                        ₹ {dueVal.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Customer Invoice History Modal */}
      {isInvoiceModalOpen && selectedCustomer && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-sans text-xs"
          onClick={() => setIsInvoiceModalOpen(false)}
        >
          <div
            className="relative bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 p-4 sm:p-5 space-y-4 z-50 max-h-[85vh] flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-gray-900">
                  Invoice History: {selectedCustomer.name}
                </h3>
                <p className="text-[11px] text-gray-500 font-medium">
                  Mobile: {selectedCustomer.mobile || 'N/A'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content Table */}
            <div className="flex-1 overflow-y-auto space-y-3">
              {isInvoiceLoading ? (
                <div className="p-8 text-center text-gray-400 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#047857] border-t-transparent rounded-full animate-spin" />
                  <span>Loading customer invoice history...</span>
                </div>
              ) : customerInvoices.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  No billing invoices found for this customer.
                </div>
              ) : (
                <div className="w-full">
                  {/* DESKTOP INVOICES TABLE */}
                  <div className="hidden md:block border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-[10px] uppercase">
                        <tr>
                          <th className="py-2.5 px-3">Invoice #</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3 text-right">Total Amount</th>
                          <th className="py-2.5 px-3 text-right">Paid Amount</th>
                          <th className="py-2.5 px-3 text-right">Due Amount</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                        {customerInvoices.map((inv, idx) => (
                          <tr key={inv._id || idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono font-bold text-gray-900">{inv.invoiceNumber}</td>
                            <td className="py-2.5 px-3 font-mono text-gray-500">
                              {new Date(inv.date || inv.createdAt).toLocaleDateString('en-IN')}
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
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                inv.status === 'Paid'
                                  ? 'bg-emerald-50 text-[#047857] border border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}>
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
                    {customerInvoices.map((inv, idx) => (
                      <div key={inv._id || idx} className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-2xs space-y-2.5 text-xs font-sans">
                        <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                          <span className="font-mono font-extrabold text-[#047857]">{inv.invoiceNumber}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-[#047857] border border-emerald-200">
                            {inv.status || 'Paid'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 font-mono text-center pt-1">
                          <div>
                            <span className="text-[9px] text-gray-400 block uppercase font-sans">Total</span>
                            <span className="font-bold text-gray-900 text-xs">₹ {(inv.totalAmount || 0).toLocaleString('en-IN')}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-emerald-600 block uppercase font-sans">Paid</span>
                            <span className="font-bold text-[#047857] text-xs">₹ {(inv.paidAmount || 0).toLocaleString('en-IN')}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-red-500 block uppercase font-sans">Due</span>
                            <span className="font-bold text-red-600 text-xs">₹ {(inv.dueAmount || 0).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[11px] text-gray-400 font-medium">
                VEDIXA ERP General Customer Management
              </span>
              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(false)}
                className="px-4 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
