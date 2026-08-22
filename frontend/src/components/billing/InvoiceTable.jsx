import React from 'react';
import { Trash2, FileText, Plus, Minus } from 'lucide-react';

export default function InvoiceTable({ items, onUpdateQty, onDeleteItem, onClearCart }) {
  return (
    <div className="space-y-2.5">
      {/* Items Table Container */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
      {/* DESKTOP INVOICE ITEMS TABLE */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-[11px] text-left">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-2 px-2 text-center align-middle w-6">#</th>
              <th className="py-2 px-2 text-left align-middle">Product</th>
              <th className="py-2 px-2 text-center align-middle w-16">Qty</th>
              <th className="py-2 px-2 text-center align-middle">Rate</th>
              <th className="py-2 px-2 text-center align-middle">Disc.</th>
              <th className="py-2 px-2 text-center align-middle">GST</th>
              <th className="py-2 px-2 text-center align-middle">Total</th>
              <th className="py-2 px-2 text-center align-middle w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
            {items.length > 0 ? (
              items.map((item, idx) => {
                const lineTotal = item.qty * item.price - (item.disc || 0);
                return (
                  <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-2 px-2 text-center align-middle font-bold text-gray-400">{idx + 1}</td>
                    <td className="py-2 px-2 text-left align-middle">
                      <span className="font-extrabold text-gray-900 block leading-tight">
                        {item.name} <span className="font-semibold text-gray-500">({item.brand})</span>
                      </span>
                      <span className="text-[9px] text-gray-400 font-medium">{item.unit}</span>
                    </td>
                    <td className="py-2 px-2 text-center align-middle">
                      <div className="flex items-center justify-center border border-gray-200 rounded-lg bg-gray-50">
                        <button
                          onClick={() => onUpdateQty(item.id, item.qty - 1)}
                          className="p-1 text-gray-500 hover:text-red-600 cursor-pointer"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="px-1.5 font-bold text-xs text-gray-900">{item.qty}</span>
                        <button
                          onClick={() => onUpdateQty(item.id, item.qty + 1)}
                          className="p-1 text-gray-500 hover:text-[#047857] cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center align-middle font-semibold">₹ {Math.round(item.price).toLocaleString('en-IN')}</td>
                    <td className="py-2 px-2 text-center align-middle font-medium text-gray-500">{item.disc || 0}</td>
                    <td className="py-2 px-2 text-center align-middle font-medium text-gray-500">{item.gstRate || 0}%</td>
                    <td className="py-2 px-2 text-center align-middle font-extrabold text-gray-900">₹ {Math.round(lineTotal).toLocaleString('en-IN')}</td>
                    <td className="py-2 px-2 text-center align-middle">
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="py-6 text-center align-middle text-gray-400 font-medium">
                  No products added yet. Click (+) on any product to add.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE INVOICE ITEMS CARDS */}
      <div className="block md:hidden space-y-2.5 p-2.5">
        {items.length > 0 ? (
          items.map((item, idx) => {
            const lineTotal = item.qty * item.price - (item.disc || 0);
            return (
              <div key={item.id} className="bg-slate-50/90 border border-gray-200/90 rounded-2xl p-3 space-y-2 font-sans text-xs">
                <div className="flex items-start justify-between border-b border-gray-200/60 pb-1.5 gap-2">
                  <div>
                    <span className="font-extrabold text-gray-900 block">{item.name}</span>
                    <span className="text-[10px] text-gray-500 font-medium block">{item.brand} • {item.unit}</span>
                  </div>

                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="text-red-500 hover:text-red-700 p-1 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <div className="flex items-center border border-gray-300 rounded-xl bg-white shadow-2xs">
                    <button
                      onClick={() => onUpdateQty(item.id, item.qty - 1)}
                      className="p-1.5 text-gray-600 hover:text-red-600 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2.5 font-extrabold text-xs text-gray-900">{item.qty}</span>
                    <button
                      onClick={() => onUpdateQty(item.id, item.qty + 1)}
                      className="p-1.5 text-gray-600 hover:text-[#047857] cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-[10px] text-gray-400 block font-sans uppercase">Total</span>
                    <span className="font-extrabold text-sm text-gray-900">₹ {Math.round(lineTotal).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-6 text-center text-gray-400 font-medium text-xs">
            No products added yet. Click (+) on any product to add.
          </div>
        )}
      </div>
      </div>

      {/* Action Buttons below table */}
      <div className="flex items-center gap-2">
        <button
          onClick={onClearCart}
          className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Cart</span>
        </button>
        <button className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors cursor-pointer">
          <FileText className="w-3.5 h-3.5 text-gray-500" />
          <span>Add Note</span>
        </button>
      </div>
    </div>
  );
}
