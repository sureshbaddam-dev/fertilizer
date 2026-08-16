import React from 'react';

export default function StatusBadge({ status }) {
  const norm = (status || '').toUpperCase().replace(/\s+/g, '_');

  let styles = 'bg-slate-100 text-slate-600 border-slate-200';
  let label = (status || 'N/A').replace(/_/g, ' ');

  if (['ACTIVE', 'PAID', 'SUCCESS', 'CONVERTED', 'COMPLETED'].includes(norm)) {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (['DEMO', 'TRIAL', 'INTERESTED', 'EXPIRING_SOON', 'EXPIRING'].includes(norm)) {
    styles = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (['ADMIN_GRANTED', 'RAZORPAY'].includes(norm)) {
    styles = 'bg-purple-50 text-purple-700 border-purple-200';
  } else if (['EXPIRED', 'FAILED', 'BLOCKED', 'LOST'].includes(norm)) {
    styles = 'bg-red-50 text-red-700 border-red-200';
  } else if (['NO_SUBSCRIPTION', 'NONE', 'INACTIVE'].includes(norm)) {
    styles = 'bg-slate-100 text-slate-600 border-slate-300';
  } else if (['NEW', 'CONTACTED', 'PENDING', 'IN_PROGRESS'].includes(norm)) {
    styles = 'bg-blue-50 text-blue-700 border-blue-200';
  }

  return (
    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border tracking-wide uppercase whitespace-nowrap ${styles}`}>
      {label}
    </span>
  );
}
