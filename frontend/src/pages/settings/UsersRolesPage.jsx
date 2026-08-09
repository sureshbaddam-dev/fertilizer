import React from 'react';
import { Users, ShieldCheck, UserPlus, Lock } from 'lucide-react';

export default function UsersRolesPage() {
  const users = [
    { id: 1, name: 'Suresh Reddy', role: 'Admin / Owner', mobile: '9848081875', status: 'Active' },
    { id: 2, name: 'Ramesh Kumar', role: 'Store Manager', mobile: '9848011223', status: 'Active' },
    { id: 3, name: 'Venkat Rao', role: 'Billing Operator', mobile: '9848022334', status: 'Active' },
  ];

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-5 font-sans text-xs">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-gray-900">Users &amp; Roles Management</h2>
          </div>
        </div>

        <button className="px-3.5 py-2 bg-[#047857] hover:bg-[#036448] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer">
          <UserPlus className="w-4 h-4" />
          <span>Add New User</span>
        </button>
      </div>

      {/* DESKTOP USER TABLE */}
      <div className="hidden md:block border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-gray-50 text-gray-600 font-extrabold uppercase text-[10px]">
            <tr>
              <th className="py-2.5 px-3">User Name</th>
              <th className="py-2.5 px-3">Role / Designation</th>
              <th className="py-2.5 px-3 font-mono">Mobile Number</th>
              <th className="py-2.5 px-3 text-center">Account Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="py-2.5 px-3 font-bold text-gray-900">{u.name}</td>
                <td className="py-2.5 px-3 font-semibold text-emerald-800">{u.role}</td>
                <td className="py-2.5 px-3 font-mono text-gray-600">{u.mobile}</td>
                <td className="py-2.5 px-3 text-center">
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-[#047857] border border-emerald-200 rounded-full font-bold text-[10px]">
                    {u.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE USER CARDS */}
      <div className="block md:hidden space-y-3">
        {users.map((u) => (
          <div key={u.id} className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-2xs space-y-2.5 font-sans">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div>
                <span className="font-extrabold text-gray-900 text-sm block">{u.name}</span>
                <span className="font-semibold text-emerald-800 text-xs block">{u.role}</span>
              </div>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-[#047857] border border-emerald-200 rounded-full font-extrabold text-[10px]">
                {u.status}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[10px] text-gray-400 font-bold uppercase font-sans">Mobile</span>
              <span className="font-bold text-gray-800">{u.mobile}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
