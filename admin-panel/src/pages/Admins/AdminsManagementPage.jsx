import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, UserPlus, CheckCircle2 } from 'lucide-react';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { adminApiService } from '../../services/adminApiService';
import { formatISTDate } from '../../utils/adminDateUtils';

export default function AdminsManagementPage() {
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    ownerName: '',
    mobile: '',
    email: '',
    password: '',
    role: 'ADMIN',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const data = await adminApiService.getAdminsList();
      setAdmins(data || []);
    } catch (err) {
      console.error('Failed to load admins list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await adminApiService.createAdminUser(formData);
      setIsModalOpen(false);
      setFormData({ ownerName: '', mobile: '', email: '', password: '', role: 'ADMIN' });
      fetchAdmins();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create admin');
    } finally {
      setIsSubmitting(false);
    }
  };

  const maskMobileNumber = (mob) => {
    return mob || 'N/A';
  };

  const columns = [
    {
      header: 'Admin Name',
      key: 'ownerName',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block text-xs">{row.ownerName}</span>
          <span className="text-[10px] text-slate-400 font-mono">{row.email || 'No Email'}</span>
        </div>
      ),
    },
    { header: 'Mobile Login', key: 'mobile', render: (row) => <span className="font-mono font-bold text-slate-700">{maskMobileNumber(row.mobile)}</span> },
    { header: 'Assigned Role', key: 'role', render: (row) => <StatusBadge status={row.role || 'ADMIN'} /> },
    { header: 'Account Status', key: 'isActive', render: (row) => <StatusBadge status={row.isActive ? 'ACTIVE' : 'BLOCKED'} /> },
    { header: 'Created Date', key: 'createdAt', render: (row) => formatISTDate(row.createdAt) },
  ];

  return (
    <div className="space-y-6 font-sans antialiased text-slate-800">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Admin Users & Role-Based Authorization</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Manage admin user accounts, roles (Super Admin, Admin, Finance Admin, Support Admin) & privileges.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New Admin</span>
          </button>
          <button
            onClick={fetchAdmins}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <DataTable columns={columns} data={admins} searchPlaceholder="Search admin name, mobile, role..." />

      {/* CREATE ADMIN MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-sans">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Create New Admin User</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">{error}</div>}

            <form onSubmit={handleCreateAdmin} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Admin Full Name</label>
                <input
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assign Admin Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                >
                  <option value="SUPER_ADMIN">Super Admin (Full Access)</option>
                  <option value="ADMIN">Admin (Users, Subscriptions & Backups)</option>
                  <option value="FINANCE_ADMIN">Finance Admin (Payments & Revenue)</option>
                  <option value="SUPPORT_ADMIN">Support Admin (User Accounts & Help Desk)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Creating...' : 'Create Admin'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
