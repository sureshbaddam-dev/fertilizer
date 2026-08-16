import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HelpCircle, MessageSquare, Plus, CheckCircle2, Clock, ShieldAlert, Send } from 'lucide-react';
import PageLayout from '../../components/ui/PageLayout';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';
import { supportService } from '../../services/supportService';

const FAQS = [
  {
    q: 'How do I record a new fertilizer purchase from a supplier?',
    a: 'Go to New Purchase in the sidebar menu, select the supplier, select the items, enter initial payment if made, and save. The FIFO inventory batch and supplier ledger will update automatically.',
  },
  {
    q: 'How does FIFO batch pricing work during sales billing?',
    a: 'When creating a sales bill, VEDIXA automatically deducts stock from your oldest active batch layer. Selling price is computed per batch layer so your gross margin calculations are exact.',
  },
  {
    q: 'Can I edit the selling price of an existing batch?',
    a: 'Yes! Open Products → Click any product → Pricing tab → Batch Pricing History → Click Edit Price near the batch status column.',
  },
  {
    q: 'How do supplier payments work with deleted purchases?',
    a: 'When a purchase or payment is soft-deleted, it is safely excluded from supplier outstanding summaries and ledgers.',
  },
];

export default function SupportPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets' | 'faqs'

  // Form State
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch Tickets
  const { data: ticketsRes, isLoading } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: supportService.getUserTickets,
  });

  const tickets = ticketsRes?.data?.tickets || ticketsRes?.tickets || [];

  // Create Ticket Mutation
  const createMutation = useMutation({
    mutationFn: supportService.createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      setIsModalOpen(false);
      setSubject('');
      setDescription('');
      setCategory('General');
      setErrorMsg('');
    },
    onError: (err) => {
      setErrorMsg(err?.message || 'Failed to submit ticket');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setErrorMsg('Please fill in both subject and description.');
      return;
    }
    createMutation.mutate({ subject, description, category });
  };

  return (
    <PageLayout
      title="Support & Customer Care"
      subtitle="View help FAQs, submit technical tickets, and track resolutions directly with VEDIXA support."
      actions={
        <Button
          onClick={() => setIsModalOpen(true)}
          className="btn-agri-primary flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Support Ticket</span>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'tickets'
                ? 'bg-emerald-800 text-white shadow-2xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>My Support Tickets ({tickets.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('faqs')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'faqs'
                ? 'bg-emerald-800 text-white shadow-2xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>FAQs & Guide</span>
          </button>
        </div>

        {/* TICKETS TAB */}
        {activeTab === 'tickets' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="p-8 text-center text-gray-400 text-sm italic">Loading tickets...</div>
            ) : tickets.length === 0 ? (
              <div className="p-12 text-center bg-white border border-gray-200 rounded-2xl space-y-3">
                <HelpCircle className="w-12 h-12 text-gray-300 mx-auto" />
                <h3 className="text-sm font-bold text-gray-800">No support tickets created yet</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  If you run into any issue or have a query about your store setup, submit a ticket to reach our support team.
                </p>
                <Button onClick={() => setIsModalOpen(true)} className="btn-agri-primary text-xs">
                  Create First Ticket
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tickets.map((t) => {
                  const st = (t.status || 'PENDING').toUpperCase();
                  return (
                    <div key={t._id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-gray-500">{t.ticketId}</span>
                        {st === 'COMPLETED' || st === 'RESOLVED' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> RESOLVED
                          </span>
                        ) : st === 'IN_PROGRESS' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-600" /> IN PROGRESS
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" /> PENDING
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{t.subject}</h4>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600">
                          Category: {t.category}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                        {t.description}
                      </p>

                      {/* Admin Note Section for In Progress */}
                      {st === 'IN_PROGRESS' && t.adminReply && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-blue-600" /> Admin Note
                          </span>
                          <p className="text-xs font-medium text-blue-950">{t.adminReply}</p>
                        </div>
                      )}

                      {/* Admin Resolution Section for Completed */}
                      {(st === 'COMPLETED' || st === 'RESOLVED') && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Admin Resolution
                          </span>
                          <p className="text-xs font-medium text-emerald-950">{t.adminReply || 'Issue marked as resolved.'}</p>
                          {(t.completedAt || t.resolvedAt) && (
                            <span className="text-[9px] text-emerald-700 block text-right font-mono font-bold">
                              Resolved on {new Date(t.completedAt || t.resolvedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="text-[10px] text-gray-400 text-right font-mono pt-1">
                        Submitted on {new Date(t.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* FAQS TAB */}
        {activeTab === 'faqs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FAQS.map((faq, idx) => (
              <div key={idx} className="p-4 bg-white border border-gray-200 rounded-xl space-y-2 shadow-2xs">
                <h4 className="font-bold text-gray-900 text-xs flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{faq.q}</span>
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed pl-6">{faq.a}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE TICKET MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Submit Support Ticket"
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs"
            >
              <option value="General">General Query</option>
              <option value="Billing">Billing &amp; Sales Invoices</option>
              <option value="Inventory">Inventory &amp; FIFO Batches</option>
              <option value="Supplier">Supplier &amp; Purchases</option>
              <option value="Customer">Customer Ledgers</option>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Subject</label>
            <Input
              type="text"
              placeholder="Brief summary of your issue..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Issue Description</label>
            <Textarea
              rows={4}
              placeholder="Describe the details of your problem or question..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="btn-agri-primary text-xs flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{createMutation.isPending ? 'Submitting...' : 'Submit Ticket'}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  );
}
