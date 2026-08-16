import React, { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';

export default function PaymentSection({ subtotal, oldDue = 2450 }) {
  const [discountType, setDiscountType] = useState('Flat');
  const [discountValue, setDiscountValue] = useState(100);
  const [paymentReceived, setPaymentReceived] = useState(2000);
  const [paymentMode, setPaymentMode] = useState('Cash');

  // Calculations
  const numDiscount = Number(discountValue) || 0;
  const numPayment = Number(paymentReceived) || 0;
  const gstAmount = 114;
  const totalAmount = Math.max(0, subtotal - numDiscount + gstAmount);
  const dueAmount = Math.max(0, totalAmount - numPayment);
  const totalDueAfterBill = oldDue + dueAmount;

  const quickCashPills = [100, 500, 1000, 2000, 5000];

  return (
    <div className="space-y-3 text-xs pt-1">
      {/* 1. Discount Input Section */}
      <div className="space-y-1.5 border-t border-gray-100 pt-2.5">
        <label className="font-bold text-gray-800 block text-xs">Discount</label>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50 flex-1">
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value)}
              className="bg-transparent px-2 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none border-r border-gray-200"
            >
              <option value="Flat">Flat</option>
              <option value="Percent">%</option>
            </select>
            <input
              type="number"
              onFocus={(e) => e.target.select()}
              value={discountValue === 0 || discountValue === '0' || !discountValue ? '' : discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-1.5 text-xs font-bold text-gray-800 focus:outline-none bg-white"
            />
            {numDiscount > 0 && (
              <button onClick={() => setDiscountValue('')} className="px-2 text-red-500 hover:text-red-700">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors shrink-0">
            <Plus className="w-3.5 h-3.5" />
            <span>Add Discount</span>
          </button>
        </div>
      </div>

      {/* 2. Breakdown Totals Box */}
      <div className="bg-gray-50/70 p-3 rounded-2xl border border-gray-100 space-y-1.5">
        <div className="flex justify-between text-gray-600 font-medium text-xs">
          <span>Subtotal</span>
          <span className="font-bold text-gray-800">₹ {subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600 font-medium text-xs">
          <span>Discount</span>
          <span className="font-bold text-red-600">- ₹ {numDiscount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600 font-medium text-xs">
          <span>GST (12%)</span>
          <span className="font-bold text-gray-800">₹ {gstAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm font-extrabold text-gray-900 border-t border-gray-200/80 pt-1.5">
          <span>Total Amount</span>
          <span className="text-emerald-700 text-base">₹ {totalAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* 3. Payment Received & Quick Cash Pills */}
      <div className="space-y-2 border-t border-gray-100 pt-2">
        <h4 className="font-bold text-gray-800 text-xs">Payment</h4>
        <div className="grid grid-cols-2 gap-3 items-center">
          <div>
            <span className="text-[10px] text-gray-400 block font-normal">Bill Amount</span>
            <span className="text-sm font-extrabold text-gray-900">₹ {totalAmount.toFixed(2)}</span>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-gray-600 block">Payment Received</label>
            <input
              type="number"
              onFocus={(e) => e.target.select()}
              value={paymentReceived === 0 || paymentReceived === '0' || !paymentReceived ? '' : paymentReceived}
              onChange={(e) => setPaymentReceived(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Quick Cash Pills */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {quickCashPills.map((val) => (
            <button
              key={val}
              onClick={() => setPaymentReceived((prev) => prev + val)}
              className="px-2.5 py-1 text-[10px] font-bold text-gray-700 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 border border-gray-200 hover:border-emerald-300 rounded-lg transition-colors cursor-pointer"
            >
              +{val}
            </button>
          ))}
        </div>

        {/* Payment Mode Selection */}
        <div className="space-y-1 pt-1">
          <label className="text-[11px] font-semibold text-gray-600 block">Payment Mode</label>
          <div className="flex items-center gap-3">
            {['Cash', 'UPI', 'Card', 'Credit'].map((mode) => (
              <label key={mode} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-gray-700">
                <input
                  type="radio"
                  name="payMode"
                  checked={paymentMode === mode}
                  onChange={() => setPaymentMode(mode)}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>{mode}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Due Balance Calculation Summary (Screenshot 2 Match) */}
      <div className="bg-red-50/40 p-3 rounded-2xl border border-red-100 space-y-1.5">
        <div className="flex justify-between text-xs font-bold text-red-600">
          <span>Due Amount (Pending)</span>
          <span>₹ {dueAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[11px] text-gray-600 font-medium">
          <span>Previous Due</span>
          <span className="font-bold text-gray-800">₹ {oldDue.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs font-extrabold text-red-700 border-t border-red-100 pt-1">
          <span>Total Due After This Bill</span>
          <span>₹ {totalDueAfterBill.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
