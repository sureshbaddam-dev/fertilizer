import React from 'react';
import { Sliders, Save } from 'lucide-react';

export default function PreferencesPage() {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-5 font-sans text-xs">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-gray-900">System Preferences &amp; Theme</h2>
          </div>
        </div>
        <button className="px-4 py-2 bg-[#047857] hover:bg-[#036448] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer">
          <Save className="w-4 h-4" />
          <span>Save Preferences</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80 space-y-3">
          <h3 className="font-extrabold text-gray-900 text-xs">Display &amp; Localization</h3>
          <div className="space-y-2">
            <div>
              <label className="font-semibold text-gray-700 block">Theme Color</label>
              <select className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-900 font-bold">
                <option>Agriculture Green Theme (Default)</option>
                <option>Emerald Modern</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-gray-700 block">System Language</label>
              <select className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-900 font-bold">
                <option>English</option>
                <option>Telugu (తెలుగు)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80 space-y-3">
          <h3 className="font-extrabold text-gray-900 text-xs">Formats &amp; Currency</h3>
          <div className="space-y-2">
            <div>
              <label className="font-semibold text-gray-700 block">Date Format</label>
              <select className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-900 font-bold">
                <option>DD/MM/YYYY (e.g. 31/07/2026)</option>
                <option>DD MMM YYYY (e.g. 31 Jul 2026)</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-gray-700 block">Currency Symbol</label>
              <input type="text" defaultValue="₹ (INR - Indian Rupee)" disabled className="w-full px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-lg font-bold text-gray-700" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
