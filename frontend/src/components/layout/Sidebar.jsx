import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Home,
  ShoppingCart,
  FileText,
  Package,
  Users,
  UserCheck,
  Layers,
  ShoppingBag,
  BarChart3,
  Settings,
  Bell,
  Tag,
  X,
  Truck,
  LogOut,
  HelpCircle,
} from 'lucide-react';
import ShopDiscountModal from '../settings/ShopDiscountModal';
import { dashboardService } from '../../services/dashboardService';
import { subscriptionService } from '../../services/subscriptionService';
import { authService } from '../../services/authService';
import { useSettings } from '../../contexts/SettingsContext';
import BrandLogo from '../common/BrandLogo';
import SubscriptionRequiredModal from '../common/SubscriptionRequiredModal';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: Home, isUnrestricted: true },
  { name: 'Bills / Invoices', path: '/invoices', icon: FileText, featureName: 'Billing & Invoices' },
  { name: 'Products', path: '/products', icon: Package, isUnrestricted: true },
  { name: 'Customers', path: '/customers', icon: Users, isUnrestricted: true },
  { name: 'Inventory', path: '/inventory', icon: Layers, isUnrestricted: true },
  { name: 'New Purchase', path: '/purchases/new', icon: ShoppingBag, featureName: 'Purchases' },
  { name: 'Suppliers Directory', path: '/suppliers', icon: Truck, isUnrestricted: true },
  { name: 'Reports', path: '/reports', icon: BarChart3, featureName: 'Reports' },
  { name: 'General Customers', path: '/general-customers', icon: UserCheck, isUnrestricted: true },
  { name: 'Help & Support', path: '/support', icon: HelpCircle, isUnrestricted: true },
  { name: 'Settings', path: '/settings', icon: Settings, isUnrestricted: true },
];

export default function Sidebar({ isOpen, onCloseMobile, isBillingOpen, onBlockNav }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { settings } = useSettings();
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [subModalFeature, setSubModalFeature] = useState(null);

  // Fetch Current Logged In User Profile
  const { data: userProfileRes } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authService.getProfile(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch Current Subscription Status
  const { data: subRes } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: () => subscriptionService.getMySubscription(),
    staleTime: 10 * 1000,
  });

  const currentUser = authService.getCurrentUser() || {};
  const userProfile = userProfileRes?.data || userProfileRes || {};
  const userName = userProfile.ownerName || currentUser.ownerName || settings?.ownerName || 'b.suresh';
  const userMobile = userProfile.mobile || currentUser.mobile || 'Not added';

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
  const hasActiveSub = subRes?.data?.hasActiveSubscription || subRes?.hasActiveSubscription || false;

  const handleNavClick = (e, item) => {
    onCloseMobile?.();
    if (!item.isUnrestricted && !hasActiveSub) {
      e.preventDefault();
      setSubModalFeature(item.featureName || item.name);
    }
  };

  const handleSignOut = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  };

  const { data: overviewRes } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => dashboardService.getDashboardOverview(),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const dashboardData = overviewRes?.data || overviewRes;
  const shopDiscount = dashboardData?.shopDiscount;

  const discountLabel = shopDiscount?.isEnabled
    ? shopDiscount.discountType === 'percentage'
      ? `Flat ${shopDiscount.discountValue}% OFF`
      : `Flat ₹${shopDiscount.discountValue} OFF`
    : 'Disabled';

  return (
    <>
      {/* Backdrop for tapping outside mobile sidebar drawer */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed left-0 top-0 lg:top-[var(--topbar-height)] z-50 flex h-full lg:h-[calc(100vh-var(--topbar-height))] w-[260px] shrink-0 flex-col justify-start lg:justify-between overflow-y-auto border-r border-slate-200/80 bg-white px-3 py-3 shadow-xl lg:shadow-none transition-transform duration-200 ease-in-out lg:z-30 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Section: Logo Header + Navigation Menu (Top-Aligned) */}
        <div className="flex flex-col w-full space-y-2">
          {/* Mobile Header: Logo + Close Button */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 pt-0.5 lg:hidden">
            <div className="flex items-center h-8">
              <BrandLogo className="h-full w-auto object-contain" />
            </div>
            <button
              type="button"
              onClick={onCloseMobile}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile User Profile Section */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-2.5 my-1 lg:hidden">
            {userProfilePic ? (
              <img src={userProfilePic} alt={userName} className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black flex items-center justify-center text-xs shrink-0">
                {userInitials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="block font-bold text-slate-900 text-xs truncate">{userName}</span>
              <span className="block text-[10px] text-slate-500 font-medium truncate">{shopName}</span>
              <span className="block text-[10px] text-slate-400 font-mono truncate">{userMobile}</span>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const IconComponent = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={(e) => handleNavClick(e, item)}
                  className={({ isActive }) =>
                    `sidebar-text flex min-h-[38px] items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition-all text-xs font-bold ${
                      isActive
                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 shadow-2xs'
                        : 'border border-transparent text-slate-600 hover:bg-slate-100/90 hover:text-slate-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <IconComponent className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-700' : 'text-slate-500'}`} />
                      <span>{item.name}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Bottom Section: Shop Discount & Sign Out (Visible on Mobile & Desktop) */}
        <div className="space-y-2 border-t border-slate-100 pt-3 mt-auto w-full">
          {/* Shop Discount Card (Desktop only) */}
          <div className="hidden lg:flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50 p-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Tag className="h-4 w-4 text-emerald-700 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-900 truncate">Shop Discount</span>
                <span className="text-[10px] font-semibold text-slate-500 truncate">{discountLabel}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsDiscountModalOpen(true)}
              className="inline-flex h-7 items-center rounded-xl px-2.5 text-xs font-semibold text-white btn-agri-primary cursor-pointer shrink-0"
            >
              Manage
            </button>
          </div>

          {/* Sign Out Button (Available on Mobile & Desktop inside Sidebar) */}
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <LogOut className="h-4 w-4 text-red-600" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Shop Discount Settings Modal */}
      <ShopDiscountModal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
      />

      {/* Subscription Required Modal for Protected Sidebar Features */}
      <SubscriptionRequiredModal
        isOpen={!!subModalFeature}
        onClose={() => setSubModalFeature(null)}
        featureName={subModalFeature || 'this feature'}
      />
    </>
  );
}
