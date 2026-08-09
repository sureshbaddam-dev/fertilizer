import React from 'react';
import { X } from 'lucide-react';

export default function FormDrawer({
  isOpen,
  title,
  description,
  onClose,
  children,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden bg-slate-900/30 backdrop-blur-[3px] transition-opacity animate-in fade-in duration-200">
      <div className="flex h-full w-full flex-col justify-between overflow-y-auto border-l border-slate-200 bg-white shadow-2xl animate-in slide-in-from-right duration-300 sm:w-[30rem]">
        
        {/* Drawer Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 shadow-2xs">
          <div>
            <h2 className="card-title">{title}</h2>
            {description && <p className="helper-text">{description}</p>}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body Form */}
        <div className="flex-1 space-y-4 p-5">
          {children}
        </div>

      </div>
    </div>
  );
}
