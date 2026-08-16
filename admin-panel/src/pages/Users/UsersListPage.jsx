import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Sparkles, Eye, ShieldAlert, RefreshCw } from 'lucide-react';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import GrantSubscriptionModal from '../../components/GrantSubscriptionModal';
import { adminApiService } from '../../services/adminApiService';

export default function UsersListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentFilterFromUrl = searchParams.get('filter') || 'ALL';

  const [usersData, setUsersData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState(currentFilterFromUrl);

  const [selectedUserForSub, setSelectedUserForSub] = useState(null);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  useEffect(() => {
    setFilter(searchParams.get('filter') || 'ALL');
  }, [searchParams]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await adminApiService.getUsersList();
      setUsersData(data?.users || data || []);
    } catch (err) {
      console.error('Failed to load users list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleFilterChange = (newFilterVal) => {
    setFilter(newFilterVal);
    if (newFilterVal === 'ALL') {
      searchParams.delete('filter');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ filter: newFilterVal });
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await adminApiService.toggleUserStatus(user._id, !user.isActive);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const filteredUsers = usersData.filter((u) => {
    if (!filter || filter === 'ALL') return true;

    const status = (u.subscriptionStatus || '').toUpperCase();
    const actType = (u.activationType || '').toUpperCase();
    const isAct = u.isActive !== false;

    if (filter === 'ACTIVE') {
      return isAct && ['ACTIVE', 'PAID', 'DEMO'].includes(status);
    }
    if (filter === 'INACTIVE') {
      return !isAct || u.status === 'INACTIVE' || u.status === 'BLOCKED';
    }
    if (filter === 'NO_SUBSCRIPTION') {
      return !status || status === 'NONE' || status === 'NO_SUBSCRIPTION' || !u.expiryDate;
    }
    if (filter === 'DEMO') {
      return status === 'DEMO' || actType === 'DEMO';
    }
    if (filter === 'PAID') {
      return status === 'PAID' || actType === 'PAID' || actType === 'RAZORPAY' || (status === 'ACTIVE' && actType !== 'DEMO');
    }
    if (filter === 'EXPIRING_SOON' || filter === 'EXPIRING') {
      return status === 'EXPIRING_SOON' || status === 'EXPIRING';
    }
    if (filter === 'EXPIRED') {
      return status === 'EXPIRED';
    }
    return true;
  });

  const columns = [
    {
      header: 'USER / OWNER',
      key: 'ownerName',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block text-xs">{row.ownerName}</span>
        </div>
      ),
    },
    {
      header: 'BUSINESS / SHOP',
      key: 'businessName',
      render: (row) => <span className="font-bold text-emerald-700">{row.businessName || 'Store Registered'}</span>,
    },
    {
      header: 'MOBILE NUMBER',
      key: 'mobile',
      render: (row) => <span className="font-mono font-bold text-slate-700">{row.mobile || 'N/A'}</span>,
    },
    {
      header: 'REGISTRATION DATE',
      key: 'createdAt',
      render: (row) => new Date(row.createdAt).toLocaleDateString('en-IN'),
    },
    {
      header: 'SUBSCRIPTION',
      key: 'subscriptionStatus',
      render: (row) => (
        <StatusBadge
          status={row.subscriptionStatus || (!row.isActive ? 'INACTIVE' : 'NO_SUBSCRIPTION')}
        />
      ),
    },
    {
      header: 'EXPIRY DATE',
      key: 'expiryDate',
      render: (row) => (row.expiryDate ? new Date(row.expiryDate).toLocaleDateString('en-IN') : 'No Plan'),
    },
    {
      header: 'PAYMENT SOURCE',
      key: 'activationType',
      render: (row) => (
        <span className="text-[10px] font-bold text-slate-500 uppercase">{row.activationType || 'N/A'}</span>
      ),
    },
    {
      header: 'ACTIONS',
      key: 'actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate(`/admin/users/${row._id}`)}
            title="View 360 User Details"
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-blue-600 rounded-lg transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setSelectedUserForSub(row);
              setIsSubModalOpen(true);
            }}
            title="Grant Admin Subscription / Demo"
            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleToggleStatus(row)}
            title={row.isActive ? 'Block User' : 'Unblock User'}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              row.isActive ? 'bg-red-50 hover:bg-red-100 text-red-600' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const filterOptions = [
    { label: 'All Users', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive / Blocked', value: 'INACTIVE' },
    { label: 'No Subscription', value: 'NO_SUBSCRIPTION' },
    { label: 'Demo', value: 'DEMO' },
    { label: 'Paid', value: 'PAID' },
    { label: 'Expiring Soon', value: 'EXPIRING_SOON' },
    { label: 'Expired', value: 'EXPIRED' },
  ];

  return (
    <div className="space-y-6 font-sans antialiased text-slate-800">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <span>User Accounts &amp; Subscribers</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Manage user profiles, admin-granted subscriptions, demos and ERP backups.</p>
        </div>
        <button
          onClick={() => fetchUsers()}
          className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs cursor-pointer transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={filteredUsers}
        searchPlaceholder="Search by owner name, mobile number, shop..."
        filterOptions={filterOptions}
        activeFilter={filter}
        onFilterChange={handleFilterChange}
      />

      <GrantSubscriptionModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        user={selectedUserForSub}
        onSuccess={() => fetchUsers()}
      />
    </div>
  );
}
