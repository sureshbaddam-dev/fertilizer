import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Paperclip,
  Send,
  CheckCircle2,
  Clock,
  UserCheck,
  Lock,
  RotateCcw,
  FileText,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';
import { supportService } from '../../../services/supportService';

export default function RequestDetailsView({ requestId, onBack, onRaiseRequest }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [replyMessage, setReplyMessage] = useState('');
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [reopenReason, setReopenReason] = useState('');
  const [isReopening, setIsReopening] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { data: reqRes, isLoading, refetch } = useQuery({
    queryKey: ['request-details', requestId],
    queryFn: () => supportService.getTicketById(requestId),
    enabled: !!requestId,
    refetchInterval: 10000,
  });

  const request = reqRes?.data?.ticket || reqRes?.ticket || reqRes?.data;

  // Reply Mutation
  const replyMutation = useMutation({
    mutationFn: (data) => supportService.addReply(request?._id || requestId, data),
    onSuccess: () => {
      setReplyMessage('');
      setReplyAttachments([]);
      setErrorMsg('');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['user-requests'] });
    },
    onError: (err) => {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to send reply.');
    },
  });

  // Reopen Mutation
  const reopenMutation = useMutation({
    mutationFn: (data) => supportService.reopenRequest(request?._id || requestId, data),
    onSuccess: () => {
      setIsReopening(false);
      setReopenReason('');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['user-requests'] });
    },
    onError: (err) => {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to reopen request.');
    },
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    setErrorMsg('');

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await supportService.uploadAttachment(formData);
        const url = res?.data?.url || res?.url;
        if (url) {
          setReplyAttachments((prev) => [...prev, url]);
        }
      }
    } catch (_err) {
      setErrorMsg('Failed to upload attachment.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    replyMutation.mutate({
      message: replyMessage.trim(),
      attachments: replyAttachments,
    });
  };

  const handleConfirmReopen = (e) => {
    e.preventDefault();
    reopenMutation.mutate({ reason: reopenReason });
  };

  if (isLoading || !request) {
    return (
      <div className="p-12 text-center text-slate-400 font-medium text-xs">
        Loading request details...
      </div>
    );
  }

  const st = (request.status || 'PENDING').toUpperCase();
  const isResolved = st === 'COMPLETED' || st === 'RESOLVED';
  const isClosed = st === 'CLOSED';

  const getStatusBadge = (statusStr) => {
    const statusUpper = (statusStr || 'PENDING').toUpperCase();
    if (statusUpper === 'COMPLETED' || statusUpper === 'RESOLVED') {
      return (
        <span className="px-2.5 py-1 text-xs font-extrabold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Resolved
        </span>
      );
    }
    if (statusUpper === 'IN_PROGRESS') {
      return (
        <span className="px-2.5 py-1 text-xs font-extrabold rounded-full bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-blue-600 animate-pulse" /> In Progress
        </span>
      );
    }
    if (statusUpper === 'WAITING_FOR_USER') {
      return (
        <span className="px-2.5 py-1 text-xs font-extrabold rounded-full bg-amber-50 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
          <UserCheck className="w-3.5 h-3.5 text-amber-600" /> Waiting for You
        </span>
      );
    }
    if (statusUpper === 'CLOSED') {
      return (
        <span className="px-2.5 py-1 text-xs font-extrabold rounded-full bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1">
          <Lock className="w-3.5 h-3.5 text-slate-500" /> Closed
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-xs font-extrabold rounded-full bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
        <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending
      </span>
    );
  };

  const getPriorityBadge = (priorityStr) => {
    const pr = (priorityStr || 'Medium').toLowerCase();
    if (pr === 'high') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-600" /> High Priority
        </span>
      );
    }
    if (pr === 'low') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Low Priority
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Medium Priority
      </span>
    );
  };

  return (
    <div className="space-y-6 font-sans antialiased text-slate-800 pb-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
        <button
          onClick={onBack}
          className="hover:text-emerald-700 flex items-center gap-1 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>My Requests</span>
        </button>
        <span>/</span>
        <span className="font-mono font-bold text-slate-900">{request.ticketId}</span>
      </div>

      {/* Main Request Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-extrabold text-xs text-slate-400">{request.ticketId}</span>
            {getPriorityBadge(request.priority)}
            <span className="text-xs font-semibold text-slate-500">
              Category: <strong className="text-slate-800">{request.category || 'General'}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400 font-medium">Status:</span>
            {getStatusBadge(request.status)}
          </div>
        </div>

        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{request.subject}</h1>
        <p className="text-[11px] text-slate-400 font-medium">
          Created on:{' '}
          {new Date(request.createdAt).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Problem + Conversation */}
        <div className="lg:col-span-8 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* MY PROBLEM Section */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">MY PROBLEM</h3>
            <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
              {request.description}
            </p>

            {request.attachments && request.attachments.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Attachments</span>
                <div className="flex flex-wrap gap-2">
                  {request.attachments.map((att, idx) => (
                    <a
                      key={idx}
                      href={att}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-700 flex items-center gap-1.5 transition"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{att.split('/').pop()}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CONVERSATION TIMELINE */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-3">
              CONVERSATION
            </h3>

            <div className="space-y-4">
              {request.messages && request.messages.length > 0 ? (
                request.messages.map((msg, idx) => {
                  const isUser = msg.sender === 'USER';
                  return (
                    <div key={idx} className={`flex items-start gap-3 ${isUser ? 'flex-row' : 'flex-row'}`}>
                      {/* Avatar */}
                      <div
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-extrabold shrink-0 border ${
                          isUser
                            ? 'bg-emerald-800 text-white border-emerald-900'
                            : 'bg-purple-800 text-white border-purple-900'
                        }`}
                      >
                        {isUser ? 'BS' : 'VS'}
                      </div>

                      {/* Message Content */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-extrabold text-slate-900">
                            {isUser ? 'You' : 'VEDIXA Support'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(msg.createdAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>

                        <div
                          className={`p-3.5 rounded-2xl border text-xs sm:text-sm font-medium leading-relaxed ${
                            isUser
                              ? 'bg-emerald-50/60 border-emerald-100 text-slate-800'
                              : 'bg-purple-50/60 border-purple-100 text-slate-900'
                          }`}
                        >
                          {msg.message}
                        </div>

                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {msg.attachments.map((att, aIdx) => (
                              <a
                                key={aIdx}
                                href={att}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-medium text-slate-700 flex items-center gap-1.5 hover:bg-slate-50"
                              >
                                <Paperclip className="w-3 h-3 text-emerald-700" />
                                <span>{att.split('/').pop()}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs font-medium">
                  No conversation replies yet.
                </div>
              )}
            </div>

            {/* ADMIN RESOLUTION BOX (IF RESOLVED) */}
            {isResolved && (
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>ADMIN RESOLUTION</span>
                  </span>
                  {request.completedAt && (
                    <span className="text-[10px] text-emerald-700 font-mono font-semibold">
                      Resolved on{' '}
                      {new Date(request.completedAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-emerald-950 leading-relaxed">
                  {request.adminReply || 'This request has been marked as resolved by VEDIXA Support.'}
                </p>

                {/* Reopen Request Action */}
                {!isReopening ? (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setIsReopening(true)}
                      className="px-3.5 py-1.5 bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Reopen Request</span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleConfirmReopen} className="pt-2 space-y-2">
                    <input
                      type="text"
                      placeholder="Why are you reopening this request? (Optional)"
                      value={reopenReason}
                      onChange={(e) => setReopenReason(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-emerald-300 rounded-xl focus:outline-none focus:border-emerald-600"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={reopenMutation.isPending}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl cursor-pointer"
                      >
                        {reopenMutation.isPending ? 'Reopening...' : 'Confirm Reopen'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsReopening(false)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* REPLY INPUT FORM */}
            {!isClosed && (
              <form onSubmit={handleSendReply} className="pt-4 border-t border-slate-100 space-y-3">
                <div className="relative">
                  <textarea
                    rows={3}
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your reply..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:border-[#047857] focus:bg-white transition"
                  />
                </div>

                {replyAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {replyAttachments.map((url, aIdx) => (
                      <div
                        key={aIdx}
                        className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-mono font-medium flex items-center gap-1"
                      >
                        <ImageIcon className="w-3 h-3 text-emerald-600" />
                        <span className="truncate max-w-[120px]">{url.split('/').pop()}</span>
                        <button
                          type="button"
                          onClick={() => setReplyAttachments(replyAttachments.filter((_, i) => i !== aIdx))}
                          className="text-rose-600 hover:text-rose-800 font-bold ml-1"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*,.pdf"
                    className="hidden"
                    multiple
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    title="Attach screenshot/file"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <button
                    type="submit"
                    disabled={replyMutation.isPending || !replyMessage.trim()}
                    className="px-5 py-2 bg-[#047857] hover:bg-[#065f46] disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{replyMutation.isPending ? 'Sending...' : 'Send Reply'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4 space-y-5">
          {/* Request Details Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
              Request Details
            </h3>

            <div className="space-y-2.5 text-xs font-medium">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Request ID</span>
                <span className="font-mono font-extrabold text-emerald-700 text-xs block">
                  {request.ticketId}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Category</span>
                <span className="font-bold text-slate-800 text-xs block">{request.category || 'General'}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Priority</span>
                {getPriorityBadge(request.priority)}
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Status</span>
                {getStatusBadge(request.status)}
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Created On</span>
                <span className="text-slate-700 font-mono text-[11px] block">
                  {new Date(request.createdAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Last Updated</span>
                <span className="text-slate-700 font-mono text-[11px] block">
                  {new Date(request.updatedAt || request.createdAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Need More Help Card */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-5 shadow-2xs space-y-3">
            <h4 className="font-extrabold text-emerald-950 text-xs">Need more help?</h4>
            <p className="text-xs text-emerald-800 leading-relaxed font-medium">
              Can&apos;t find what you&apos;re looking for? Raise a new request and our team will help you.
            </p>
            <button
              onClick={onRaiseRequest}
              className="w-full py-2 bg-[#047857] hover:bg-[#065f46] text-white font-bold text-xs rounded-xl shadow-2xs transition cursor-pointer"
            >
              + Raise a New Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
