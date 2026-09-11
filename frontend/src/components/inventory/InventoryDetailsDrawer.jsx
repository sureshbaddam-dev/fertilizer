import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, ExternalLink } from 'lucide-react';
import ProductAvatar from '../ui/ProductAvatar';
import { Link } from 'react-router-dom';
import { productService } from '../../services/productService';

export default function InventoryDetailsDrawer({ isOpen, onClose, product }) {
  const [activeTab, setActiveTab] = useState('stockMovements'); // 'stockMovements' | 'purchaseHistory' | 'salesHistory'

  const pId = product?._id || product?.id;

  // Fetch Live Product History from MongoDB
  const { data: historyApi, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['product-history', pId],
    queryFn: () => productService.getProductHistory(pId),
    enabled: isOpen && !!pId,
    staleTime: 30 * 1000,
  });

  if (!isOpen || !product) return null;

  const historyData = historyApi?.data?.data || historyApi?.data || historyApi;

  const currentStock = Number(historyData?.currentStock ?? product.totalStock ?? product.currentStock ?? 0);
  const minStock = Number(product.minimumStockAlert ?? product.lowStockAlert ?? 10);
  const purchaseRate = Number(historyData?.latestPurchasePrice ?? product.defaultPurchaseRate ?? product.purchasePrice ?? 0);
  const unitName = product.defaultUnitId?.shortName || product.unit || 'Bag';

  const stockValue = Number(historyData?.stockValue ?? (currentStock * purchaseRate));

  const totalOpeningStock = Number(historyData?.totalOpeningStockQty ?? product.totalOpeningStockQty ?? 0);
  const totalPurchased = Number(historyData?.totalPurchasedQty ?? product.totalPurchasedQty ?? 0);
  const totalInward = Number(historyData?.totalInward ?? product.totalInward ?? (totalPurchased + totalOpeningStock));
  const totalReturned = Number(historyData?.totalSupplierReturnedQty ?? historyData?.totalReturnedQty ?? 0);
  const totalDamaged = Number(historyData?.totalDamagedQty ?? 0);
  const totalSold = Number(historyData?.totalSoldQty ?? historyData?.totalOutward ?? product.totalSoldQty ?? 0);

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
  const stockHistory = Array.isArray(historyData?.stockHistory) ? historyData.stockHistory : [];

  const companyName = product.brandId?.name || product.companyId?.name || product.company || 'N/A';
  const categoryName = product.categoryId?.name || product.category || 'Uncategorized';

  const batches = Array.isArray(historyData?.batches) ? historyData.batches : [];

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200 font-sans"
      onClick={onClose}
    >
      <div
        className="relative w-full md:w-[94vw] lg:w-[92vw] xl:max-w-4xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden"
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
          
          {/* Key Inventory Metrics Grid: 5-Metric Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-2.5">
            <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-0.5">
              <span className="text-[9px] font-bold text-emerald-800 uppercase block">Current Stock</span>
              <p className="text-sm font-extrabold font-mono text-[#047857]">
                {currentStock} <span className="text-[10px] font-medium">{unitName}</span>
              </p>
              <p className="text-[9px] text-emerald-600 truncate">Alert: {minStock} {unitName}</p>
            </div>

            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl space-y-0.5">
              <span className="text-[9px] font-bold text-gray-600 uppercase block">Stock Value</span>
              <p className="text-sm font-extrabold font-mono text-gray-900">
                ₹ {Math.round(stockValue).toLocaleString('en-IN')}
              </p>
              <p className="text-[9px] text-gray-500 truncate">@ ₹{purchaseRate}/{unitName}</p>
            </div>

            <div className="p-2.5 bg-blue-50/60 border border-blue-100 rounded-xl space-y-0.5">
              <span className="text-[9px] font-bold text-blue-800 uppercase block">Total Inward</span>
              <p className="text-sm font-extrabold font-mono text-blue-900">{totalInward} {unitName}</p>
              <p className="text-[9px] text-blue-600 truncate">
                {totalOpeningStock > 0 ? `Op: ${totalOpeningStock} • Pur: ${totalPurchased}` : (lastPurchaseDate !== 'N/A' ? `Last Pur: ${lastPurchaseDate}` : 'No Purchases')}
              </p>
            </div>

            <div className="p-2.5 bg-rose-50/60 border border-rose-100 rounded-xl space-y-0.5">
              <span className="text-[9px] font-bold text-rose-800 uppercase block">Returned</span>
              <p className="text-sm font-extrabold font-mono text-rose-900">{totalReturned} {unitName}</p>
              <p className="text-[9px] text-rose-600 truncate">To Supplier</p>
            </div>

            <div className="p-2.5 bg-amber-50/60 border border-amber-100 rounded-xl space-y-0.5">
              <span className="text-[9px] font-bold text-amber-800 uppercase block">Damaged</span>
              <p className="text-sm font-extrabold font-mono text-amber-900">{totalDamaged} {unitName}</p>
              <p className="text-[9px] text-amber-600 truncate">Write-off Loss</p>
            </div>

            <div className="p-2.5 bg-purple-50/60 border border-purple-100 rounded-xl space-y-0.5">
              <span className="text-[9px] font-bold text-purple-800 uppercase block">Sold</span>
              <p className="text-sm font-extrabold font-mono text-purple-900">{totalSold} {unitName}</p>
              <p className="text-[9px] text-purple-600 truncate">{lastSaleDate}</p>
            </div>
          </div>

          {/* History Section Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-gray-200 pt-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('batches')}
              className={`px-3 py-1.5 font-bold text-xs border-b-2 cursor-pointer transition-all whitespace-nowrap ${
                activeTab === 'batches'
                  ? 'border-[#047857] text-[#047857]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Batches ({batches.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('stockMovements')}
              className={`px-3 py-1.5 font-bold text-xs border-b-2 cursor-pointer transition-all whitespace-nowrap ${
                activeTab === 'stockMovements'
                  ? 'border-[#047857] text-[#047857]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Stock Movements ({stockHistory.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('purchaseHistory')}
              className={`px-3 py-1.5 font-bold text-xs border-b-2 cursor-pointer transition-all whitespace-nowrap ${
                activeTab === 'purchaseHistory'
                  ? 'border-[#047857] text-[#047857]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Purchases ({purchaseHistory.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('salesHistory')}
              className={`px-3 py-1.5 font-bold text-xs border-b-2 cursor-pointer transition-all whitespace-nowrap ${
                activeTab === 'salesHistory'
                  ? 'border-[#047857] text-[#047857]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Sales ({salesHistory.length})
            </button>
          </div>

          {/* Tab: Batch-wise Breakdown Table */}
          {activeTab === 'batches' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[11px] text-gray-500 font-medium">
                <span>Batch-wise Breakdown for <strong>{product.name}</strong></span>
              </div>

              {isHistoryLoading ? (
                <div className="p-6 text-center text-xs text-gray-400 animate-pulse">Loading batch details...</div>
              ) : batches.length > 0 ? (
                <div className="w-full">
                  <div className="border border-gray-200 rounded-xl overflow-x-auto shadow-2xs">
                    <table className="w-full min-w-[650px] text-left text-[11px] border-collapse">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-[10px] uppercase">
                        <tr>
                          <th className="py-2.5 px-3">Product</th>
                          <th className="py-2.5 px-3">Brand</th>
                          <th className="py-2.5 px-3">Batch Number</th>
                          <th className="py-2.5 px-3 text-right">Opening Qty</th>
                          <th className="py-2.5 px-3 text-right">Opening Rate</th>
                          <th className="py-2.5 px-3 text-right">Opening Value</th>
                          <th className="py-2.5 px-3 text-right">Current Qty</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                        {batches.map((b) => {
                          const opQty = Number(b.initialQuantity || 0);
                          const opRate = Number(b.purchaseRate || 0);
                          const opValue = Math.round(opQty * opRate);
                          const curQty = Number(b.currentStock || 0);
                          const isOp = Boolean(b.isOpeningStock);

                          return (
                            <tr key={b.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-bold text-gray-900">
                                {product.name}
                              </td>
                              <td className="py-2.5 px-3 text-gray-600">
                                {companyName !== 'N/A' ? (
                                  <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-semibold">
                                    {companyName}
                                  </span>
                                ) : '—'}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-gray-800">{b.batchNumber}</span>
                                  {isOp && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                      Opening
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold text-gray-700">
                                {opQty} {unitName}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold text-gray-700">
                                ₹ {opRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                                ₹ {opValue.toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                                {curQty} {unitName}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  curQty > 0
                                    ? 'bg-emerald-50 text-[#047857] border border-emerald-200'
                                    : 'bg-gray-100 text-gray-500 border border-gray-200'
                                }`}>
                                  {curQty > 0 ? 'Active' : 'Depleted'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-gray-50/50 border border-gray-200 rounded-xl text-center text-xs text-gray-400 font-medium">
                  No Batches Recorded for this Product
                </div>
              )}
            </div>
          )}

          {/* Tab 0: Stock Movements Table */}
          {activeTab === 'stockMovements' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[11px] text-gray-500 font-medium">
                <span>Chronological Stock Ledger Log for <strong>{product.name}</strong></span>
              </div>

              {isHistoryLoading ? (
                <div className="p-6 text-center text-xs text-gray-400 animate-pulse">Loading stock movements...</div>
              ) : stockHistory.length > 0 ? (
                <div className="w-full">
                  <div className="border border-gray-200 rounded-xl overflow-x-auto shadow-2xs">
                    <table className="w-full min-w-[500px] text-left text-[11px] border-collapse">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-[10px] uppercase">
                        <tr>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Type</th>
                          <th className="py-2 px-3">Reference / Batch</th>
                          <th className="py-2 px-3 text-right">Qty Change</th>
                          <th className="py-2 px-3 text-right">Stock After</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                        {stockHistory.map((sh) => {
                          const isOpening = sh.type === 'OPENING_STOCK';
                          const isDmg = sh.type === 'DAMAGE';
                          const isRet = sh.type === 'PURCHASE_RETURN' || sh.type === 'RETURN';
                          const isSale = sh.type === 'SALE';
                          const isPlus = Number(sh.quantity) > 0;
                          return (
                            <tr key={sh.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-mono text-gray-600 whitespace-nowrap">{sh.date}</td>
                              <td className="py-2 px-3">
                                {isOpening ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                    Opening Stock
                                  </span>
                                ) : isPlus ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Purchase
                                  </span>
                                ) : isRet ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    Supplier Return
                                  </span>
                                ) : isDmg ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    Damaged
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                    Sale
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 font-mono text-gray-700">
                                {sh.reference} {sh.batchNumber && sh.batchNumber !== 'N/A' ? `(${sh.batchNumber})` : ''}
                              </td>
                              <td className={`py-2 px-3 text-right font-mono font-bold ${isPlus ? 'text-emerald-700' : isRet ? 'text-rose-700' : isDmg ? 'text-amber-700' : 'text-purple-700'}`}>
                                {isPlus ? `+${sh.quantity}` : `${sh.quantity}`} {unitName}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">
                                {sh.stockAfter} {unitName}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-gray-50/50 border border-gray-200 rounded-xl text-center text-xs text-gray-400 font-medium">
                  No Stock Movement Records Found
                </div>
              )}
            </div>
          )}

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
