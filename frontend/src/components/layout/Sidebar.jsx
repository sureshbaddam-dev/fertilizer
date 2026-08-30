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
import { useAuth } from '../../contexts/AuthContext';
import UserAvatar from '../ui/UserAvatar';
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
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { user: authUser, logout: authLogout } = useAuth();
  const currentUser = authUser || authService.getCurrentUser() || {};
  const userProfile = userProfileRes?.data || userProfileRes || {};
  const userName = userProfile.ownerName || currentUser.ownerName || settings?.ownerName || 'Store Owner';
  const userMobile = userProfile.mobile || currentUser.mobile || 'Not added';

  const rawShopName =
    userProfile?.shopName ||
    userProfile?.shopSettings?.shopName ||
    settings?.shopName ||
    currentUser?.shopName;

  const shopName = rawShopName && rawShopName.trim() ? rawShopName.trim() : 'Not added';
  const profileImage =
    userProfile.profileImage ||
    userProfile.profilePicUrl ||
    currentUser.profileImage ||
    currentUser.profilePicUrl ||
    settings?.logoUrl ||
    settings?.shopLogo ||
    '';

  const hasActiveSub = subRes?.data?.hasActiveSubscription || subRes?.hasActiveSubscription || false;

  const handleNavClick = (e, item) => {
    onCloseMobile?.();
    if (!item.isUnrestricted && !hasActiveSub) {
      e.preventDefault();
      setSubModalFeature(item.featureName || item.name);
      setIsSubModalOpen(true);
      return;
    }
  };

  const handleSignOut = async () => {
    try {
      await authLogout();
    } catch (_err) {}
    navigate('/login', { replace: true });
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
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        } flex flex-col font-sans`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 shrink-0">
          <BrandLogo isLcp={true} />
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {/* Mobile User Profile Section */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-2.5 my-1 lg:hidden">
            <UserAvatar src={profileImage} name={userName} size={36} />
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
