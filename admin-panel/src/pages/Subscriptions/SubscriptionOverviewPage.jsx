import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, RefreshCw } from 'lucide-react';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import SubscriptionsTabs from '../../components/SubscriptionsTabs';
import { adminApiService } from '../../services/adminApiService';

export default function SubscriptionOverviewPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentFilterFromUrl = searchParams.get('filter') || 'ALL';

  const [subscribers, setSubscribers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState(currentFilterFromUrl);

  useEffect(() => {
    setFilter(searchParams.get('filter') || 'ALL');
  }, [searchParams]);

  const fetchSubscribers = async () => {
    setIsLoading(true);
    try {
      const data = await adminApiService.getUsersList();
      const usersList = data?.users || data || [];

      // Filter out users who DO NOT have an active or previous subscription record
      const subscribersOnly = usersList.filter((u) => {
        const status = (u.subscriptionStatus || '').toUpperCase();
        return status && status !== 'NO_SUBSCRIPTION' && status !== 'NONE' && u.expiryDate;
      });

      setSubscribers(subscribersOnly);
    } catch (err) {
      console.error('Failed to load subscription overview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
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

  const filteredData = subscribers.filter((u) => {
    if (!filter || filter === 'ALL') return true;

    const status = (u.subscriptionStatus || '').toUpperCase();
    const actType = (u.activationType || '').toUpperCase();

    if (filter === 'ACTIVE') {
      return status === 'ACTIVE' || status === 'PAID' || status === 'DEMO';
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
      header: 'USER',
      key: 'ownerName',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block text-xs">{row.ownerName || row.userName || 'User'}</span>
          <span className="text-[10px] text-slate-500 font-mono font-bold">{row.mobile || row.userMobile || 'N/A'}</span>
        </div>
      ),
    },
    {
      header: 'PLAN',
      key: 'planName',
      render: (row) => <span className="font-bold text-emerald-700">{row.planName || 'Fertilizer ERP'}</span>,
    },
    {
      header: 'DURATION',
      key: 'durationLabel',
      render: (row) => (
        <span className="font-semibold text-slate-700 text-xs">
          {row.durationLabel || (row.subscriptionStatus === 'DEMO' ? '7 Days Demo' : '1 Month')}
        </span>
      ),
    },
    {
      header: 'START DATE',
      key: 'startDate',
      render: (row) => (row.startDate || row.createdAt ? new Date(row.startDate || row.createdAt).toLocaleDateString('en-IN') : '—'),
    },
    {
      header: 'EXPIRY DATE',
      key: 'expiryDate',
      render: (row) => (row.expiryDate ? new Date(row.expiryDate).toLocaleDateString('en-IN') : '—'),
    },
    {
      header: 'AMOUNT',
      key: 'amountPaid',
      render: (row) => (
        <span className="font-bold text-slate-900">
          ₹{row.amountPaid ?? row.amount ?? (row.subscriptionStatus === 'DEMO' ? 0 : 0)}
        </span>
      ),
    },
    {
      header: 'STATUS',
      key: 'subscriptionStatus',
      render: (row) => <StatusBadge status={row.subscriptionStatus || row.status || 'ACTIVE'} />,
    },
  ];

  const filterOptions = [
    { label: 'All', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Demo', value: 'DEMO' },
    { label: 'Paid', value: 'PAID' },
    { label: 'Expiring Soon', value: 'EXPIRING_SOON' },
    { label: 'Expired', value: 'EXPIRED' },
  ];

  return (
    <div className="space-y-6 font-sans antialiased text-slate-800">
      <SubscriptionsTabs />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <span>Subscription Overview</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Overview of current active subscribers and trial subscriptions.</p>
        </div>
        <button
          onClick={fetchSubscribers}
          className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs cursor-pointer transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        searchPlaceholder="Search user name, mobile, plan..."
        filterOptions={filterOptions}
        activeFilter={filter}
        onFilterChange={handleFilterChange}
        onRowClick={(row) => navigate(`/admin/users/${row.userId || row._id}`)}
      />
    </div>
  );
}

