import React from 'react';

export default function StatCard({ title, value, icon: Icon, color = 'emerald', subtitle, trend }) {
  const colorMap = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700 icon-bg-emerald-100',
    blue: 'bg-blue-50 border-blue-200 text-blue-700 icon-bg-blue-100',
    purple: 'bg-purple-50 border-purple-200 text-purple-700 icon-bg-purple-100',
    amber: 'bg-amber-50 border-amber-200 text-amber-700 icon-bg-amber-100',
    rose: 'bg-red-50 border-red-200 text-red-700 icon-bg-red-100',
    cyan: 'bg-teal-50 border-teal-200 text-teal-700 icon-bg-teal-100',
  };

  const selectedColor = colorMap[color] || colorMap.emerald;

  return (
    <div className={`p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between space-y-0 font-sans antialiased`}>
      <div>
        <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase block">{title}</span>
        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">{value}</h3>
        {subtitle && <p className="text-[11px] font-medium text-slate-500 mt-0.5">{subtitle}</p>}
        {trend && <p className="text-[10px] font-bold text-emerald-700 mt-1">{trend}</p>}
      </div>

      {Icon && (
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${selectedColor}`}>
          <Icon className="w-6 h-6" />
        </div>
      )}
    </div>
  );
}
