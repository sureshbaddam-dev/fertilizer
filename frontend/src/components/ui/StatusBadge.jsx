import React from 'react';
import { CheckCircle2, Archive } from 'lucide-react';

export default function StatusBadge({ isActive }) {
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
        <span>Active</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200/80">
      <Archive className="w-3 h-3 text-slate-500 shrink-0" />
      <span>Archived</span>
    </span>
  );
}
