import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { WalletCards, RefreshCw } from 'lucide-react';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import PaymentDetailsModal from '../../components/PaymentDetailsModal';
import { adminApiService } from '../../services/adminApiService';

export default function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentStatusFromUrl = searchParams.get('status') || 'ALL';

  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState(currentStatusFromUrl);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setFilter(searchParams.get('status') || 'ALL');
  }, [searchParams]);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const data = await adminApiService.getPaymentsList();
      const list = data || [];

      // Filter to keep ONLY REAL ONLINE PAYMENTS
      // Exclude Admin-granted, Admin-manual, Demo, Free Demo activations
      const realOnlinePaymentsOnly = list.filter((p) => {
        const actType = (p.activationType || p.source || '').toUpperCase();
        const gateway = (p.gateway || '').toUpperCase();
        const paymentId = (p.razorpayPaymentId || p.paymentId || '').toUpperCase();

        if (['ADMIN_GRANTED', 'ADMIN_MANUAL', 'DEMO', 'FREE_DEMO', 'MANUAL'].includes(actType)) {
          return false;
        }
        if (paymentId.startsWith('ADMIN') || paymentId.startsWith('DEMO')) {
          return false;
        }
        // If razorpay payment ID or online gateway exists or status is real payment
        return Boolean(p.razorpayPaymentId || p.razorpayOrderId || gateway === 'RAZORPAY' || p.amountPaid > 0);
      });

      setPayments(realOnlinePaymentsOnly);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleFilterChange = (newFilterVal) => {
    setFilter(newFilterVal);
    if (newFilterVal === 'ALL') {
      searchParams.delete('status');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ status: newFilterVal });
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (!filter || filter === 'ALL') return true;

    const s = (p.paymentStatus || p.status || '').toUpperCase();
    if (filter === 'SUCCESSFUL') {
      return ['COMPLETED', 'SUCCESS', 'SUCCESSFUL', 'ACTIVE', 'PAID'].includes(s) || !s;
    }
    if (filter === 'FAILED') {
      return ['FAILED', 'CANCELLED', 'REFUNDED', 'REJECTED'].includes(s);
    }
    return true;
  });

  const columns = [
    {
      header: 'USER',
      key: 'userId',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block text-xs">{row.userName || row.userId?.ownerName || 'User'}</span>
          <span className="text-[10px] text-slate-500 font-mono font-bold">{row.userMobile || row.userId?.mobile || 'N/A'}</span>
        </div>
      ),
    },
    {
      header: 'PLAN',
      key: 'planName',
      render: (row) => <span className="font-bold text-emerald-700">{row.planName || 'Fertilizer ERP'}</span>,
    },
    {
      header: 'AMOUNT',
      key: 'amountPaid',
      render: (row) => (
        <span className="font-extrabold text-slate-900">
          ₹{row.amountPaid ?? row.amount ?? 0}
        </span>
      ),
    },
    {
      header: 'PAYMENT GATEWAY',
      key: 'gateway',
      render: (row) => <span className="font-semibold text-slate-700 text-xs">{row.gateway || 'Razorpay'}</span>,
    },
    {
      header: 'TRANSACTION / PAYMENT ID',
      key: 'razorpayPaymentId',
      render: (row) => <span className="font-mono text-slate-700 font-bold text-xs">{row.razorpayPaymentId || row.paymentId || 'N/A'}</span>,
    },
    {
      header: 'STATUS',
      key: 'paymentStatus',
      render: (row) => <StatusBadge status={row.paymentStatus || row.status || 'SUCCESSFUL'} />,
    },
    {
      header: 'TRANSACTION DATE',
      key: 'createdAt',
      render: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleString('en-IN') : '—'),
    },
  ];

  const filterOptions = [
    { label: 'All Transactions', value: 'ALL' },
    { label: 'Successful', value: 'SUCCESSFUL' },
    { label: 'Failed', value: 'FAILED' },
  ];

  const handleRowClick = (row) => {
    setSelectedPayment(row);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 font-sans antialiased text-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <WalletCards className="w-5 h-5 text-emerald-600" />
            <span>Payments</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Online payment transactions and payment status.</p>
        </div>
        <button
          onClick={fetchPayments}
          className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs cursor-pointer transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={filteredPayments}
        searchPlaceholder="Search payment ID, user name, mobile..."
        filterOptions={filterOptions}
        activeFilter={filter}
        onFilterChange={handleFilterChange}
        onRowClick={handleRowClick}
      />

      <PaymentDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        payment={selectedPayment}
      />
    </div>
  );
}
