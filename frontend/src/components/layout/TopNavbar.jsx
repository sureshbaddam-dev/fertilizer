import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, CheckCheck, Menu, Plus, Search, Store, Clock, CheckCircle2, MessageSquare, Megaphone, ChevronDown, ChevronRight, User, CreditCard, LogOut } from 'lucide-react';
import BrandLogo from '../common/BrandLogo';
import ProductAvatar from '../ui/ProductAvatar';
import { productService } from '../../services/productService';
import { dashboardService } from '../../services/dashboardService';
import { authService } from '../../services/authService';
import { subscriptionService } from '../../services/subscriptionService';
import { useSettings } from '../../contexts/SettingsContext';
import SubscriptionRequiredModal from '../common/SubscriptionRequiredModal';

const NOTIF_CATEGORIES = ['All', 'Support Tickets', 'Admin Announcements'];

export default function TopNavbar({ onToggleSidebar, onOpenNewBill, onQuickAddProduct, isBillingOpen, onBlockNav }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();

  const userId = settings?.userId || settings?._id || 'user_default';
  const soundStorageKey = `vedixa_notif_sound_${userId}`;

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

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSubRequiredModalOpen, setIsSubRequiredModalOpen] = useState(false);

  const searchRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const topbarInputRef = useRef(null);
  const prevUnreadCountRef = useRef(0);

  // Fetch Current Logged In User Profile
  const { data: userProfileRes } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authService.getProfile(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch Subscription Status from Backend API
  const { data: subRes } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: () => subscriptionService.getMySubscription(),
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const currentUser = authService.getCurrentUser() || {};
  const userProfile = userProfileRes?.data || userProfileRes || {};
  const userName = userProfile.ownerName || currentUser.ownerName || settings?.ownerName || 'b.suresh';
  const userMobile = userProfile.mobile || currentUser.mobile || 'Not added';
  const userEmail = userProfile.email || currentUser.email || 'Not added';

  const rawShopName =
    userProfile?.shopName ||
    userProfile?.shopSettings?.shopName ||
    settings?.shopName ||
    currentUser?.shopName;

  const shopName = rawShopName && rawShopName.trim() ? rawShopName.trim() : 'Not added';
  const userProfilePic = userProfile.profilePicUrl || currentUser.profilePicUrl || settings?.logoUrl || settings?.shopLogo || null;

  const getInitials = (name) => {
    if (!name) return 'BS';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
  };

  const userInitials = getInitials(userName);

  const subData = subRes?.data || subRes || {};
  const hasActiveSub = subData?.hasActiveSubscription || false;
  const currentSub = subData?.subscription || null;
  const planName = currentSub?.planId?.name || currentSub?.planName || (currentSub?.planCode ? currentSub.planCode.replace(/_/g, ' ') : '3 Months');
  const expiryFormatted = currentSub?.expiryDate ? new Date(currentSub.expiryDate).toLocaleDateString('en-IN') : null;

  const handleSignOut = async () => {
    try {
      await authService.logout();
    } catch (_err) {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const handleNewBillClick = () => {
    if (!hasActiveSub) {
      setIsSubRequiredModalOpen(true);
      return;
    }
    onOpenNewBill?.();
  };

  // Web Audio Chime Helper (Plays only when Notification Sound = ON)
  const playNotifSound = () => {
    try {
      const soundPref = localStorage.getItem(soundStorageKey) || 'ON';
      if (soundPref !== 'ON') return;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // Browser autoplay restriction handled gracefully
    }
  };

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
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Product Search Query
  const { data: searchData, isLoading: isSearchLoading } = useQuery({
    queryKey: ['topbar-top-selling-products', debouncedSearch],
    queryFn: () => productService.getTopSellingProducts({ search: debouncedSearch }),
    enabled: isDropdownOpen,
    staleTime: 5000,
    refetchOnWindowFocus: false,
  });

  const searchResults = searchData?.data?.products || searchData?.products || [];

  // Live System & Support Notifications Query from Backend (Polled every 15 seconds)
  const { data: notifData } = useQuery({
    queryKey: ['dashboard-notifications'],
    queryFn: () => dashboardService.getNotifications(),
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
    refetchOnWindowFocus: true,
  });

  // Extract notifications array accurately from API response data
  const rawNotifications = notifData?.data?.notifications || notifData?.notifications || [];

  const notificationsList = rawNotifications.map((n) => ({
    ...n,
    read: n.read || readNotifIds.includes(n.id),
  }));

  const unreadNotifCount = notificationsList.filter((n) => !n.read).length;

  // Play sound when unread count increases
  useEffect(() => {
    if (unreadNotifCount > prevUnreadCountRef.current && prevUnreadCountRef.current !== 0) {
      playNotifSound();
    }
    prevUnreadCountRef.current = unreadNotifCount;
  }, [unreadNotifCount]);

  const filteredNotifications = selectedNotifCat === 'All'
    ? notificationsList
    : notificationsList.filter((n) => {
        if (selectedNotifCat === 'Support Tickets') {
          return n.category === 'Support Tickets' || n.type === 'support_ticket';
        }
        if (selectedNotifCat === 'Admin Announcements') {
          return n.category === 'Admin Announcements' || n.type === 'admin_announcement';
        }
        return n.category === selectedNotifCat;
      });

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
      <div className="h-[var(--topbar-height)] px-2.5 sm:px-4 lg:px-6">
        <div className="flex h-full items-center justify-between gap-1.5 sm:gap-3">
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

            <div className="flex items-center h-full my-auto py-1">
              <BrandLogo className="h-full w-auto object-contain my-auto max-h-none max-w-none" />
            </div>
          </div>

          {/* CENTER: Search Bar */}
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
              onClick={handleNewBillClick}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-[#047857] hover:bg-[#065f46] text-white rounded-[9px] text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>New Bill</span>
              <span className="hidden sm:inline text-[10px] opacity-80">(F2)</span>
            </button>

            {/* NOTIFICATION BELL (ALWAYS ENABLED - STRICTLY ADMIN & SUPPORT COMMUNICATIONS) */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setIsNotifOpen((prev) => !prev)}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-[9px] text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer overflow-visible"
                aria-label="View notifications"
              >
                <div className="relative inline-flex items-center justify-center">
                  <Bell className="w-[21px] h-[21px] stroke-[2]" />
                  {unreadNotifCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 z-10 min-w-[17px] h-[17px] px-1 inline-flex items-center justify-center rounded-full bg-rose-600 border border-white text-[9px] font-black text-white leading-none shadow-xs pointer-events-none whitespace-nowrap">
                      {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                    </span>
                  )}
                </div>
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
                              {notif.type === 'admin_announcement' ? (
                                <Megaphone className="w-4 h-4 text-emerald-700" />
                              ) : (
                                <MessageSquare className="w-4 h-4 text-[#047857]" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[11px] font-bold text-slate-900 truncate">
                                  {notif.title}
                                </span>
                                <span className="text-[9px] font-mono text-slate-400 shrink-0">
                                  {notif.timestamp}
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

            {/* PROFILE TRIGGER AREA & ANCHORED DROPDOWN CARD (DESKTOP ONLY) */}
            <div className="hidden lg:block relative border-l border-slate-200 pl-2" ref={profileRef}>
              <button
                type="button"
                onClick={() => setIsProfileOpen((prev) => !prev)}
                className="flex items-center gap-2 cursor-pointer focus:outline-none group py-1 px-1 rounded-full hover:bg-slate-50 transition-colors"
                aria-label="User account menu"
              >
                {userProfilePic ? (
                  <img
                    src={userProfilePic}
                    alt={userName}
                    className="h-9 w-9 rounded-full border border-slate-200 bg-white object-cover shadow-2xs group-hover:border-emerald-500 transition-colors"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black text-xs shadow-2xs">
                    {userInitials}
                  </div>
                )}
                <div className="hidden sm:flex items-center gap-1.5 text-left">
                  <span className="text-xs font-bold text-slate-900 leading-tight">
                    {userName}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180 text-emerald-600' : ''}`} />
                </div>
              </button>

              {/* PROFILE DROPDOWN CARD */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white border border-slate-200 shadow-2xl z-50 overflow-hidden font-sans p-4 space-y-3.5 animate-in fade-in duration-150">
                  {/* ACCOUNT DETAILS */}
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                        Phone Number
                      </span>
                      <span className="font-bold text-slate-800 block mt-0.5">{userMobile}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                        Email
                      </span>
                      <span className="font-bold text-slate-800 block mt-0.5 truncate">{userEmail}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                        Shop Name
                      </span>
                      <span className="font-bold text-slate-800 block mt-0.5 truncate">{shopName}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      {hasActiveSub && currentSub ? (
                        <>
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                                Subscription
                              </span>
                              <span className="font-bold text-emerald-700 inline-flex items-center gap-1.5 mt-0.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Active
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block text-right">
                                Plan
                              </span>
                              <span className="font-bold text-slate-800 block mt-0.5 text-right">{planName}</span>
                            </div>
                          </div>

                          {expiryFormatted && (
                            <div>
                              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                                Expiry Date
                              </span>
                              <span className="font-mono font-bold text-slate-700 block mt-0.5">{expiryFormatted}</span>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setIsProfileOpen(false);
                              navigate('/subscription/plans');
                            }}
                            className="w-full py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-xs transition cursor-pointer"
                          >
                            Upgrade
                          </button>
                        </>
                      ) : (
                        <>
                          <div>
                            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                              Subscription
                            </span>
                            <span className="font-bold text-rose-600 inline-flex items-center gap-1.5 mt-0.5">
                              <span className="h-2 w-2 rounded-full bg-rose-600" /> {currentSub?.status === 'EXPIRED' ? 'Subscription Expired' : 'No Active Subscription'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setIsProfileOpen(false);
                              navigate('/subscription/plans');
                            }}
                            className="w-full py-1.5 px-3 bg-[#047857] hover:bg-[#036046] text-white rounded-xl font-bold text-xs shadow-2xs transition cursor-pointer"
                          >
                            Subscription Plans
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ACTION LINKS */}
                  <div className="pt-2 border-t border-slate-100 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate('/settings/user-profile');
                      }}
                      className="w-full py-2 px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-500" /> View Profile
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full py-2 px-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <LogOut className="w-3.5 h-3.5 text-rose-500" /> Sign Out
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SUBSCRIPTION REQUIRED MODAL FOR NEW BILL / F2 BUTTON */}
        <SubscriptionRequiredModal
          isOpen={isSubRequiredModalOpen}
          onClose={() => setIsSubRequiredModalOpen(false)}
          featureName="Billing & Invoices"
        />
      </div>

      {showMobileSearch && (
        <div ref={mobileSearchRef} className="relative border-t border-slate-200/70 bg-white px-3 py-2.5 sm:px-4 sm:py-3 lg:hidden shadow-2xs">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Search products, category, or batch"
              className="app-input h-10 w-full rounded-full pl-10 pr-4 text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#047857] shadow-2xs"
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
