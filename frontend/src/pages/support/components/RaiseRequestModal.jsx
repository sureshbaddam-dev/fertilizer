import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Paperclip, Send, AlertCircle, Image as ImageIcon } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';
import Select from '../../../components/ui/Select';
import { supportService } from '../../../services/supportService';

export default function RaiseRequestModal({ isOpen, onClose, onSuccessRequest }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [category, setCategory] = useState('Sales & Billing');
  const [priority, setPriority] = useState('Medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const createMutation = useMutation({
    mutationFn: supportService.createTicket,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['user-requests'] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      const createdTicket = res?.data?.ticket || res?.ticket;
      onClose();
      resetForm();
      if (createdTicket && onSuccessRequest) {
        onSuccessRequest(createdTicket);
      }
    },
    onError: (err) => {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to submit request');
    },
  });

  const resetForm = () => {
    setCategory('Sales & Billing');
    setPriority('Medium');
    setSubject('');
    setDescription('');
    setAttachments([]);
    setErrorMsg('');
  };

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
          setAttachments((prev) => [...prev, url]);
        }
      }
    } catch (err) {
      setErrorMsg('Failed to upload file attachment.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setErrorMsg('Please enter both subject and description.');
      return;
    }
    createMutation.mutate({
      subject: subject.trim(),
      description: description.trim(),
      category,
      priority,
      attachments,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Raise a New Request" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 font-sans text-slate-800">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Category
            </label>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs font-semibold rounded-xl bg-slate-50 border-slate-200"
            >
              <option value="Products">Products</option>
              <option value="Sales & Billing">Sales &amp; Billing</option>
              <option value="Purchases">Purchases</option>
              <option value="Customers">Customers</option>
              <option value="Suppliers">Suppliers</option>
              <option value="Inventory">Inventory</option>
              <option value="Reports">Reports</option>
              <option value="Subscription">Subscription</option>
              <option value="Settings">Settings</option>
              <option value="General">Technical / General Query</option>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Priority
            </label>
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full text-xs font-semibold rounded-xl bg-slate-50 border-slate-200"
            >
              <option value="Low">Low Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="High">High Priority</option>
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Subject
          </label>
          <Input
            type="text"
            placeholder="Brief summary of your problem..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full text-xs rounded-xl border-slate-200"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Problem Description
          </label>
          <Textarea
            rows={4}
            placeholder="Describe your question or issue in detail..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-xs rounded-xl border-slate-200"
            required
          />
        </div>

        {/* Attachments Section */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Attachments (Optional)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,.pdf,.doc,.docx"
              className="hidden"
              multiple
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Paperclip className="w-3.5 h-3.5 text-slate-600" />
              <span>{isUploading ? 'Uploading...' : 'Attach Screenshot / File'}</span>
            </button>
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {attachments.map((url, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-mono font-medium"
                >
                  <ImageIcon className="w-3 h-3 text-emerald-600" />
                  <span className="truncate max-w-[140px]">{url.split('/').pop()}</span>
                  <button
                    type="button"
                    onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                    className="text-rose-600 hover:text-rose-800 font-bold ml-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="text-xs rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || isUploading}
            className="btn-agri-primary text-xs rounded-xl flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{createMutation.isPending ? 'Submitting...' : 'Submit Request'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
