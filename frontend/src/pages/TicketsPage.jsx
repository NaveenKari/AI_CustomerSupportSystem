import { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '../components/Navbar';
import {
  getTickets,
  getTicket,
  createTicket,
  replyToTicket,
  updateTicketStatus,
} from '../services/ticketService';

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUSES = ['NEW', 'AI_RESPONDED', 'PENDING_HUMAN', 'IN_PROGRESS', 'RESOLVED'];
const CATEGORIES = ['BILLING', 'TECHNICAL', 'GENERAL_INQUIRY', 'OTHER'];

const STATUS_BADGE = {
  NEW:           'bg-blue-100 text-blue-800',
  AI_RESPONDED:  'bg-purple-100 text-purple-800',
  PENDING_HUMAN: 'bg-orange-100 text-orange-800',
  IN_PROGRESS:   'bg-yellow-100 text-yellow-800',
  RESOLVED:      'bg-green-100 text-green-800',
};

const CATEGORY_BADGE = {
  BILLING:         'bg-red-100 text-red-700',
  TECHNICAL:       'bg-indigo-100 text-indigo-700',
  GENERAL_INQUIRY: 'bg-teal-100 text-teal-700',
  OTHER:           'bg-gray-100 text-gray-700',
};

function fmtLabel(val) {
  return val.replace(/_/g, ' ');
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── FilterBar ─────────────────────────────────────────────────────────────────

function FilterBar({ filters, onChange, onNewTicket }) {
  const debounceRef = useRef(null);

  function handleKeyword(e) {
    const val = e.target.value;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange({ ...filters, keyword: val }), 300);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {/* Status */}
      <select
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={filters.status}
        onChange={e => onChange({ ...filters, status: e.target.value })}
      >
        <option value="">All Statuses</option>
        {STATUSES.map(s => (
          <option key={s} value={s}>{fmtLabel(s)}</option>
        ))}
      </select>

      {/* Category */}
      <select
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={filters.category}
        onChange={e => onChange({ ...filters, category: e.target.value })}
      >
        <option value="">All Categories</option>
        {CATEGORIES.map(c => (
          <option key={c} value={c}>{fmtLabel(c)}</option>
        ))}
      </select>

      {/* Keyword search */}
      <input
        type="text"
        placeholder="Search subject or email…"
        defaultValue={filters.keyword}
        onChange={handleKeyword}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Date range */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-500">From</label>
        <input
          type="date"
          value={filters.from}
          onChange={e => onChange({ ...filters, from: e.target.value })}
          className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <label className="text-sm text-gray-500">To</label>
        <input
          type="date"
          value={filters.to}
          onChange={e => onChange({ ...filters, to: e.target.value })}
          className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* New Ticket button — pushed to right */}
      <button
        onClick={onNewTicket}
        className="ml-auto bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        + New Ticket
      </button>
    </div>
  );
}

// ── TicketTable ───────────────────────────────────────────────────────────────

function TicketTable({ tickets, loading, selectedId, onSelect }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <svg className="animate-spin h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Loading tickets…
      </div>
    );
  }

  if (!tickets.length) {
    return (
      <div className="text-center py-16 text-gray-400">
        No tickets found. Adjust your filters or create a new ticket.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
          <tr>
            <th className="px-4 py-3 text-left">#</th>
            <th className="px-4 py-3 text-left">Subject</th>
            <th className="px-4 py-3 text-left">Customer</th>
            <th className="px-4 py-3 text-left">Category</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {tickets.map(t => (
            <tr
              key={t.id}
              onClick={() => onSelect(t.id)}
              className={`cursor-pointer transition-colors hover:bg-blue-50 ${
                selectedId === t.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              }`}
            >
              <td className="px-4 py-3 text-gray-400 font-mono">{t.id}</td>
              <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{t.subject}</td>
              <td className="px-4 py-3 text-gray-600">
                <div>{t.customerName}</div>
                <div className="text-xs text-gray-400">{t.customerEmail}</div>
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_BADGE[t.category] ?? ''}`}>
                  {fmtLabel(t.category)}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_BADGE[t.status] ?? ''}`}>
                  {fmtLabel(t.status)}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(t.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── TicketDetailPanel ─────────────────────────────────────────────────────────

function TicketDetailPanel({ ticket, loading, onClose, onUpdated }) {
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const threadEndRef = useRef(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages?.length]);

  async function handleReply() {
    if (!replyBody.trim()) return;
    setSending(true);
    try {
      const updated = await replyToTicket(ticket.id, replyBody.trim());
      setReplyBody('');
      onUpdated(updated);
    } catch (e) {
      alert(e.message);
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(e) {
    const newStatus = e.target.value;
    setStatusUpdating(true);
    try {
      await updateTicketStatus(ticket.id, newStatus);
      onUpdated({ ...ticket, status: newStatus });
    } catch (e) {
      alert(e.message);
    } finally {
      setStatusUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Loading…
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <div className="flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex-1 min-w-0 mr-4">
          <h2 className="font-semibold text-gray-900 truncate">{ticket.subject}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {ticket.customerName} &lt;{ticket.customerEmail}&gt; · #{ticket.id}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Status dropdown */}
          <select
            value={ticket.status}
            onChange={handleStatusChange}
            disabled={statusUpdating}
            className={`text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500
              ${STATUS_BADGE[ticket.status] ?? 'bg-gray-100 text-gray-700'} border-transparent`}
          >
            {STATUSES.map(s => (
              <option key={s} value={s}>{fmtLabel(s)}</option>
            ))}
          </select>
          {/* Close */}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
        {ticket.messages && ticket.messages.length > 0 ? (
          ticket.messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.senderType === 'AGENT' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm
                  ${msg.senderType === 'AGENT'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
              >
                <p className="whitespace-pre-wrap">{msg.body}</p>
                <p className={`text-xs mt-1 ${msg.senderType === 'AGENT' ? 'text-blue-200' : 'text-gray-400'}`}>
                  {msg.senderType === 'AGENT' ? 'Admin' : ticket.customerName} · {fmtDate(msg.sentAt)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-400 text-sm">No messages yet.</p>
        )}
        <div ref={threadEndRef} />
      </div>

      {/* Reply box */}
      <div className="px-5 py-4 border-t border-gray-100">
        <textarea
          rows={3}
          value={replyBody}
          onChange={e => setReplyBody(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleReply();
          }}
          placeholder="Type your reply… (Ctrl/Cmd+Enter to send)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none
            focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleReply}
            disabled={sending || !replyBody.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
              text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {sending ? 'Sending…' : 'Send Reply'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── NewTicketModal ─────────────────────────────────────────────────────────────

function NewTicketModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    subject: '', customerEmail: '', customerName: '', body: '', category: 'GENERAL_INQUIRY',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function setField(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.subject || !form.customerEmail || !form.customerName || !form.body) {
      setError('All fields are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const ticket = await createTicket(form);
      onCreated(ticket);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">New Ticket</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name *</label>
              <input
                type="text"
                value={form.customerName}
                onChange={e => setField('customerName', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer Email *</label>
              <input
                type="email"
                value={form.customerEmail}
                onChange={e => setField('customerEmail', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="jane@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Subject *</label>
            <input
              type="text"
              value={form.subject}
              onChange={e => setField('subject', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of the issue"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select
              value={form.category}
              onChange={e => setField('category', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{fmtLabel(c)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Message *</label>
            <textarea
              rows={4}
              value={form.body}
              onChange={e => setField('body', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the customer's issue…"
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              {submitting ? 'Creating…' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── TicketsPage (main) ────────────────────────────────────────────────────────

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    status: '', category: '', keyword: '', from: '', to: '',
  });

  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [showNewTicketModal, setShowNewTicketModal] = useState(false);

  // Fetch ticket list whenever filters change
  const fetchTickets = useCallback(async (activeFilters) => {
    setLoading(true);
    setError('');
    try {
      const data = await getTickets({
        status:   activeFilters.status   || undefined,
        category: activeFilters.category || undefined,
        keyword:  activeFilters.keyword  || undefined,
        from:     activeFilters.from     || undefined,
        to:       activeFilters.to       || undefined,
      });
      setTickets(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets(filters);
  }, [filters, fetchTickets]);

  // Fetch ticket detail when a row is selected
  useEffect(() => {
    if (!selectedTicketId) {
      setSelectedTicket(null);
      return;
    }
    setDetailLoading(true);
    getTicket(selectedTicketId)
      .then(setSelectedTicket)
      .catch(e => setError(e.message))
      .finally(() => setDetailLoading(false));
  }, [selectedTicketId]);

  function handleSelectTicket(id) {
    setSelectedTicketId(prev => (prev === id ? null : id)); // clicking same row toggles panel
  }

  function handleDetailUpdated(updatedTicket) {
    setSelectedTicket(updatedTicket);
    fetchTickets(filters);
  }

  function handleTicketCreated(newTicket) {
    fetchTickets(filters);
    setSelectedTicketId(newTicket.id);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className={`${selectedTicketId ? 'max-w-full px-4' : 'max-w-7xl mx-auto px-6'} py-8`}>
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? 'Loading…' : `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <FilterBar
          filters={filters}
          onChange={setFilters}
          onNewTicket={() => setShowNewTicketModal(true)}
        />

        {/* Two-panel layout */}
        <div className={`flex gap-4 ${selectedTicketId ? 'items-start' : ''}`}>
          {/* Ticket list */}
          <div className={selectedTicketId ? 'w-[62%] shrink-0 min-w-0' : 'w-full'}>
            <TicketTable
              tickets={tickets}
              loading={loading}
              selectedId={selectedTicketId}
              onSelect={handleSelectTicket}
            />
          </div>

          {/* Detail panel */}
          {selectedTicketId && (
            <div className="flex-1 min-w-0" style={{ height: '70vh' }}>
              <TicketDetailPanel
                ticket={selectedTicket}
                loading={detailLoading}
                onClose={() => setSelectedTicketId(null)}
                onUpdated={handleDetailUpdated}
              />
            </div>
          )}
        </div>
      </main>

      {showNewTicketModal && (
        <NewTicketModal
          onClose={() => setShowNewTicketModal(false)}
          onCreated={handleTicketCreated}
        />
      )}
    </div>
  );
}
