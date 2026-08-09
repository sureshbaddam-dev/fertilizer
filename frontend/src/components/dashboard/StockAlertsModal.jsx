import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, X, AlertTriangle, Clock, AlertOctagon, PackageX } from 'lucide-react';
import { productService } from '../../services/productService';

export default function StockAlertsModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('lowStock');

  const { data: productsApi, isLoading } = useQuery({
    queryKey: ['stock-alerts-all'],
    queryFn: () => productService.getProducts({ limit: 100 }),
    enabled: isOpen,
    staleTime: 2 * 60 * 1000,
  });

  if (!isOpen) return null;

  const products = productsApi?.data?.products || [];
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const lowStockList = products.filter((p) => (p.totalStock || 0) > 0 && (p.totalStock || 0) <= (p.minimumStockAlert || 10));
  const outOfStockList = products.filter((p) => (p.totalStock || 0) === 0);
  const expiringSoonList = products.filter((p) => {
    if (!p.expiryDate) return false;
    const exp = new Date(p.expiryDate);
    return exp >= now && exp <= in30Days;
  });
  const expiredList = products.filter((p) => {
    if (!p.expiryDate) return false;
    return new Date(p.expiryDate) < now;
  });

  const getActiveList = () => {
    switch (activeTab) {
      case 'lowStock':
        return lowStockList;
      case 'expiringSoon':
        return expiringSoonList;
      case 'expired':
        return expiredList;
      case 'outOfStock':
        return outOfStockList;
      default:
        return lowStockList;
    }
  };

  const activeList = getActiveList();

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 font-sans"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 p-4 sm:p-6 space-y-4 z-50 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2 font-extrabold text-gray-900 text-sm">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#047857] flex items-center justify-center border border-emerald-100">
              <Bell className="w-4 h-4" />
            </div>
            <span>Inventory Stock Alerts</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 border-b border-gray-100 pb-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('lowStock')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'lowStock'
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock ({lowStockList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expiringSoon')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'expiringSoon'
                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Expiring Soon ({expiringSoonList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expired')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'expired'
                ? 'bg-purple-50 text-purple-800 border border-purple-200'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Expired ({expiredList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('outOfStock')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'outOfStock'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <PackageX className="w-3.5 h-3.5" />
            <span>Out of Stock ({outOfStockList.length})</span>
          </button>
        </div>

        {/* List Content */}
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-[#047857] border-t-transparent rounded-full animate-spin" />
            <span>Loading inventory alerts...</span>
          </div>
        ) : activeList.length > 0 ? (
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {activeList.map((item) => (
              <div
                key={item._id}
                className="p-3 bg-gray-50/80 border border-gray-100 rounded-xl flex items-center justify-between"
              >
                <div className="space-y-0.5 min-w-0">
                  <span className="font-extrabold text-gray-900 block text-xs truncate">{item.name}</span>
                  <span className="text-[10.5px] text-gray-500 font-medium block">
                    {item.brandId?.name || item.brand || 'General Brand'} • HSN: {item.hsnCode || 'N/A'}
                  </span>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-gray-900 block text-xs">
                    Stock: {item.totalStock || 0} {item.defaultUnitId?.name || item.unit || 'Bag'}
                  </span>
                  {item.expiryDate && (
                    <span className="text-[10px] text-gray-400 font-medium block">
                      Exp: {new Date(item.expiryDate).toLocaleDateString('en-IN')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 bg-emerald-50/50 border border-emerald-100 text-emerald-800 rounded-xl text-center font-bold italic">
            No stock alerts in this category.
          </div>
        )}
      </div>
    </div>
  );
}
