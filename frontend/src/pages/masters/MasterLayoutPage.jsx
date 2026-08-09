import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Truck, Award, Layers, Scale, Sparkles } from 'lucide-react';

const MASTER_TABS = [
  { name: 'Suppliers', path: '/settings/masters/suppliers', icon: Truck },
  { name: 'Brands', path: '/settings/masters/brands', icon: Award },
  { name: 'Categories', path: '/settings/masters/categories', icon: Layers },
  { name: 'Units', path: '/settings/masters/units', icon: Scale },
];

export default function MasterLayoutPage() {
  return (
    <div className="space-y-4 pb-12">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-[#0A8A45] via-[#00783C] to-[#006E36] border border-[#0B7A3D] text-white p-4 rounded-xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <h1 className="text-lg md:text-xl font-semibold tracking-tight">Master Data Management</h1>
          </div>
          <p className="text-[12px] text-emerald-100/90 font-normal">
            Manage reusable Master Data for Suppliers, Brands, Categories, and Units across VEDIXA ERP.
          </p>
        </div>

        {/* Master Tabs (Suppliers, Brands, Categories, Units) */}
        <div className="flex items-center gap-1 bg-[#005C3A]/50 p-1 rounded-lg border border-[#0B7A3D] overflow-x-auto no-scrollbar">
          {MASTER_TABS.map((tab) => {
            const IconComp = tab.icon;
            return (
              <NavLink
                key={tab.name}
                to={tab.path}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-medium transition-all shrink-0 ${
                    isActive
                      ? 'bg-white text-[#006E36] shadow-2xs font-semibold'
                      : 'text-emerald-100 hover:bg-[#00783C]/60'
                  }`
                }
              >
                <IconComp className="w-3.5 h-3.5" />
                <span>{tab.name}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Tabbed Content Outlet */}
      <Outlet />
    </div>
  );
}
