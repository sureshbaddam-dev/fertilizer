import React, { useState } from 'react';
import CategoriesPage from '../masters/CategoriesPage';
import BrandsPage from '../masters/BrandsPage';
import UnitsPage from '../masters/UnitsPage';
import {
  FolderTree,
  Tag,
  Scale,
  Hash,
  Receipt,
  CreditCard,
  Wallet,
  HelpCircle,
  Plus,
  Search,
  Trash2,
  Edit,
  CheckCircle2,
} from 'lucide-react';

export default function MasterDataHubPage() {
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'brands' | 'units' | 'hsn' | 'gst' | 'payment_modes' | 'expense_categories' | 'reason_codes'

  // Local state for additional masters (HSN, GST, Payment Modes, Expense Categories, Reason Codes)
  const [hsnCodes, setHsnCodes] = useState([
    { id: '1', code: '3102', description: 'Mineral or chemical fertilizers, nitrogenous', gstRate: '5%' },
    { id: '2', code: '3105', description: 'Mineral or chemical fertilizers containing nitrogen, phosphorus and potassium', gstRate: '5%' },
    { id: '3', code: '3808', description: 'Insecticides, fungicides, herbicides & plant growth regulators', gstRate: '18%' },
    { id: '4', code: '1209', description: 'Seeds, fruit and spores, of a kind used for sowing', gstRate: '0%' },
  ]);

  const [gstRates, setGstRates] = useState([
    { id: '1', rate: '0%', type: 'Exempt', description: 'Seeds & Organic manure' },
    { id: '2', rate: '5%', type: 'Reduced', description: 'Chemical fertilizers (Urea, DAP, NPK)' },
    { id: '3', rate: '12%', type: 'Standard', description: 'Micro-nutrients & soil conditioners' },
    { id: '4', rate: '18%', type: 'Standard', description: 'Chemical pesticides, insecticides & sprayers' },
    { id: '5', rate: '28%', type: 'High', description: 'Heavy machinery & agricultural equipment' },
  ]);

  const [paymentModes, setPaymentModes] = useState([
    { id: '1', name: 'Cash', status: 'Active', isDefault: true },
    { id: '2', name: 'UPI / QR Code', status: 'Active', isDefault: false },
    { id: '3', name: 'Card / POS', status: 'Active', isDefault: false },
    { id: '4', name: 'Bank Transfer / NEFT', status: 'Active', isDefault: false },
    { id: '5', name: 'Store Credit / Due', status: 'Active', isDefault: false },
  ]);

  const [expenseCategories, setExpenseCategories] = useState([
    { id: '1', name: 'Transport & Freight', code: 'EXP-001', status: 'Active' },
    { id: '2', name: 'Shop Rent', code: 'EXP-002', status: 'Active' },
    { id: '3', name: 'Staff Salaries & Wages', code: 'EXP-003', status: 'Active' },
    { id: '4', name: 'Electricity & Utilities', code: 'EXP-004', status: 'Active' },
    { id: '5', name: 'Fuel & Maintenance', code: 'EXP-005', status: 'Active' },
  ]);

  const [reasonCodes, setReasonCodes] = useState([
    { id: '1', name: 'Stock Damage (Rats/Water)', category: 'Inventory Adjustment' },
    { id: '2', name: 'Expired Stock Return', category: 'Supplier Return' },
    { id: '3', name: 'Defective Packaging', category: 'Customer Return' },
    { id: '4', name: 'Sales Promotion Distribution', category: 'Marketing' },
  ]);

  const tabs = [
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'brands', label: 'Brands', icon: Tag },
    { id: 'units', label: 'Units', icon: Scale },
    { id: 'hsn', label: 'HSN Codes', icon: Hash },
    { id: 'gst', label: 'GST Rates', icon: Receipt },
    { id: 'payment_modes', label: 'Payment Modes', icon: CreditCard },
    { id: 'expense_categories', label: 'Expense Categories', icon: Wallet },
    { id: 'reason_codes', label: 'Reason Codes', icon: HelpCircle },
  ];

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-5 font-sans text-xs">
      
      {/* Master Data Tab Navigation Header */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-gray-200 no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap text-xs flex items-center gap-2 ${
                isActive
                  ? 'bg-[#047857]' + ' text-white shadow-2xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="pt-2">
        {activeTab === 'categories' && <CategoriesPage />}
        {activeTab === 'brands' && <BrandsPage />}
        {activeTab === 'units' && <UnitsPage />}

        {/* HSN Codes Master Manager */}
        {activeTab === 'hsn' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-gray-900">HSN Code Master Directory</h3>
                <p className="text-xs text-gray-500 font-medium">Manage Harmonized System Nomenclature (HSN) codes and default GST rates.</p>
              </div>
              <button
                type="button"
                className="px-3.5 py-2 bg-[#047857] text-white font-bold rounded-xl text-xs hover:bg-[#036448] flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add HSN Code</span>
              </button>
            </div>

            {/* DESKTOP HSN TABLE */}
            <div className="hidden md:block border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50 text-gray-600 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">HSN Code</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-center">GST Rate</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {hsnCodes.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#047857]">{item.code}</td>
                      <td className="py-2.5 px-3 text-gray-800">{item.description}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-gray-900">{item.gstRate}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-gray-400 text-xs font-medium">System Default</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE HSN CARDS */}
            <div className="block md:hidden space-y-2.5">
              {hsnCodes.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200/90 rounded-2xl p-3.5 shadow-2xs space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                    <span className="font-mono font-extrabold text-[#047857]">{item.code}</span>
                    <span className="font-mono font-bold text-gray-900">{item.gstRate}</span>
                  </div>
                  <p className="text-gray-700 font-medium">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GST Rates Master Manager */}
        {activeTab === 'gst' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-gray-900">GST Rates Master Directory</h3>
                <p className="text-xs text-gray-500 font-medium">Configured Goods &amp; Services Tax percentage rates for fertilizers, pesticides, and seeds.</p>
              </div>
            </div>

            {/* DESKTOP GST TABLE */}
            <div className="hidden md:block border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50 text-gray-600 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">GST Rate</th>
                    <th className="py-2.5 px-3">Tax Slab Type</th>
                    <th className="py-2.5 px-3">Applicability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {gstRates.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-extrabold text-emerald-700 text-sm">{item.rate}</td>
                      <td className="py-2.5 px-3 font-bold text-gray-900">{item.type}</td>
                      <td className="py-2.5 px-3 text-gray-600">{item.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE GST CARDS */}
            <div className="block md:hidden space-y-2.5">
              {gstRates.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200/90 rounded-2xl p-3.5 shadow-2xs space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                    <span className="font-mono font-extrabold text-emerald-700 text-sm">{item.rate}</span>
                    <span className="font-bold text-gray-900">{item.type}</span>
                  </div>
                  <p className="text-gray-600 font-medium">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Modes Master Manager */}
        {activeTab === 'payment_modes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-gray-900">Payment Modes Master</h3>
                <p className="text-xs text-gray-500 font-medium">Active payment methods available at billing drawer and customer ledger.</p>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50 text-gray-600 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Payment Mode Name</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Default Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {paymentModes.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-gray-900">{item.name}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 bg-emerald-50 text-[#047857] border border-emerald-200 rounded-full font-bold text-[10px]">
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-gray-700">
                        {item.isDefault ? 'Yes (Primary)' : 'No'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Expense Categories Master */}
        {activeTab === 'expense_categories' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-gray-900">Expense Categories Master</h3>
                <p className="text-xs text-gray-500 font-medium">Classify shop operational and overhead expenses.</p>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50 text-gray-600 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Category Name</th>
                    <th className="py-2.5 px-3">Category Code</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {expenseCategories.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-gray-900">{item.name}</td>
                      <td className="py-2.5 px-3 font-mono text-gray-600">{item.code}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 bg-emerald-50 text-[#047857] border border-emerald-200 rounded-full font-bold text-[10px]">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reason Codes Master */}
        {activeTab === 'reason_codes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-gray-900">Reason Codes Master</h3>
                <p className="text-xs text-gray-500 font-medium">Standard reason codes for stock damage, supplier returns, and credit notes.</p>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50 text-gray-600 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Reason Code</th>
                    <th className="py-2.5 px-3">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {reasonCodes.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-gray-900">{item.name}</td>
                      <td className="py-2.5 px-3 font-mono text-gray-600">{item.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
