import React, { useState, useEffect } from 'react';
import {
  Database,
  Plus,
  RefreshCw,
  Eye,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HardDrive,
  Layers,
  X,
  Server,
  Activity,
  RotateCcw,
  UserCheck,
  LifeBuoy,
  ShieldCheck,
  ArrowRight,
  Check,
  Search,
  Copy,
  Fingerprint,
} from 'lucide-react';
import { adminApiService } from '../../services/adminApiService';
import StatusBadge from '../../components/StatusBadge';
import DataTable from '../../components/DataTable';

// Robust Normalization Helper: Extracts a plain Array safely from any API response structure
const normalizeArrayData = (res, preferredKey = null) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (preferredKey && Array.isArray(res[preferredKey])) return res[preferredKey];
  if (preferredKey && res.data && Array.isArray(res.data[preferredKey])) return res.data[preferredKey];
  if (Array.isArray(res.users)) return res.users;
  if (Array.isArray(res.backups)) return res.backups;
  if (Array.isArray(res.history)) return res.history;
  if (Array.isArray(res.items)) return res.items;
  return [];
};

export default function BackupsPage() {
  const [activeTab, setActiveTab] = useState('backups'); // 'backups' | 'restore-history'
  const [overview, setOverview] = useState(null);
  const [backups, setBackups] = useState([]);
  const [restoreHistory, setRestoreHistory] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Create Backup Confirmation Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createSuccessMsg, setCreateSuccessMsg] = useState('');
  const [createErrorMsg, setCreateErrorMsg] = useState('');

  // View Details Modal State
  const [selectedBackupDetails, setSelectedBackupDetails] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Strict Delete Backup Modal State
  const [selectedBackupToDelete, setSelectedBackupToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // CLEAN REFINED RESTORE MODAL STATE
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState(null);
  const [restoreStep, setRestoreStep] = useState(1); // 1: Form & Comparison, 2: Executing, 3: Summary Result
  const [targetUserId, setTargetUserId] = useState(null); // null until admin selects a user
  const [selectedUserObj, setSelectedUserObj] = useState(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [userSearchError, setUserSearchError] = useState('');
  const [copiedUserId, setCopiedUserId] = useState(false);

  const [ticketIdInput, setTicketIdInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [restoreAnalysis, setRestoreAnalysis] = useState(null);
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [isExecutingRestore, setIsExecutingRestore] = useState(false);
  const [restoreResult, setRestoreResult] = useState(null);

  const fetchBackupsData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [overviewData, historyData, restoreData, usersData] = await Promise.all([
        adminApiService.getBackupOverview().catch(() => null),
        adminApiService.getBackupHistory().catch(() => []),
        adminApiService.getRestoreHistory().catch(() => []),
        adminApiService.getUsersList({ limit: 10 }).catch(() => []),
      ]);

      const safeOverview = overviewData?.data || overviewData || null;
      setOverview(safeOverview);

      const safeBackups = normalizeArrayData(historyData, 'backups');
      setBackups(safeBackups);

      const safeRestoreHistory = normalizeArrayData(restoreData, 'history');
      setRestoreHistory(safeRestoreHistory);

      const safeUsersList = normalizeArrayData(usersData, 'users');
      setUsersList(safeUsersList);
    } catch (err) {
      console.error('Failed to load backup data:', err);
      setBackups([]);
      setRestoreHistory([]);
      setUsersList([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBackupsData(true);
  }, []);

  const handleSearchUsers = async (query) => {
    setUserSearchQuery(query);
    setUserSearchError('');
    if (!query || query.trim() === '') {
      setUserSearchResults([]);
      return;
    }
    setIsSearchingUsers(true);
    try {
      const rawRes = await adminApiService.getUsersList({ search: query.trim(), limit: 6 });
      const safeUsers = normalizeArrayData(rawRes, 'users');
      setUserSearchResults(safeUsers);
    } catch (err) {
      console.error('User search failed:', err);
      setUserSearchError('Unable to search users. Please try again.');
      setUserSearchResults([]);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleStartBackup = async () => {
    setIsCreating(true);
    setCreateErrorMsg('');
    setCreateSuccessMsg('');

    try {
      const rawMetadata = await adminApiService.createDatabaseBackup();
      const metadata = rawMetadata?.data || rawMetadata || {};
      setCreateSuccessMsg(`Backup ${metadata.backupId || 'Snapshot'} created successfully in Backup MongoDB Atlas (${metadata.sizeFormatted || '0 KB'})!`);
      setIsCreateModalOpen(false);
      fetchBackupsData(false);
    } catch (err) {
      setCreateErrorMsg(err.response?.data?.message || err.message || 'Failed to create database backup');
    } finally {
      setIsCreating(false);
    }
  };

  const handleViewDetails = async (backup) => {
    try {
      const rawDetails = await adminApiService.getBackupDetails(backup.backupId);
      const details = rawDetails?.data || rawDetails || null;
      setSelectedBackupDetails(details);
      setIsDetailsModalOpen(true);
    } catch (err) {
      alert('Failed to load backup details: ' + err.message);
    }
  };

  const handleDownloadPayload = async (backup) => {
    try {
      await adminApiService.downloadBackup(backup.backupId, `${backup.backupId}_FULL_SNAPSHOT.json`);
    } catch (err) {
      alert('Failed to download backup snapshot: ' + err.message);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setIsDeleting(true);

    try {
      await adminApiService.deleteBackup(selectedBackupToDelete.backupId, 'DELETE');
      setSelectedBackupToDelete(null);
      setDeleteConfirmText('');
      fetchBackupsData(false);
    } catch (err) {
      alert('Failed to delete backup: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // RESTORE MODAL HANDLERS
  const openRestoreWizard = (backup) => {
    setSelectedBackupForRestore(backup);
    setRestoreStep(1);
    setTargetUserId(null); // Default state: NO USER SELECTED
    setSelectedUserObj(null);
    setUserSearchQuery('');
    setUserSearchResults([]);
    setUserSearchError('');
    setTicketIdInput('');
    setRestoreAnalysis(null);
    setSelectedCollections([]);
    setRestoreResult(null);
    setIsAnalyzing(false);
    setIsExecutingRestore(false);
  };

  const handleSelectUser = (userDoc) => {
    const uId = userDoc ? userDoc._id : 'ALL';
    setTargetUserId(uId);
    setSelectedUserObj(userDoc);
    setUserSearchQuery('');
    setUserSearchResults([]);
    setUserSearchError('');
    setRestoreAnalysis(null);

    // Trigger backend comparison immediately after user is selected
    runAnalysisForUser(uId, userDoc);
  };

  const handleClearUser = () => {
    setTargetUserId(null);
    setSelectedUserObj(null);
    setUserSearchQuery('');
    setUserSearchResults([]);
    setUserSearchError('');
    setRestoreAnalysis(null);
  };

  const runAnalysisForUser = async (uId, userDoc) => {
    if (!selectedBackupForRestore || !uId) return;
    setIsAnalyzing(true);

    try {
      const rawAnalysis = await adminApiService.analyzeRestore(selectedBackupForRestore.backupId, uId);
      const analysis = rawAnalysis?.data || rawAnalysis || null;
      setRestoreAnalysis(analysis);

      // Default select collections that have missing records
      const collectionSummaries = normalizeArrayData(analysis?.collectionSummaries);
      const missingCols = collectionSummaries
        .filter((c) => c && c.missingCount > 0)
        .map((c) => c.collectionName);
      setSelectedCollections(missingCols);
    } catch (err) {
      alert('Restore comparison failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExecuteRestoreSubmit = async () => {
    if (!selectedBackupForRestore || !targetUserId || !selectedUserObj) return;
    setIsExecutingRestore(true);
    setRestoreStep(2);

    try {
      const rawResult = await adminApiService.executeRestore(selectedBackupForRestore.backupId, {
        targetUserId,
        selectedCollections,
        confirmationText: 'RESTORE',
        ticketId: ticketIdInput,
      });

      const result = rawResult?.data || rawResult || null;
      setRestoreResult(result);
      setRestoreStep(3);
      fetchBackupsData(false);
    } catch (err) {
      alert('Restore execution failed: ' + (err.response?.data?.message || err.message));
      setRestoreStep(1);
    } finally {
      setIsExecutingRestore(false);
    }
  };

  const columns = [
    {
      header: 'BACKUP ID',
      key: 'backupId',
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-slate-900 block">{row.backupId}</span>
          <span className="text-[10px] text-slate-400 font-medium">{row.sourceDatabase || 'MAIN'} → {row.destinationDatabase || 'BACKUP'}</span>
        </div>
      ),
    },
    {
      header: 'CREATED DATE',
      key: 'createdAt',
      render: (row) => (
        <span className="font-mono text-slate-700 text-xs font-semibold">
          {new Date(row.createdAt).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </span>
      ),
    },
    {
      header: 'CREATED BY',
      key: 'createdByAdminName',
      render: (row) => (
        <span className="font-bold text-slate-800 text-xs">{row.createdByAdminName || 'System Admin'}</span>
      ),
    },
    {
      header: 'SIZE',
      key: 'sizeFormatted',
      render: (row) => (
        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          {row.sizeFormatted || '0 KB'}
        </span>
      ),
    },
    {
      header: 'RECORDS',
      key: 'totalRecordsCount',
      render: (row) => (
        <span className="font-extrabold text-slate-900 text-xs">{(row.totalRecordsCount || 0).toLocaleString('en-IN')} docs</span>
      ),
    },
    {
      header: 'STATUS',
      key: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'ACTIONS',
      key: 'actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleViewDetails(row)}
            title="View Backup Snapshot Details"
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-blue-600 rounded-lg transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          {row.status === 'COMPLETED' && (
            <button
              onClick={() => openRestoreWizard(row)}
              title="Restore Missing Records Only"
              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold px-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore</span>
            </button>
          )}
          <button
            onClick={() => handleDownloadPayload(row)}
            title="Download JSON Snapshot Payload"
            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setSelectedBackupToDelete(row);
              setDeleteConfirmText('');
            }}
            title="Delete Backup Snapshot"
            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const restoreHistoryColumns = [
    {
      header: 'RESTORE ID',
      key: 'restoreId',
      render: (row) => (
        <span className="font-mono font-bold text-slate-900 block">{row.restoreId}</span>
      ),
    },
    {
      header: 'SOURCE BACKUP',
      key: 'sourceBackupId',
      render: (row) => (
        <span className="font-mono text-slate-600 text-xs font-semibold">{row.sourceBackupId}</span>
      ),
    },
    {
      header: 'SAFETY BACKUP',
      key: 'safetyBackupId',
      render: (row) => (
        <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
          {row.safetyBackupId || 'PRE_RESTORE'}
        </span>
      ),
    },
    {
      header: 'TARGET USER & USER ID',
      key: 'targetUserName',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 text-xs block">{row.targetUserName}</span>
          {row.targetUserId && row.targetUserId !== 'ALL' && (
            <span className="text-[10px] font-mono text-blue-700 font-bold block">User ID: {row.targetUserId}</span>
          )}
          {row.ticketId && (
            <span className="text-[10px] text-purple-700 font-bold">Ticket #{row.ticketId}</span>
          )}
        </div>
      ),
    },
    {
      header: 'RESTORED',
      key: 'summary',
      render: (row) => (
        <span className="font-black text-emerald-800 text-xs font-mono">
          {row.summary?.totalRestored || 0} docs
        </span>
      ),
    },
    {
      header: 'SKIPPED',
      key: 'summarySkipped',
      render: (row) => (
        <span className="font-bold text-slate-500 text-xs font-mono">
          {row.summary?.totalSkipped || 0} docs
        </span>
      ),
    },
    {
      header: 'STATUS',
      key: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'DATE',
      key: 'createdAt',
      render: (row) => (
        <span className="font-mono text-slate-500 text-xs">
          {new Date(row.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
        </span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400 font-medium font-sans">
        <Activity className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
        <p className="text-xs">Connecting to Backup MongoDB Atlas &amp; loading records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans antialiased text-slate-800">
      {/* SUCCESS / ERROR TOAST MESSAGES */}
      {createSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-2xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{createSuccessMsg}</span>
          </div>
          <button onClick={() => setCreateSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {createErrorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold rounded-2xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{createErrorMsg}</span>
          </div>
          <button onClick={() => setCreateErrorMsg('')} className="text-rose-700 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. PAGE HEADER WITH TABS & CREATE BACKUP ACTION */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            <span>Backups &amp; Recovery Console</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manual database snapshots &amp; safe missing-records-only restore engine.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* TABS */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('backups')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                activeTab === 'backups' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Backups History ({Array.isArray(backups) ? backups.length : 0})
            </button>
            <button
              onClick={() => setActiveTab('restore-history')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                activeTab === 'restore-history' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Restore Logs ({Array.isArray(restoreHistory) ? restoreHistory.length : 0})
            </button>
          </div>

          <button
            onClick={() => fetchBackupsData(false)}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            disabled={overview?.isBackupRunning}
            onClick={() => setIsCreateModalOpen(true)}
            className={`px-4 py-2.5 font-bold text-xs rounded-xl shadow-2xs flex items-center gap-2 transition cursor-pointer ${
              overview?.isBackupRunning
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{overview?.isBackupRunning ? 'Backup currently in progress...' : 'Create Backup'}</span>
          </button>
        </div>
      </div>

      {/* 2. COMPACT KPI OVERVIEW ROW (4 CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Last Backup</span>
          <div className="flex items-center gap-1.5 pt-0.5">
            <Clock className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-sm font-extrabold text-slate-900">
              {overview?.lastBackupTime
                ? new Date(overview.lastBackupTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                : 'No backups yet'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium block">Timestamp of latest snapshot</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Backup Status</span>
          <div className="pt-0.5">
            <StatusBadge status={overview?.lastBackupStatus || 'NO_BACKUPS'} />
          </div>
          <span className="text-[10px] text-slate-400 font-medium block">Health of latest operation</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Backups</span>
          <div className="flex items-baseline justify-between pt-0.5">
            <span className="text-2xl font-black text-slate-900">{overview?.totalBackups || 0}</span>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
              Atlas Store
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium block">Historical database snapshots</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Latest Size</span>
          <div className="flex items-baseline justify-between pt-0.5">
            <span className="text-2xl font-black text-emerald-700 font-mono">{overview?.latestBackupSize || '0 KB'}</span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              Full Snapshot
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium block">Compressed JSON payload size</span>
        </div>
      </div>

      {/* TAB CONTENT 1: BACKUPS HISTORY */}
      {activeTab === 'backups' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Database Backup History</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Historical database snapshots stored in Backup MongoDB Atlas.
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-700">
              <Server className="w-3.5 h-3.5 text-blue-600" />
              <span>Separate Atlas Environment Connected</span>
            </div>
          </div>

          <DataTable columns={columns} data={Array.isArray(backups) ? backups : []} searchPlaceholder="Search backup ID, date, status, admin..." />
        </div>
      )}

      {/* TAB CONTENT 2: RESTORE LOGS */}
      {activeTab === 'restore-history' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Restore Audit Logs</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Audit history of all missing-records-only restore operations executed by administrators.
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-bold text-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Zero Overwrite Guarantee Active</span>
            </div>
          </div>

          <DataTable columns={restoreHistoryColumns} data={Array.isArray(restoreHistory) ? restoreHistory : []} searchPlaceholder="Search restore ID, user, ticket, backup..." />
        </div>
      )}

      {/* MODAL 1: CREATE BACKUP CONFIRMATION */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">Create Database Backup</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 space-y-2">
              <p className="font-bold">Database Snapshot Architecture Notice:</p>
              <p className="text-blue-800 font-medium leading-relaxed">
                This operation will take a complete read-only snapshot of the current <strong>MAIN VEDIXA ERP</strong> database and store it safely into the separate <strong>BACKUP MongoDB Atlas</strong> database.
              </p>
            </div>

            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Source Database:</span>
                <span className="font-mono font-bold text-slate-900">MAIN (Live Production ERP)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Destination Cluster:</span>
                <span className="font-mono font-bold text-emerald-700">BACKUP (Atlas Snapshot Store)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Operation Impact:</span>
                <span className="font-bold text-emerald-800">100% READ-ONLY on Main DB</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                disabled={isCreating}
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isCreating}
                onClick={handleStartBackup}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-2 transition cursor-pointer"
              >
                {isCreating ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>Creating Backup Snapshot...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    <span>Confirm &amp; Create Backup</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: VIEW BACKUP DETAILS DRAWER */}
      {isDetailsModalOpen && selectedBackupDetails && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto font-sans antialiased text-slate-800 border-l border-slate-200 animate-in slide-in-from-right duration-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 font-mono">{selectedBackupDetails.backupId}</h2>
                  <p className="text-xs text-slate-500 font-medium">Backup Metadata &amp; Collection Breakdown</p>
                </div>
              </div>
              <button onClick={() => setIsDetailsModalOpen(false)} className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Created Date</span>
                  <span className="text-xs font-mono font-bold text-slate-900 block">
                    {new Date(selectedBackupDetails.createdAt).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Created By</span>
                  <span className="text-xs font-bold text-slate-900 block">{selectedBackupDetails.createdByAdminName || 'System Admin'}</span>
                </div>
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Snapshot Size</span>
                  <span className="text-sm font-mono font-black text-emerald-900 block">{selectedBackupDetails.sizeFormatted}</span>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">Total Records</span>
                  <span className="text-sm font-mono font-black text-blue-900 block">{(selectedBackupDetails.totalRecordsCount || 0).toLocaleString('en-IN')} docs</span>
                </div>
              </div>

              {/* COLLECTION BREAKDOWN */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                  <span>Backed Up ERP Collections ({Array.isArray(selectedBackupDetails.collectionStats) ? selectedBackupDetails.collectionStats.length : 0})</span>
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                </h3>

                <div className="space-y-2">
                  {Array.isArray(selectedBackupDetails.collectionStats) &&
                    selectedBackupDetails.collectionStats.map((col, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                        <span className="font-mono font-bold text-slate-900">{col.collectionName}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{col.recordCount} docs</span>
                          <span className="text-[10px] font-mono text-slate-400">{formatBytes(col.sizeBytes)}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => handleDownloadPayload(selectedBackupDetails)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-2xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download JSON Payload</span>
              </button>
              <button onClick={() => setIsDetailsModalOpen(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: STRICT DELETE CONFIRMATION */}
      {selectedBackupToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 border-b border-rose-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center font-bold shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Delete Database Backup</h3>
                <p className="text-xs text-rose-600 font-medium">Permanent Backup Removal</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              This action will permanently delete backup snapshot <strong className="font-mono font-bold text-slate-900">{selectedBackupToDelete.backupId}</strong> from the separate Backup MongoDB Atlas database.
            </p>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs">
              <label className="block text-slate-700 font-bold">
                To confirm deletion, type <span className="font-mono font-extrabold text-rose-700">DELETE</span> in the box below:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full px-3 py-2 bg-white border border-rose-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setSelectedBackupToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                onClick={handleDeleteConfirm}
                className={`px-5 py-2 font-bold text-xs rounded-xl shadow-2xs flex items-center gap-2 transition cursor-pointer ${
                  deleteConfirmText === 'DELETE' && !isDeleting
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                }`}
              >
                {isDeleting ? 'Deleting Snapshot...' : 'Delete Backup'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REFINED CLEAN BACKUP RESTORE MODAL */}
      {selectedBackupForRestore && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200 shrink-0 font-bold">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <span>Safe Missing-Records-Only Restore</span>
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    Backup ID: {selectedBackupForRestore.backupId}
                  </span>
                </div>
              </div>
              <button
                disabled={restoreStep === 2}
                onClick={() => setSelectedBackupForRestore(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* FORM VIEW (STEP 1) */}
            {restoreStep === 1 && (
              <div className="space-y-4 text-xs font-sans">
                {/* 1. TARGET USER SECTION */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">Target User</label>
                    {!selectedUserObj && (
                      <button
                        type="button"
                        onClick={() =>
                          handleSelectUser({
                            _id: 'ALL',
                            ownerName: 'All Users (Full ERP System)',
                            mobile: 'N/A',
                          })
                        }
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                      >
                        System-Wide Recovery (All Users)
                      </button>
                    )}
                  </div>

                  {/* SELECTED USER CARD (WHEN A USER IS SELECTED) */}
                  {selectedUserObj ? (
                    <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between border-b border-blue-200/60 pb-1.5">
                        <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Selected Target User</span>
                        <button
                          type="button"
                          onClick={handleClearUser}
                          className="text-xs text-blue-700 hover:text-blue-900 font-bold underline cursor-pointer"
                        >
                          Change User
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold block uppercase">Name</span>
                          <span className="font-extrabold text-slate-900 text-xs block">{selectedUserObj.ownerName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold block uppercase">User ID</span>
                          <span className="font-mono font-bold text-blue-700 text-xs flex items-center gap-1">
                            <span>{selectedUserObj._id}</span>
                            {selectedUserObj._id !== 'ALL' && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(selectedUserObj._id);
                                  setCopiedUserId(true);
                                  setTimeout(() => setCopiedUserId(false), 2500);
                                }}
                                className="text-[10px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                              >
                                {copiedUserId ? 'Copied!' : 'Copy'}
                              </button>
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold block uppercase">Mobile</span>
                          <span className="font-mono font-bold text-slate-800 text-xs block">{selectedUserObj.mobile || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold block uppercase">Business / Shop</span>
                          <span className="font-bold text-emerald-700 text-xs block">{selectedUserObj.businessName || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* SEARCH INPUT & DROPDOWN (WHEN NO USER SELECTED) */
                    <div className="space-y-1.5 relative">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          value={userSearchQuery}
                          onChange={(e) => handleSearchUsers(e.target.value)}
                          placeholder="Search by User ID, name, mobile or business..."
                          className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                        />
                      </div>

                      {/* SEARCH RESULTS OVERLAY LIST */}
                      {userSearchQuery && (
                        <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white shadow-xl absolute left-0 right-0 z-20">
                          {isSearchingUsers ? (
                            <div className="p-3 text-center text-xs text-slate-400 font-medium">Searching user accounts...</div>
                          ) : userSearchError ? (
                            <div className="p-3 text-center text-xs text-rose-600 font-bold">{userSearchError}</div>
                          ) : userSearchResults.length === 0 ? (
                            <div className="p-3 text-center text-xs text-slate-400 font-medium">No matching users found for "{userSearchQuery}"</div>
                          ) : (
                            userSearchResults.map((u) => (
                              <button
                                key={u._id}
                                type="button"
                                onClick={() => handleSelectUser(u)}
                                className="w-full text-left p-3 hover:bg-blue-50 transition cursor-pointer text-xs space-y-0.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-extrabold text-slate-900">{u.ownerName}</span>
                                  {u.businessName && (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                      {u.businessName}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-blue-700 font-mono font-bold flex items-center gap-1">
                                  <Fingerprint className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span>User ID: {u._id}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  Mobile: {u.mobile || 'N/A'} {u.email ? `• ${u.email}` : ''}
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. SUPPORT TICKET REFERENCE (OPTIONAL) */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">Support Ticket Reference ID (Optional)</label>
                  <div className="relative">
                    <LifeBuoy className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={ticketIdInput}
                      onChange={(e) => setTicketIdInput(e.target.value)}
                      placeholder="Ticket ID e.g. SUP-1024"
                      className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* 3. BACKUP VS CURRENT DATA COMPARISON (ONLY SHOWN AFTER USER SELECTION) */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Backup vs Current Data</h4>
                    {isAnalyzing && (
                      <span className="text-xs text-blue-600 font-bold flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 animate-spin" /> Comparing records...
                      </span>
                    )}
                  </div>

                  {!targetUserId || !selectedUserObj ? (
                    <div className="p-4 text-center text-xs text-slate-400 font-medium bg-slate-50 rounded-xl border border-slate-200">
                      Select a target user to compare live vs backup data.
                    </div>
                  ) : isAnalyzing ? (
                    <div className="p-6 text-center text-xs text-slate-500 font-medium bg-slate-50 rounded-xl border border-slate-200">
                      <Activity className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                      Analyzing backup snapshot vs live data for User ID {selectedUserObj._id}...
                    </div>
                  ) : restoreAnalysis ? (
                    <div className="space-y-3">
                      {/* 3 METRIC BOXES */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">Backup Records</span>
                          <span className="text-sm font-black text-slate-900 font-mono block mt-0.5">
                            {restoreAnalysis.summary?.totalAnalyzed || 0} docs
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">Current Records</span>
                          <span className="text-sm font-black text-slate-900 font-mono block mt-0.5">
                            {restoreAnalysis.summary?.totalExisting || 0} docs
                          </span>
                        </div>
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                          <span className="text-[10px] font-bold text-blue-800 uppercase block">Missing Records</span>
                          <span className="text-sm font-black text-blue-700 font-mono block mt-0.5">
                            {restoreAnalysis.summary?.totalMissing || 0} docs
                          </span>
                        </div>
                      </div>

                      {/* RESTORE MODE GUARANTEE */}
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <span className="font-bold block">Restore Mode: Missing Records Only</span>
                            <span className="text-[10px] text-emerald-700 font-medium">Existing records will not be overwritten or deleted.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* MODAL FOOTER ACTIONS */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedBackupForRestore(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!selectedUserObj || !restoreAnalysis || isAnalyzing || isExecutingRestore || restoreAnalysis?.summary?.totalMissing === 0}
                    onClick={handleExecuteRestoreSubmit}
                    className={`px-5 py-2.5 font-bold text-xs rounded-xl shadow-2xs flex items-center gap-2 transition cursor-pointer ${
                      selectedUserObj && restoreAnalysis && !isAnalyzing && !isExecutingRestore && restoreAnalysis?.summary?.totalMissing > 0
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                    }`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>
                      {restoreAnalysis?.summary?.totalMissing === 0
                        ? 'No Missing Records Found'
                        : `Restore Missing Records (${restoreAnalysis?.summary?.totalMissing || 0})`}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* EXECUTING PROGRESS VIEW (STEP 2) */}
            {restoreStep === 2 && (
              <div className="py-8 text-center space-y-3 font-sans">
                <Activity className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
                <h4 className="text-base font-extrabold text-slate-900">Executing Safe Restore...</h4>
                <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                  Creating Pre-Restore Safety Backup &amp; restoring missing records for User ID <strong className="font-mono text-slate-800">{targetUserId}</strong>...
                </p>
              </div>
            )}

            {/* SUMMARY RESULT REPORT VIEW (STEP 3) */}
            {restoreStep === 3 && restoreResult && (
              <div className="space-y-4 text-xs font-sans">
                <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-950 space-y-1.5">
                  <div className="flex items-center gap-2 font-black text-emerald-900 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>RESTORE COMPLETED SUCCESSFULLY</span>
                  </div>
                  <p className="text-emerald-800 font-medium">
                    Missing records have been safely inserted. Existing live records were untouched.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Restore ID</span>
                    <span className="font-mono font-bold text-slate-900 block">{restoreResult.restoreId}</span>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-0.5">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Safety Backup Created</span>
                    <span className="font-mono font-bold text-emerald-900 block">{restoreResult.safetyBackupId}</span>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-0.5">
                    <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">Total Restored</span>
                    <span className="font-mono font-black text-blue-900 text-sm block">{restoreResult.summary?.totalRestored || 0} docs</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Skipped Records</span>
                    <span className="font-mono font-bold text-slate-700 text-sm block">{restoreResult.summary?.totalSkipped || 0} docs</span>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedBackupForRestore(null)}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Done &amp; Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 KB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
