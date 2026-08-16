import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Sparkles, RefreshCw, CheckCircle2, XCircle, Eye, UserPlus } from 'lucide-react';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import SubscriptionsTabs from '../../components/SubscriptionsTabs';
import { adminApiService } from '../../services/adminApiService';

export default function DemoSubscriptionsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('PENDING'); // 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'
  const [demoRequests, setDemoRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Review / Details Modal State
  const [selectedReq, setSelectedReq] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Manual Grant Demo Modal State
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [demoDays, setDemoDays] = useState(7);
  const [grantReason, setGrantReason] = useState('Complimentary Demo Trial');

  const fetchDemos = async () => {
    setIsLoading(true);
    try {
      const [reqs, usersData] = await Promise.all([
        adminApiService.getDemoRequests(),
        adminApiService.getUsersList(),
      ]);
      setDemoRequests(reqs || []);
      setAllUsers(usersData?.users || usersData || []);
    } catch (err) {
      console.error('Failed to load demo requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDemos();
  }, []);

  const handleApprove = async (reqToApprove = selectedReq) => {
    if (!reqToApprove) return;
    setIsProcessing(true);
    setStatusMsg('');
    try {
      await adminApiService.approveDemoRequest(reqToApprove._id, adminNotes || 'Approved by Admin');
      setStatusMsg('Demo request approved and trial granted successfully!');
      setTimeout(() => {
        setSelectedReq(null);
        setStatusMsg('');
        fetchDemos();
      }, 1200);
    } catch (err) {
      setStatusMsg(err.response?.data?.message || err.message || 'Failed to approve request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (reqToReject = selectedReq) => {
    if (!reqToReject) return;
    setIsProcessing(true);
    setStatusMsg('');
    try {
      await adminApiService.rejectDemoRequest(reqToReject._id, adminNotes || 'Rejected by Admin');
      setStatusMsg('Demo request rejected.');
      setTimeout(() => {
        setSelectedReq(null);
        setStatusMsg('');
        fetchDemos();
      }, 1200);
    } catch (err) {
      setStatusMsg(err.response?.data?.message || err.message || 'Failed to reject request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualGrantDemo = async (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      alert('Please select a user to grant demo.');
      return;
    }
    setIsProcessing(true);
    try {
      await adminApiService.grantCustomDemoSubscription({
        userId: selectedUserId,
        demoDays: Number(demoDays),
        reason: grantReason,
      });
      alert('Demo subscription granted successfully!');
      setIsGrantModalOpen(false);
      setSelectedUserId('');
      fetchDemos();
    } catch (err) {
      alert('Failed to grant demo: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRequests = demoRequests.filter((r) => {
    if (filter === 'ALL') return true;
    return (r.status || '').toUpperCase() === filter;
  });

  const columns = [
    {
      header: 'USER',
      key: 'userName',
      render: (row) => (
        <div className="cursor-pointer" onClick={() => navigate(`/admin/users/${row.userId || row.user}`)}>
          <span className="font-bold text-slate-900 block text-xs hover:text-emerald-600 transition">{row.userName || 'User'}</span>
          <span className="text-[10px] text-slate-500 font-mono font-bold">{row.userMobile || 'N/A'}</span>
        </div>
      ),
    },
    {
      header: 'REQUESTED DURATION',
      key: 'requestedPlan',
      render: (row) => (
        <span className="font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 text-xs">
          {(row.requestedPlan || '7 Days Demo').replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      header: 'REQUEST DATE',
      key: 'createdAt',
      render: (row) => new Date(row.createdAt).toLocaleDateString('en-IN') + ' ' + new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
    {
      header: 'STATUS',
      key: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'ACTION',
      key: 'action',
      render: (row) => {
        if (row.status === 'PENDING') {
          return (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleApprove(row);
                }}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition cursor-pointer flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approve</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReject(row);
                }}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 transition cursor-pointer flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
            </div>
          );
        }
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedReq(row);
              setAdminNotes(row.adminNotes || row.reason || '');
            }}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Details</span>
          </button>
        );
      },
    },
  ];

  const filterOptions = [
    { label: `Pending (${demoRequests.filter((r) => r.status === 'PENDING').length})`, value: 'PENDING' },
    { label: `Approved (${demoRequests.filter((r) => r.status === 'APPROVED').length})`, value: 'APPROVED' },
    { label: `Rejected (${demoRequests.filter((r) => r.status === 'REJECTED').length})`, value: 'REJECTED' },
    { label: `All (${demoRequests.length})`, value: 'ALL' },
  ];

  return (
    <div className="space-y-6 font-sans antialiased text-slate-800">
      <SubscriptionsTabs />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <span>Demo Requests</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Review free demo requests, approve or reject applications, and grant trial access.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsGrantModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Grant Demo</span>
          </button>
          <button
            onClick={fetchDemos}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs cursor-pointer transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredRequests}
        searchPlaceholder="Search demo requests by user name, mobile..."
        filterOptions={filterOptions}
        activeFilter={filter}
        onFilterChange={(val) => setFilter(val)}
        onRowClick={(row) => {
          setSelectedReq(row);
          setAdminNotes(row.adminNotes || row.reason || '');
        }}
      />

      {/* DEMO REQUEST DETAILS / REVIEW MODAL */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-sans">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-600" />
                <span>Demo Request Details</span>
              </h3>
              <button onClick={() => setSelectedReq(null)} className="text-slate-400 hover:text-slate-600 font-bold p-1">
                ✕
              </button>
            </div>

            {statusMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl">
                {statusMsg}
              </div>
            )}

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <p><strong>User Name:</strong> {selectedReq.userName}</p>
              <p><strong>Mobile Number:</strong> <span className="font-mono font-bold text-slate-900">{selectedReq.userMobile}</span></p>
              <p><strong>Requested Duration:</strong> <span className="font-bold text-amber-800">{(selectedReq.requestedPlan || '7 Days Demo').replace(/_/g, ' ')}</span></p>
              <p><strong>Request Date:</strong> {new Date(selectedReq.createdAt).toLocaleString('en-IN')}</p>
              <p><strong>Status:</strong> <StatusBadge status={selectedReq.status} /></p>
              {selectedReq.adminNotes && <p><strong>Notes:</strong> {selectedReq.adminNotes}</p>}
            </div>

            {selectedReq.status === 'PENDING' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Admin Notes / Reason</label>
                  <textarea
                    rows={2}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="e.g. Verified user details"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    onClick={() => handleReject()}
                    disabled={isProcessing}
                    className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 transition disabled:opacity-50 cursor-pointer"
                  >
                    Reject Request
                  </button>
                  <button
                    onClick={() => handleApprove()}
                    disabled={isProcessing}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isProcessing ? 'Granting...' : 'Approve & Grant Demo'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => {
                    const uId = selectedReq.userId || selectedReq.user;
                    setSelectedReq(null);
                    if (uId) navigate(`/admin/users/${uId}`);
                  }}
                  className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Open User Profile
                </button>
                <button
                  onClick={() => setSelectedReq(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MANUAL GRANT DEMO MODAL */}
      {isGrantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-sans">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <span>+ Grant Demo to User</span>
              </h3>
              <button onClick={() => setIsGrantModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleManualGrantDemo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Select User</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs font-bold focus:outline-none focus:border-emerald-600"
                  required
                >
                  <option value="">-- Choose User --</option>
                  {allUsers.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.ownerName} ({u.mobile}) - {u.businessName || 'Store'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Demo Duration (Days)</label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {[7, 15, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDemoDays(d)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        demoDays === d
                          ? 'bg-amber-50 text-amber-800 border-amber-300 font-extrabold'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900'
                      }`}
                    >
                      {d} Days
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={demoDays}
                  onChange={(e) => setDemoDays(Number(e.target.value))}
                  placeholder="Enter custom days e.g. 7"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs font-bold focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Grant Reason / Internal Note</label>
                <input
                  type="text"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  placeholder="e.g. Sales trial offer"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGrantModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isProcessing ? 'Granting...' : 'Grant Demo Access'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

