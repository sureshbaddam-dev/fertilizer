import React from 'react';
import { X, ExternalLink, Download } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ReportDrilldownModal({ isOpen, onClose, reportType, title, subtitle, data = {} }) {
  if (!isOpen) return null;

  const handleExportCSV = () => {
    const items = data.items || [];
    if (items.length === 0) {
      alert('No data available to export.');
      return;
    }

    const headers = Object.keys(items[0] || {}).join(',');
    const rows = items.map((row) =>
      Object.values(row)
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${(title || 'report').toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 font-sans text-xs"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-gray-100 p-4 sm:p-5 space-y-4 z-50 max-h-[90vh] flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-sm font-extrabold text-gray-900 leading-tight">{title}</h2>
            <p className="text-[11px] text-gray-500 font-medium">{subtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#047857] border border-emerald-200 rounded-xl font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drilldown Content Table */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {/* DRILLDOWN TYPE 1: STOCK & STOCK VALUE */}
          {(reportType === 'TOTAL_STOCK' || reportType === 'STOCK_VALUE' || reportType === 'LOW_STOCK' || reportType === 'OUT_OF_STOCK') && (
            <div className="w-full">
              {/* DESKTOP TABLE */}
              <div className="hidden md:block border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">Brand / Company</th>
                      <th className="py-2.5 px-3 text-right">Current Stock</th>
                      <th className="py-2.5 px-3 text-right">Purchase Rate (₹)</th>
                      <th className="py-2.5 px-3 text-right">Stock Valuation (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                    {(data.items || []).map((item, idx) => {
                      const stock = Number(item.stock ?? item.currentStock ?? 0);
                      const rate = Number(item.purchaseRate ?? item.defaultPurchaseRate ?? 0);
                      const value = stock * rate;
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-gray-400 text-[10px]">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-gray-900">{item.name || item.productName}</td>
                          <td className="py-2.5 px-3 text-gray-600">{item.company || item.brand}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-[#047857]">
                            {stock} {item.unit || 'Bag'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-gray-600">₹ {rate.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">₹ {value.toLocaleString('en-IN')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS */}
              <div className="block md:hidden space-y-2.5">
                {(data.items || []).map((item, idx) => {
                  const stock = Number(item.stock ?? item.currentStock ?? 0);
                  const rate = Number(item.purchaseRate ?? item.defaultPurchaseRate ?? 0);
                  const value = stock * rate;
                  return (
                    <div key={idx} className="bg-white border border-gray-200/90 rounded-2xl p-3.5 shadow-2xs space-y-2 text-xs font-sans">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                        <span className="font-extrabold text-gray-900">{item.name || item.productName}</span>
                        <span className="font-mono font-bold text-[#047857]">{stock} {item.unit || 'Bag'}</span>
                      </div>
                      <div className="flex items-center justify-between font-mono text-gray-600 text-[11px]">
                        <span>Rate: ₹ {rate.toLocaleString('en-IN')}</span>
                        <span className="font-bold text-gray-900">Valuation: ₹ {value.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DRILLDOWN TYPE 2: TOP SELLING & SLOW SELLING PRODUCTS */}
          {(reportType === 'TOP_SELLING' || reportType === 'SLOW_SELLING') && (
            <div className="w-full">
              {/* DESKTOP TABLE */}
              <div className="hidden md:block border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Rank</th>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3 text-right">Quantity Sold</th>
                      <th className="py-2.5 px-3 text-right">Sales Amount (₹)</th>
                      <th className="py-2.5 px-3 text-right">Profit (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                    {(data.items || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-[#047857]">#{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-gray-900">{item.name || item.productName}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-700">{item.quantitySold || item.soldQty || 0} Units</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                          ₹ {Number(item.salesValue || item.salesAmount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                          ₹ {Number(item.profit || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS */}
              <div className="block md:hidden space-y-2.5">
                {(data.items || []).map((item, idx) => (
                  <div key={idx} className="bg-white border border-gray-200/90 rounded-2xl p-3.5 shadow-2xs space-y-2 text-xs font-sans">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                      <span className="font-extrabold text-gray-900">#{idx + 1} {item.name || item.productName}</span>
                      <span className="font-mono font-bold text-purple-700">{item.quantitySold || item.soldQty || 0} Units</span>
                    </div>
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="text-gray-700">Sales: ₹ {Number(item.salesValue || item.salesAmount || 0).toLocaleString('en-IN')}</span>
                      <span className="font-bold text-emerald-700">Profit: ₹ {Number(item.profit || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DRILLDOWN TYPE 3: RECEIVABLES (Customer Dues) */}
          {reportType === 'RECEIVABLES' && (
            <div className="space-y-2">
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Farmer / Customer</th>
                      <th className="py-2.5 px-3">Mobile Number</th>
                      <th className="py-2.5 px-3 text-right">Total Revenue (₹)</th>
                      <th className="py-2.5 px-3 text-right">Outstanding Due (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                    {(data.items || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-gray-900">{item.customerName || item.name}</td>
                        <td className="py-2.5 px-3 font-mono text-gray-600">{item.mobile || 'N/A'}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-gray-700">₹ {Number(item.revenue || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600">₹ {Number(item.dues || item.due || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between text-[11px] text-gray-600">
                <span>View complete customer account balances in Customer Directory</span>
                <Link to="/customers" onClick={onClose} className="text-[#047857] font-bold hover:underline inline-flex items-center gap-1">
                  <span>Go to Customers</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* DRILLDOWN TYPE 4: PAYABLES (Supplier Dues) */}
          {reportType === 'PAYABLES' && (
            <div className="space-y-2">
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Supplier Name</th>
                      <th className="py-2.5 px-3 text-right">Total Purchased (₹)</th>
                      <th className="py-2.5 px-3 text-right">Total Paid (₹)</th>
                      <th className="py-2.5 px-3 text-right">Outstanding Payable (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                    {(data.items || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-gray-900">{item.supplierName || item.name}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-gray-700">₹ {Number(item.totalPurchased || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-700">₹ {Number(item.totalPaid || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600">₹ {Number(item.balance || item.outstanding || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between text-[11px] text-gray-600">
                <span>View supplier ledgers in Suppliers Directory</span>
                <Link to="/suppliers" onClick={onClose} className="text-[#047857] font-bold hover:underline inline-flex items-center gap-1">
                  <span>Go to Suppliers</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* DRILLDOWN TYPE 5: GENERIC LIST TABLE */}
          {!['TOTAL_STOCK', 'STOCK_VALUE', 'LOW_STOCK', 'OUT_OF_STOCK', 'TOP_SELLING', 'SLOW_SELLING', 'RECEIVABLES', 'PAYABLES'].includes(reportType) && (
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-[10px] uppercase">
                  <tr>
                    {Object.keys(data.items?.[0] || { Item: '' }).map((col, idx) => (
                      <th key={idx} className="py-2.5 px-3 capitalize">
                        {col.replace(/([A-Z])/g, ' $1')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                  {(data.items || []).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50">
                      {Object.values(row).map((val, cIdx) => (
                        <td key={cIdx} className="py-2.5 px-3 font-mono">
                          {typeof val === 'number' ? val.toLocaleString('en-IN') : String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
          <span className="text-[11px] text-gray-500 font-medium">
            Business Intelligence Audit Trail • Real-time ERP Reports Engine
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded-xl cursor-pointer transition-all shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
