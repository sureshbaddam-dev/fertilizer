import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Layers, TrendingUp, ShoppingBag, ShoppingCart, Calendar, ExternalLink } from 'lucide-react';
import ProductAvatar from '../ui/ProductAvatar';
import { Link } from 'react-router-dom';
import { productService } from '../../services/productService';

export default function InventoryDetailsDrawer({ isOpen, onClose, product }) {
  const [activeTab, setActiveTab] = useState('purchaseHistory'); // 'purchaseHistory' | 'salesHistory'

  const pId = product?._id || product?.id;

  // Fetch Live Product History from MongoDB
  const { data: historyApi, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['product-history', pId],
    queryFn: () => productService.getProductHistory(pId),
    enabled: isOpen && !!pId,
    staleTime: 60 * 1000,
  });

  if (!isOpen || !product) return null;

  const historyData = historyApi?.data?.data || historyApi?.data || historyApi;

  const currentStock = Number(historyData?.currentStock ?? product.totalStock ?? product.currentStock ?? 0);
  const minStock = Number(product.minimumStockAlert ?? product.lowStockAlert ?? 10);
  const purchaseRate = Number(historyData?.latestPurchasePrice ?? product.defaultPurchaseRate ?? product.purchasePrice ?? 0);
  const unitName = product.defaultUnitId?.shortName || product.unit || 'Bag';

  const stockValue = Number(historyData?.stockValue ?? (currentStock * purchaseRate));

  const totalPurchased = Number(historyData?.totalInward ?? historyData?.totalPurchasedQty ?? product.totalPurchasedQty ?? 0);
  const totalSold = Number(historyData?.totalOutward ?? historyData?.totalSoldQty ?? product.totalSoldQty ?? 0);

  const lastPurchaseDate = historyData?.lastPurchase?.date
    ? historyData.lastPurchase.date
    : historyData?.lastPurchaseDate
    ? new Date(historyData.lastPurchaseDate).toLocaleDateString('en-IN')
    : product.lastPurchaseDate
    ? new Date(product.lastPurchaseDate).toLocaleDateString('en-IN')
    : 'N/A';

  const lastSaleDate = historyData?.lastSale?.date
    ? historyData.lastSale.date
    : historyData?.lastSaleDate
    ? new Date(historyData.lastSaleDate).toLocaleDateString('en-IN')
    : product.lastSaleDate
    ? new Date(product.lastSaleDate).toLocaleDateString('en-IN')
    : 'N/A';

  const purchaseHistory = Array.isArray(historyData?.purchaseHistory) ? historyData.purchaseHistory : [];
  const salesHistory = Array.isArray(historyData?.salesHistory) ? historyData.salesHistory : [];

  const monthlySalesQty = Number(historyData?.monthlySales?.quantity ?? historyData?.monthlySalesQty ?? 0);
  const yearlySalesQty = Number(historyData?.yearlySales?.quantity ?? historyData?.yearlySalesQty ?? 0);
  const monthlyRevenue = Number(historyData?.monthlySales?.revenue ?? historyData?.monthlyRevenue ?? 0);
  const yearlyRevenue = Number(historyData?.yearlySales?.revenue ?? historyData?.yearlyRevenue ?? 0);

  const companyName = product.brandId?.name || product.companyId?.name || product.company || 'N/A';
  const categoryName = product.categoryId?.name || product.category || 'Uncategorized';

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200 font-sans"
      onClick={onClose}
    >
      <div
        className="relative w-full md:w-[94vw] lg:w-[92vw] xl:max-w-3xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <ProductAvatar src={product.image} name={product.name} size={42} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-extrabold text-gray-900 leading-tight truncate">{product.name}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#047857] border border-emerald-200 shrink-0">
                  Inventory Details
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium truncate">
                {companyName} • {categoryName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          
          {/* Key Inventory Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-emerald-800">
                <span>Current Stock</span>
                <Layers className="w-3.5 h-3.5 text-[#047857]" />
              </div>
              <p className="text-base font-extrabold font-mono text-[#047857]">
                {currentStock} <span className="text-xs font-semibold text-emerald-700">{unitName}</span>
              </p>
              <p className="text-[10px] text-emerald-700 font-medium truncate">Min Alert: {minStock} {unitName}</p>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200/80 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-gray-600">
                <span>Stock Value</span>
                <TrendingUp className="w-3.5 h-3.5 text-gray-500" />
              </div>
              <p className="text-base font-extrabold font-mono text-gray-900">
                ₹ {stockValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-gray-500 font-medium truncate">Rate: ₹{purchaseRate}/{unitName}</p>
            </div>

            <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-blue-800">
                <span>Total Inward</span>
                <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <p className="text-base font-extrabold font-mono text-blue-900">{totalPurchased} {unitName}</p>
              <p className="text-[10px] text-blue-700 font-medium truncate">Last: {lastPurchaseDate}</p>
            </div>

            <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-purple-800">
                <span>Total Outward</span>
                <ShoppingCart className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <p className="text-base font-extrabold font-mono text-purple-900">{totalSold} {unitName}</p>
              <p className="text-[10px] text-purple-700 font-medium truncate">Last: {lastSaleDate}</p>
            </div>
          </div>

          {/* Monthly & Yearly Performance Overview Box */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-50/80 to-teal-50/60 border border-emerald-200/80 rounded-2xl space-y-2">
            <h3 className="font-extrabold text-gray-900 text-xs flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#047857]" />
              <span>Sales & Turnover Performance</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex justify-between text-[11px] font-semibold text-gray-700 mb-1">
                  <span>Monthly Sales</span>
                  <span className="font-mono text-emerald-800 font-bold">{monthlySalesQty} {unitName}</span>
                </div>
                <div className="w-full bg-emerald-200/60 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[#047857] h-1.5 rounded-full" style={{ width: `${Math.min(100, monthlySalesQty > 0 ? 65 : 0)}%` }}></div>
                </div>
                <p className="text-[10px] text-gray-500 font-mono pt-1">Revenue: ₹ {monthlyRevenue.toLocaleString('en-IN')}</p>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-semibold text-gray-700 mb-1">
                  <span>Yearly Sales</span>
                  <span className="font-mono text-emerald-800 font-bold">{yearlySalesQty} {unitName}</span>
                </div>
                <div className="w-full bg-emerald-200/60 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, yearlySalesQty > 0 ? 85 : 0)}%` }}></div>
                </div>
                <p className="text-[10px] text-gray-500 font-mono pt-1">Revenue: ₹ {yearlyRevenue.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>

          {/* History Section Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-gray-200 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('purchaseHistory')}
              className={`px-3 py-1.5 font-bold text-xs border-b-2 cursor-pointer transition-all ${
                activeTab === 'purchaseHistory'
                  ? 'border-[#047857] text-[#047857]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Purchase History ({purchaseHistory.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('salesHistory')}
              className={`px-3 py-1.5 font-bold text-xs border-b-2 cursor-pointer transition-all ${
                activeTab === 'salesHistory'
                  ? 'border-[#047857] text-[#047857]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Sales History ({salesHistory.length})
            </button>
          </div>

          {/* Tab 1: Purchase History Table */}
          {activeTab === 'purchaseHistory' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[11px] text-gray-500 font-medium">
                <span>Inward Purchase Log for <strong>{product.name}</strong></span>
              </div>

              {isHistoryLoading ? (
                <div className="p-6 text-center text-xs text-gray-400 animate-pulse">Loading purchase history...</div>
              ) : purchaseHistory.length > 0 ? (
                <div className="w-full">
                  {/* DESKTOP / TABLET TABLE */}
                  <div className="hidden md:block border border-gray-200 rounded-xl overflow-x-auto shadow-2xs">
                    <table className="w-full min-w-[500px] text-left text-[11px] border-collapse">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-[10px] uppercase">
                        <tr>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Invoice Number</th>
                          <th className="py-2 px-3 text-right">Quantity Purchased</th>
                          <th className="py-2 px-3 text-right">Purchase Rate (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                        {purchaseHistory.map((ph) => (
                          <tr key={ph.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono text-gray-600">{ph.date}</td>
                            <td className="py-2 px-3 font-mono font-bold text-gray-900">
                              {ph.invoiceNumber}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                              +{ph.quantity} {unitName}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">
                              ₹ {Number(ph.purchaseRate ?? ph.rate ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE CARDS */}
                  <div className="block md:hidden space-y-2.5">
                    {purchaseHistory.map((ph) => (
                      <div key={ph.id} className="p-3 bg-white border border-gray-200 rounded-xl space-y-1.5 text-xs font-sans">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-1">
                          <span className="font-mono font-bold text-gray-900">{ph.invoiceNumber}</span>
                          <span className="font-mono font-bold text-emerald-700">+{ph.quantity} {unitName}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-gray-600">
                          <span>{ph.date}</span>
                          <span>Rate: ₹ {Number(ph.purchaseRate ?? ph.rate ?? 0).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-gray-50/50 border border-gray-200 rounded-xl text-center text-xs text-gray-400 font-medium">
                  No Purchase History Found
                </div>
              )}

              {/* Disclaimer / Link to Supplier Ledger */}
              <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between text-[10px] text-gray-600">
                <span>Need supplier financial accounts or outstanding balance?</span>
                <Link
                  to="/suppliers"
                  onClick={onClose}
                  className="text-[#047857] font-bold hover:underline inline-flex items-center gap-1"
                >
                  <span>Go to Supplier Ledger</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}

          {/* Tab 2: Sales History Table */}
          {activeTab === 'salesHistory' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[11px] text-gray-500 font-medium">
                <span>Recent Counter Sales for <strong>{product.name}</strong></span>
              </div>

              {isHistoryLoading ? (
                <div className="p-6 text-center text-xs text-gray-400 animate-pulse">Loading sales history...</div>
              ) : salesHistory.length > 0 ? (
                <div className="w-full">
                  {/* DESKTOP / TABLET TABLE */}
                  <div className="hidden md:block border border-gray-200 rounded-xl overflow-x-auto shadow-2xs">
                    <table className="w-full min-w-[500px] text-left text-[11px] border-collapse">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-[10px] uppercase">
                        <tr>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Sales Invoice Number</th>
                          <th className="py-2 px-3 text-right">Quantity Sold</th>
                          <th className="py-2 px-3 text-right">Selling Price (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                        {salesHistory.map((sh) => (
                          <tr key={sh.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono text-gray-600">{sh.date}</td>
                            <td className="py-2 px-3 font-mono font-bold text-gray-900">{sh.invoiceNumber}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-purple-700">
                              -{sh.quantity} {unitName}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">
                              ₹ {Number(sh.sellingPrice ?? sh.price ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE CARDS */}
                  <div className="block md:hidden space-y-2.5">
                    {salesHistory.map((sh) => (
                      <div key={sh.id} className="p-3 bg-white border border-gray-200 rounded-xl space-y-1.5 text-xs font-sans">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-1">
                          <span className="font-mono font-bold text-gray-900">{sh.invoiceNumber}</span>
                          <span className="font-mono font-bold text-purple-700">-{sh.quantity} {unitName}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-gray-600">
                          <span>{sh.date}</span>
                          <span>Price: ₹ {Number(sh.sellingPrice ?? sh.price ?? 0).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-gray-50/50 border border-gray-200 rounded-xl text-center text-xs text-gray-400 font-medium">
                  No Sales History Found
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between text-xs">
          <span className="text-[11px] text-gray-500 font-medium">
            Single Source of Truth: Inventory Live Stock Monitoring
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded-xl cursor-pointer transition-all shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
