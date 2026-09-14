import React from 'react';

export default function StatusBadge({ status }) {
  const norm = (status || '').toUpperCase().replace(/\s+/g, '_');

  let styles = 'bg-slate-100 text-slate-600 border-slate-200';
  let label = (status || 'N/A').replace(/_/g, ' ');

  if (['ACTIVE', 'PAID', 'SUCCESS', 'CONVERTED', 'COMPLETED'].includes(norm)) {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    label = 'Active';
  } else if (['DEMO', 'TRIAL'].includes(norm)) {
    styles = 'bg-amber-50 text-amber-700 border-amber-200';
    label = norm === 'DEMO' ? 'Demo' : 'Trial';
  } else if (['INTERESTED', 'EXPIRING_SOON', 'EXPIRING'].includes(norm)) {
    styles = 'bg-amber-50 text-amber-700 border-amber-200';
    label = norm === 'EXPIRING_SOON' ? 'Expiring Soon' : 'Trial';
  } else if (['ADMIN_GRANTED', 'RAZORPAY'].includes(norm)) {
    styles = 'bg-purple-50 text-purple-700 border-purple-200';
    label = norm === 'ADMIN_GRANTED' ? 'Admin Granted' : 'Online Paid';
  } else if (['EXPIRED', 'FAILED', 'BLOCKED', 'LOST'].includes(norm)) {
    styles = 'bg-rose-50 text-rose-700 border-rose-200';
    label = norm === 'EXPIRED' ? 'Expired' : (status || 'Expired');
  } else if (['NO_PLAN', 'NO_SUBSCRIPTION', 'NONE', 'INACTIVE'].includes(norm)) {
    styles = 'bg-slate-100 text-slate-600 border-slate-300';
    label = norm === 'NO_PLAN' || norm === 'NO_SUBSCRIPTION' || norm === 'NONE' ? 'No Plan' : 'Inactive';
  } else if (['NEW', 'CONTACTED', 'PENDING', 'IN_PROGRESS'].includes(norm)) {
    styles = 'bg-blue-50 text-blue-700 border-blue-200';
    label = norm.replace(/_/g, ' ');
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md border tracking-wide uppercase whitespace-nowrap leading-tight ${styles}`}>
      {label}
    </span>
  );
}

