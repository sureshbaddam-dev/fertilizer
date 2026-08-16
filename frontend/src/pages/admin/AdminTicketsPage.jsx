import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, CheckCircle2, Clock, ShieldCheck, Send, Filter } from 'lucide-react';
import PageLayout from '../../components/ui/PageLayout';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Textarea from '../../components/ui/Textarea';
import { supportService } from '../../services/supportService';

export default function AdminTicketsPage() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'PENDING' | 'RESOLVED'
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyInput, setReplyInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch All Tickets (Admin)
  const { data: ticketsRes, isLoading } = useQuery({
    queryKey: ['admin-tickets', filterStatus],
    queryFn: () => supportService.getAllTicketsAdmin(filterStatus !== 'ALL' ? filterStatus : undefined),
  });

  const tickets = ticketsRes?.data?.tickets || ticketsRes?.tickets || [];

  // Resolve Ticket Mutation
  const resolveMutation = useMutation({
    mutationFn: ({ id, adminReply }) => supportService.resolveTicketAdmin(id, { adminReply }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      setSelectedTicket(null);
      setReplyInput('');
      setErrorMsg('');
    },
    onError: (err) => {
      setErrorMsg(err?.message || 'Failed to resolve ticket');
    },
  });

  const handleOpenResolveModal = (ticket) => {
    setSelectedTicket(ticket);
    setReplyInput(ticket.adminReply || 'Issue reviewed and resolved by VEDIXA Support Admin.');
  };

  const handleConfirmResolve = (e) => {
    e.preventDefault();
    if (!replyInput.trim()) {
      setErrorMsg('Please enter a resolution response message.');
      return;
    }
    resolveMutation.mutate({ id: selectedTicket._id, adminReply: replyInput });
  };

  return (
    <PageLayout
      title="Support Tickets Admin Console"
      subtitle="Review user support tickets, provide resolution responses, and mark issues as resolved."
    >
      <div className="space-y-6">
        {/* Status Filter Bar */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-bold text-gray-700">Filter Status:</span>
            {['ALL', 'PENDING', 'RESOLVED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  filterStatus === st
                    ? 'bg-emerald-800 text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
          <span className="text-xs font-mono text-gray-500">
            Total Tickets: <strong>{tickets.length}</strong>
          </span>
        </div>

        {/* Tickets List */}
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm italic">Loading tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center bg-white border border-gray-200 rounded-2xl">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-gray-800">No support tickets found</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tickets.map((t) => (
              <div key={t._id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-800">{t.ticketId}</span>
                  {t.status === 'PENDING' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> PENDING
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> RESOLVED
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                    <span>User: <strong>{t.userId?.ownerName || 'User'}</strong> ({t.userId?.mobile || 'N/A'})</span>
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-semibold">{t.category}</span>
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm mt-1">{t.subject}</h4>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  {t.description}
                </p>

                {t.status === 'RESOLVED' ? (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-950">
                    <span className="font-bold text-emerald-800 block text-[10px] uppercase">Admin Reply:</span>
                    {t.adminReply}
                  </div>
                ) : (
                  <div className="pt-2 flex justify-end">
                    <Button
                      onClick={() => handleOpenResolveModal(t)}
                      className="btn-agri-primary text-xs flex items-center gap-1"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Reply & Resolve</span>
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RESOLVE MODAL */}
      {selectedTicket && (
        <Modal
          isOpen={Boolean(selectedTicket)}
          onClose={() => setSelectedTicket(null)}
          title={`Resolve Ticket ${selectedTicket.ticketId}`}
        >
          <form onSubmit={handleConfirmResolve} className="space-y-4 pt-2">
            {errorMsg && (
              <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg">{errorMsg}</div>
            )}

            <div>
              <span className="text-xs font-bold text-gray-700 block mb-1">Subject:</span>
              <p className="text-xs text-gray-800 font-semibold bg-gray-50 p-2 rounded">{selectedTicket.subject}</p>
            </div>

            <div>
              <span className="text-xs font-bold text-gray-700 block mb-1">User Issue:</span>
              <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded border border-gray-200">{selectedTicket.description}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Admin Resolution Message</label>
              <Textarea
                rows={3}
                value={replyInput}
                onChange={(e) => setReplyInput(e.target.value)}
                className="w-full text-xs"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => setSelectedTicket(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={resolveMutation.isPending}
                className="btn-agri-primary text-xs flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{resolveMutation.isPending ? 'Resolving...' : 'Mark as RESOLVED'}</span>
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </PageLayout>
  );
}
