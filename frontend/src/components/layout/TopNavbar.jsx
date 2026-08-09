import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, ChevronDown, CheckCheck, Menu, Plus, Search, Store, AlertTriangle, Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import BrandLogo from '../common/BrandLogo';
import ProductAvatar from '../ui/ProductAvatar';
import { productService } from '../../services/productService';
import { dashboardService } from '../../services/dashboardService';
import { useSettings } from '../../contexts/SettingsContext';

const NOTIF_CATEGORIES = ['All', 'Low Stock', 'Expiry Alerts', 'Customer Outstanding', 'Supplier Due', 'System Alerts'];

export default function TopNavbar({ onToggleSidebar, onOpenNewBill, onQuickAddProduct }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();

  const currentPath = location.pathname;
  const showMobileSearch =
    currentPath === '/' ||
    currentPath === '/dashboard' ||
    currentPath === '/dashboard/' ||
    currentPath.startsWith('/products');

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [selectedNotifCat, setSelectedNotifCat] = useState('All');
  const [readNotifIds, setReadNotifIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('vedixa_read_notifs') || '[]');
    } catch (e) {
      return [];
    }
  });

  const searchRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const notifRef = useRef(null);
  const topbarInputRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const inDesktopSearch = searchRef.current && searchRef.current.contains(event.target);
      const inMobileSearch = mobileSearchRef.current && mobileSearchRef.current.contains(event.target);
      if (!inDesktopSearch && !inMobileSearch) {
        setIsDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Product Search Query: Fetch Top Selling Products dynamically from MongoDB
  const { data: searchData, isLoading: isSearchLoading } = useQuery({
    queryKey: ['topbar-top-selling-products', debouncedSearch],
    queryFn: () => productService.getTopSellingProducts({ search: debouncedSearch }),
    enabled: isDropdownOpen,
    staleTime: 5000,
    refetchOnWindowFocus: false,
  });

  const searchResults = searchData?.data?.products || searchData?.products || [];

  // Live Dynamic Notifications Query from Backend
  const { data: notifData } = useQuery({
    queryKey: ['dashboard-notifications'],
    queryFn: () => dashboardService.getNotifications(),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const rawNotifications = notifData?.data?.data?.notifications || [];

  // Filter unread notifications dynamically
  const notificationsList = rawNotifications.map((n) => ({
    ...n,
    read: n.read || readNotifIds.includes(n.id),
  }));

  const unreadNotifCount = notificationsList.filter((n) => !n.read).length;

  const filteredNotifications = selectedNotifCat === 'All'
    ? notificationsList
    : notificationsList.filter((n) => n.category === selectedNotifCat);

  const isSelectingRef = useRef(false);

  const handleSelectProduct = (product) => {
    isSelectingRef.current = true;
    onQuickAddProduct?.(product);
    setSearchQuery('');
    setDebouncedSearch('');
    setIsDropdownOpen(false);

    if (topbarInputRef.current) {
      topbarInputRef.current.value = '';
      topbarInputRef.current.focus();
    }

    setTimeout(() => {
      isSelectingRef.current = false;
    }, 150);
  };

  const handleMarkAsRead = (id) => {
    const nextIds = Array.from(new Set([...readNotifIds, id]));
    setReadNotifIds(nextIds);
    try {
      localStorage.setItem('vedixa_read_notifs', JSON.stringify(nextIds));
    } catch (e) {}
  };

  const handleMarkAllRead = () => {
    const allIds = notificationsList.map((n) => n.id);
    setReadNotifIds(allIds);
    try {
      localStorage.setItem('vedixa_read_notifs', JSON.stringify(allIds));
    } catch (e) {}
  };

  const handleNotifClick = (notif) => {
    handleMarkAsRead(notif.id);
    setIsNotifOpen(false);
    if (notif.path) {
      navigate(notif.path);
    }
  };

  return (
    <header className="app-topbar fixed top-0 left-0 right-0 w-full z-40 bg-white border-b border-slate-200/80 shadow-2xs font-sans">
      <div className="h-[var(--topbar-height)] px-3 sm:px-5 lg:px-6">
        <div className="flex h-full items-center justify-between gap-3">
          {/* LEFT: Mobile Menu + Large VEDIXA Logo Image */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 h-full">
            <button
              type="button"
              onClick={onToggleSidebar}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition-all hover:bg-slate-100 lg:hidden cursor-pointer"
              title="Toggle navigation"
            >
              <Menu className="h-4 w-4" />
            </button>

            {/* Vertically Centered Large VEDIXA Logo Image (95-100% Navbar Height) */}
            <div className="flex items-center h-full my-auto py-1">
              <BrandLogo className="h-full w-auto object-contain my-auto max-h-none max-w-none" />
            </div>
          </div>

          {/* CENTER: Pill Search Bar */}
          <div className="hidden min-w-0 flex-1 px-2 md:flex lg:px-6">
            <div ref={searchRef} className="relative mx-auto w-full max-w-xl">
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={topbarInputRef}
                  type="text"
                  value={searchQuery}
                  onFocus={() => {
                    if (!isSelectingRef.current) {
                      setIsDropdownOpen(true);
                    }
                  }}
                  onClick={() => {
                    if (!isSelectingRef.current) {
                      setIsDropdownOpen(true);
                    }
                  }}
                  onTouchStart={() => {
                    if (!isSelectingRef.current) {
                      setIsDropdownOpen(true);
                    }
                  }}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setIsDropdownOpen(true);
                  }}
                  placeholder="Search products, brands, categories, or batches"
                  className="h-10 w-full rounded-full border border-slate-200 bg-slate-50/70 pl-10 pr-10 text-xs font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#047857] focus:outline-none focus:ring-2 focus:ring-[#047857]/15 transition-all shadow-2xs"
                />
                <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] font-bold text-slate-400">
                  /
                </div>
              </div>

              {isDropdownOpen && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
                  {isSearchLoading ? (
                    <div className="flex items-center justify-center gap-2 px-4 py-5 text-xs font-semibold text-slate-500">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
                      <span>Searching products...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                      {searchResults.map((product) => {
                        const companyName = product.brandId?.name || product.companyId?.name || 'Brand';
                        const unitName = product.defaultUnitId?.name || product.unitId?.name || '';
                        const priceVal = Number(product.defaultSellingPrice || product.sellingPrice || 0);
                        const stockVal = Number(product.totalStock || product.currentStock || 0);

                        return (
                          <button
                            key={product._id}
                            type="button"
                            onClick={() => handleSelectProduct(product)}
                            className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-emerald-50/70 cursor-pointer"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <ProductAvatar src={product.image} name={product.name} size={36} />
                              <div className="min-w-0">
                                <span className="block truncate text-xs font-bold text-slate-900">{product.name}</span>
                                <span className="block truncate text-[11px] font-medium text-slate-500">
                                  {companyName} {unitName ? `• ${unitName}` : ''}
                                </span>
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <span className="block font-mono text-xs font-bold text-emerald-700">
                                ₹ {priceVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="block text-[10px] text-slate-400 font-medium">Stock: {stockVal} {unitName}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-4 py-5 text-center text-xs font-semibold text-slate-400">
                      No matching products found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onOpenNewBill}
              className="inline-flex items-center gap-1.5 h-9 px-3 bg-[#047857] hover:bg-[#065f46] text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>New Bill</span>
              <span className="hidden sm:inline text-[10px] opacity-80">(F2)</span>
            </button>

            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setIsNotifOpen((prev) => !prev)}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                aria-label="View notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-extrabold text-white animate-pulse">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-2xl z-50 overflow-hidden font-sans">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#047857]" />
                      <h3 className="text-xs font-extrabold text-slate-900">Notifications</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800">
                        {unreadNotifCount} New
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[10px] font-bold text-[#047857] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck className="w-3 h-3" />
                      <span>Mark All Read</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1 p-2 bg-slate-100/70 border-b border-slate-200 overflow-x-auto text-[10px] font-bold text-slate-600">
                    {NOTIF_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedNotifCat(cat)}
                        className={`px-2 py-1 rounded-lg shrink-0 transition-colors cursor-pointer ${
                          selectedNotifCat === cat
                            ? 'bg-white text-[#047857] shadow-2xs font-extrabold'
                            : 'hover:bg-slate-200/60'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {filteredNotifications.length > 0 ? (
                      filteredNotifications.map((notif) => {
                        const isRead = readNotifIds.includes(notif.id);
                        return (
                          <div
                            key={notif.id}
                            onClick={() => handleNotifClick(notif)}
                            className={`p-3 transition-colors cursor-pointer flex items-start gap-2.5 ${
                              isRead ? 'bg-white opacity-70' : 'bg-emerald-50/30 hover:bg-emerald-50/70'
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {notif.type === 'OUT_OF_STOCK' ? (
                                <ShieldAlert className="w-4 h-4 text-rose-600" />
                              ) : notif.type === 'LOW_STOCK' ? (
                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                              ) : notif.type === 'CUSTOMER_DUE' ? (
                                <Clock className="w-4 h-4 text-purple-600" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[11px] font-bold text-slate-900 truncate">
                                  {notif.title}
                                </span>
                                <span className="text-[9px] font-mono text-slate-400 shrink-0">
                                  {notif.time}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-600 leading-tight mt-0.5 font-medium">
                                {notif.message}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-400 font-medium">
                        No notifications in this category
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              {settings?.logoUrl || settings?.shopLogo ? (
                <img
                  src={settings?.logoUrl || settings?.shopLogo}
                  alt={settings?.shopName || 'Shop Owner'}
                  className="h-9 w-9 rounded-xl border border-slate-200 bg-white object-contain p-0.5 shadow-2xs"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 border border-slate-200/80 font-extrabold text-xs">
                  <Store className="h-4 w-4 text-slate-600" />
                </div>
              )}
              <div className="hidden sm:block text-left">
                <span className="block text-xs font-extrabold text-slate-900 leading-tight">
                  {settings?.ownerName || 'BSREDDY'}
                </span>
                <span className="block text-[10px] font-semibold text-slate-500 leading-tight mt-0.5">
                  {settings?.userRole || 'Shop Owner'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showMobileSearch && (
        <div ref={mobileSearchRef} className="relative border-t border-slate-200/70 bg-white/80 px-4 py-3 lg:hidden">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Search products, category, or batch"
              className="app-input h-11 w-full rounded-full pl-11 pr-4"
            />
          </div>

          {isDropdownOpen && (
            <div className="absolute left-4 right-4 top-full z-50 mt-1 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
              {isSearchLoading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-5 text-xs font-semibold text-slate-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
                  <span>Searching products...</span>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {searchResults.map((product) => {
                    const companyName = product.brandId?.name || product.companyId?.name || 'Brand';
                    const unitName = product.defaultUnitId?.name || product.unitId?.name || '';
                    const priceVal = Number(product.defaultSellingPrice || product.sellingPrice || 0);
                    const stockVal = Number(product.totalStock || product.currentStock || 0);

                    return (
                      <button
                        key={product._id}
                        type="button"
                        onClick={() => handleSelectProduct(product)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-emerald-50/70 cursor-pointer"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <ProductAvatar src={product.image} name={product.name} size={36} />
                          <div className="min-w-0">
                            <span className="block truncate text-xs font-bold text-slate-900">{product.name}</span>
                            <span className="block truncate text-[11px] font-medium text-slate-500">
                              {companyName} {unitName ? `• ${unitName}` : ''}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span className="block font-mono text-xs font-bold text-emerald-700">
                            ₹ {priceVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-medium">Stock: {stockVal} {unitName}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-5 text-center text-xs font-semibold text-slate-400">
                  No matching products found
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
