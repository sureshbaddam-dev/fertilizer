import React, { useState } from 'react';
import { Search, X, Filter, UserCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { customerService } from '../../services/customerService';

export default function CustomerSearch({ selectedCustomer, onSelectCustomer }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [customerType, setCustomerType] = useState('selected');

  const { data: customerResponse } = useQuery({
    queryKey: ['customers', searchTerm],
    queryFn: () => customerService.getCustomers({ search: searchTerm }),
  });

  const rawCustomers = customerResponse?.data || customerResponse?.items || customerResponse || [];
  const customerList = Array.isArray(rawCustomers) ? rawCustomers : [];

  const filteredCustomers = customerList.map((c) => ({
    id: c._id || c.id,
    name: c.name || c.customerName || 'Customer',
    mobile: c.mobile || c.customerMobile || '',
    initials: (c.name || 'C').slice(0, 2).toUpperCase(),
    totalPurchases: Number(c.totalPurchases || c.totalSales || 0),
    totalPaid: Number(c.totalPaid || c.paidAmount || 0),
    oldDue: Number(c.outstandingBalance || c.dueAmount || 0),
    creditLimit: Number(c.creditLimit || 50000),
    availableLimit: Math.max(0, Number(c.creditLimit || 50000) - Number(c.outstandingBalance || 0)),
  })).filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.mobile.includes(searchTerm)
  );

  return (
    <div className="space-y-2 text-xs">
      <label className="font-bold text-gray-800 block text-xs">Customer</label>

      {/* Search Input Box */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={selectedCustomer ? `${selectedCustomer.name} - ${selectedCustomer.mobile}` : searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            if (selectedCustomer) onSelectCustomer(null);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search customer by name or mobile..."
          className="w-full pl-9 pr-16 py-2 text-xs bg-gray-50/70 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium transition-all"
        />

        {/* Action icons right */}
        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1">
          {(selectedCustomer || searchTerm) && (
            <button
              onClick={() => {
                setSearchTerm('');
                onSelectCustomer(null);
              }}
              className="text-gray-400 hover:text-gray-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button className="p-1 text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200">
            <Filter className="w-3 h-3" />
          </button>
        </div>

        {/* Dropdown Suggestions */}
        {isOpen && !selectedCustomer && searchTerm.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 max-h-60 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((cust) => (
                <div
                  key={cust.id}
                  onClick={() => {
                    onSelectCustomer(cust);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className="p-2.5 hover:bg-emerald-50/60 cursor-pointer flex items-center justify-between border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center">
                      {cust.initials}
                    </div>
                    <div>
                      <span className="font-bold text-gray-900 block leading-tight">{cust.name}</span>
                      <span className="text-[10px] text-gray-500 font-medium">{cust.mobile}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-red-600">Old Due: ₹ {cust.oldDue}</span>
                </div>
              ))
            ) : (
              <div className="p-3 text-center text-gray-400 text-xs font-medium">No customers found</div>
            )}
          </div>
        )}
      </div>

      {/* Selected Customer Details Card (Screenshot 2 Match) */}
      {selectedCustomer && (
        <div className="bg-emerald-50/40 p-3 rounded-2xl border border-emerald-100 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center shadow-2xs">
                {selectedCustomer.initials}
              </div>
              <div>
                <span className="font-extrabold text-gray-900 block text-xs leading-tight">{selectedCustomer.name}</span>
                <span className="text-[10px] text-gray-500 font-medium">{selectedCustomer.mobile}</span>
              </div>
            </div>

            <button className="px-2.5 py-1 text-[10px] font-bold text-emerald-700 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors">
              View Ledger
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-1 bg-white/80 p-2 rounded-xl border border-emerald-100/60 text-[10px] text-center font-semibold">
            <div>
              <span className="text-gray-400 block font-normal text-[9px]">Total Purchases</span>
              <span className="text-gray-800 font-extrabold">₹ {selectedCustomer.totalPurchases.toLocaleString()}</span>
            </div>
            <div className="border-x border-emerald-100">
              <span className="text-gray-400 block font-normal text-[9px]">Total Paid</span>
              <span className="text-emerald-700 font-extrabold">₹ {selectedCustomer.totalPaid.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-400 block font-normal text-[9px]">Old Due (Outstanding)</span>
              <span className="text-red-600 font-extrabold">₹ {selectedCustomer.oldDue.toLocaleString()}</span>
            </div>
          </div>

          {/* Credit Limit Badge */}
          <div className="flex items-center justify-between text-[10px] font-semibold pt-0.5 px-1">
            <span className="text-emerald-700">Credit Limit: ₹ {selectedCustomer.creditLimit.toLocaleString()}</span>
            <span className="text-gray-700">Available Limit: ₹ {selectedCustomer.availableLimit.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Customer Type Radio Selection */}
      <div className="flex items-center gap-4 text-xs font-semibold text-gray-700 pt-1">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name="custType"
            checked={customerType === 'general'}
            onChange={() => setCustomerType('general')}
            className="text-emerald-600 focus:ring-emerald-500"
          />
          <span>General Customer</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name="custType"
            checked={customerType === 'add'}
            onChange={() => setCustomerType('add')}
            className="text-emerald-600 focus:ring-emerald-500"
          />
          <span>Add Customer</span>
        </label>
      </div>
    </div>
  );
}
