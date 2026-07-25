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

const STATUSES   = ['NEW', 'AI_RESPONDED', 'PENDING_HUMAN', 'IN_PROGRESS', 'RESOLVED'];
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

function fmtDateShort(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── FilterBar ─────────────────────────────────────────────────────────────────

function FilterBar({ filters, onChange, onNewTicket }) {
  const debounceRef = useRef(null);

  function handleKeyword(e) {
    const val = e.target.value;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange({ ...filters, keyword: val }), 300);
  }

  const selectCls = 'w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500';
  const inputCls  = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="mb-5 space-y-3">
      {/* Row 1: Status + Category + Keyword */}
      <div className="flex flex-wrap gap-2">
        <select className={selectCls} value={filters.status}
          onChange={e => onChange({ ...filters, status: e.target.value })}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{fmtLabel(s)}</option>)}
        </select>

        <select className={selectCls} value={filters.category}
          onChange={e => onChange({ ...filters, category: e.target.value })}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{fmtLabel(c)}</option>)}
        </select>

        <input
          type="text"
          placeholder="Search subject or email…"
          defaultValue={filters.keyword}
          onChange={handleKeyword}
          className={`${inputCls} w-full sm:w-56`}
        />
      </div>

      {/* Row 2: Date range + New Ticket button */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-sm text-gray-500">From</label>
          <input type="date" value={filters.from}
            onChange={e => onChange({ ...filters, from: e.target.value })}
            className={inputCls} />
          <label className="text-sm text-gray-500">To</label>
          <input type="date" value={filters.to}
            onChange={e => onChange({ ...filters, to: e.target.value })}
            className={inputCls} />
        </div>

        <button
          onClick={onNewTicket}
          className="ml-auto sm:ml-auto bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          + New Ticket
        </button>
      </div>
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
      <div className="text-center py-16 text-gray-400 text-sm">
        No tickets found. Adjust your filters or create a new ticket.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-sm min-w-[480px]">
        <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
          <tr>
            {/* # hidden on mobile */}
            <th className="hidden sm:table-cell px-3 py-3 text-left w-10">#</th>
            <th className="px-3 py-3 text-left">Subject</th>
            {/* Customer hidden on mobile */}
            <th className="hidden md:table-cell px-3 py-3 text-left">Customer</th>
            {/* Category hidden on mobile + tablet */}
            <th className="hidden lg:table-cell px-3 py-3 text-left">Category</th>
            <th className="px-3 py-3 text-left">Status</th>
            {/* Created hidden on mobile */}
            <th className="hidden sm:table-cell px-3 py-3 text-left whitespace-nowrap">Created</th>
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
              <td className="hidden sm:table-cell px-3 py-3 text-gray-400 font-mono text-xs">{t.id}</td>
              <td className="px-3 py-3 font-medium text-gray-900">
                <div className="truncate max-w-[160px] sm:max-w-xs">{t.subject}</div>
                {/* Show customer email below subject on mobile */}
                <div className="md:hidden text-xs text-gray-400 mt-0.5 truncate">{t.customerEmail}</div>
              </td>
              <td className="hidden md:table-cell px-3 py-3 text-gray-600">
                <div className="truncate max-w-[140px]">{t.customerName}</div>
                <div className="text-xs text-gray-400 truncate max-w-[140px]">{t.customerEmail}</div>
              </td>
              <td className="hidden lg:table-cell px-3 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${CATEGORY_BADGE[t.category] ?? ''}`}>
                  {fmtLabel(t.category)}
                </span>
              </td>
              <td className="px-3 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_BADGE[t.status] ?? ''}`}>
                  {fmtLabel(t.status)}
                </span>
              </td>
              <td className="hidden sm:table-cell px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                {fmtDateShort(t.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── TicketDetailPanel ─────────────────────────────────────────────────────────
// On mobile  → full-screen fixed overlay
// On tablet+ → inline panel beside the table

function TicketDetailPanel({ ticket, loading, onClose, onUpdated, isMobile }) {
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

  const spinner = (
    <div className="flex items-center justify-center py-16 text-gray-400">
      <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      Loading…
    </div>
  );

  const panelContent = (
    <div className="flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100">
        <div className="flex-1 min-w-0 mr-3">
          <h2 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{ticket?.subject}</h2>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {ticket?.customerName} · #{ticket?.id}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={ticket?.status ?? ''}
            onChange={handleStatusChange}
            disabled={statusUpdating}
            className={`text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500
              ${STATUS_BADGE[ticket?.status] ?? 'bg-gray-100 text-gray-700'} border-transparent`}
          >
            {STATUSES.map(s => <option key={s} value={s}>{fmtLabel(s)}</option>)}
          </select>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1" aria-label="Close">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3 min-h-0">
        {loading ? spinner : ticket?.messages?.length > 0 ? (
          ticket.messages.map(msg => {
            const isRight = msg.senderType === 'AGENT' || msg.senderType === 'AI';
            const bubbleStyle =
              msg.senderType === 'AGENT' ? 'bg-blue-600 text-white rounded-br-sm' :
              msg.senderType === 'AI'    ? 'bg-purple-600 text-white rounded-br-sm' :
                                           'bg-gray-100 text-gray-800 rounded-bl-sm';
            const metaStyle =
              msg.senderType === 'AGENT' ? 'text-blue-200' :
              msg.senderType === 'AI'    ? 'text-purple-200' :
                                           'text-gray-400';
            const senderLabel =
              msg.senderType === 'AGENT' ? 'Admin' :
              msg.senderType === 'AI' ? (
                <span className="inline-flex items-center gap-1">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zM9 14a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>
                  </svg>
                  AI
                </span>
              ) : ticket.customerName;

            return (
              <div key={msg.id} className={`flex ${isRight ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm shadow-sm ${bubbleStyle}`}>
                  <p className="whitespace-pre-wrap">{msg.body}</p>
                  <p className={`text-xs mt-1 ${metaStyle}`}>
                    {senderLabel} · {fmtDate(msg.sentAt)}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-center text-gray-400 text-sm">No messages yet.</p>
        )}
        <div ref={threadEndRef} />
      </div>

      {/* Reply box */}
      <div className="px-4 sm:px-5 py-3 sm:py-4 border-t border-gray-100">
        <textarea
          rows={3}
          value={replyBody}
          onChange={e => setReplyBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleReply(); }}
          placeholder="Type your reply… (Ctrl/Cmd+Enter to send)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleReply}
            disabled={sending || !replyBody.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {sending ? 'Sending…' : 'Send Reply'}
          </button>
        </div>
      </div>
    </div>
  );

  // Mobile: fixed full-screen overlay
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-40 bg-white flex flex-col">
        {panelContent}
      </div>
    );
  }

  // Tablet / Desktop: inline panel
  return panelContent;
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

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      {/* Sheet on mobile, centered card on sm+ */}
      <div className="bg-white w-full sm:max-w-lg sm:mx-4 sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">New Ticket</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {/* Name + Email: 2-col on sm+, 1-col on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name *</label>
              <input type="text" value={form.customerName}
                onChange={e => setField('customerName', e.target.value)}
                className={inputCls} placeholder="Jane Smith" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer Email *</label>
              <input type="email" value={form.customerEmail}
                onChange={e => setField('customerEmail', e.target.value)}
                className={inputCls} placeholder="jane@example.com" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Subject *</label>
            <input type="text" value={form.subject}
              onChange={e => setField('subject', e.target.value)}
              className={inputCls} placeholder="Brief description of the issue" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select value={form.category} onChange={e => setField('category', e.target.value)}
              className={`${inputCls} bg-white`}>
              {CATEGORIES.map(c => <option key={c} value={c}>{fmtLabel(c)}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Message *</label>
            <textarea rows={4} value={form.body}
              onChange={e => setField('body', e.target.value)}
              className={`${inputCls} resize-none`}
              placeholder="Describe the customer's issue…" />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="text-sm px-4 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
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
  const [tickets, setTickets]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [filters, setFilters]           = useState({ status: '', category: '', keyword: '', from: '', to: '' });

  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage]   = useState(0);
  const [totalPages, setTotalPages]     = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [selectedTicket, setSelectedTicket]     = useState(null);
  const [detailLoading, setDetailLoading]       = useState(false);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);

  // Detect mobile (< 768px) to drive overlay vs inline panel
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const fetchTickets = useCallback(async (activeFilters, page) => {
    setLoading(true);
    setError('');
    try {
      const data = await getTickets({
        status:   activeFilters.status   || undefined,
        category: activeFilters.category || undefined,
        keyword:  activeFilters.keyword  || undefined,
        from:     activeFilters.from     || undefined,
        to:       activeFilters.to       || undefined,
        page,
        size: PAGE_SIZE,
      });
      setTickets(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTickets(filters, currentPage); }, [filters, currentPage, fetchTickets]);

  useEffect(() => {
    if (!selectedTicketId) { setSelectedTicket(null); return; }
    setDetailLoading(true);
    getTicket(selectedTicketId)
      .then(setSelectedTicket)
      .catch(e => setError(e.message))
      .finally(() => setDetailLoading(false));
  }, [selectedTicketId]);

  function handleSelectTicket(id) {
    setSelectedTicketId(prev => prev === id ? null : id);
  }

  function handleFilterChange(newFilters) {
    setCurrentPage(0);
    setFilters(newFilters);
  }

  function handleDetailUpdated(updatedTicket) {
    setSelectedTicket(updatedTicket);
    fetchTickets(filters, currentPage);
  }

  function handleTicketCreated(newTicket) {
    setCurrentPage(0);
    fetchTickets(filters, 0);
    setSelectedTicketId(newTicket.id);
  }

  // On tablet (md) the panel sits below the table; on desktop (lg) side-by-side
  const panelIsOpen = Boolean(selectedTicketId);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-5 sm:py-8">
        {/* Page header */}
        <div className="mb-4 sm:mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Support Tickets</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading ? 'Loading…' : `${totalElements} ticket${totalElements !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <FilterBar filters={filters} onChange={handleFilterChange} onNewTicket={() => setShowNewTicketModal(true)} />

        {/*
          Layout:
          - Mobile (< md):  table full-width; detail as fixed full-screen overlay
          - Tablet (md–lg): table full-width; detail panel below table
          - Desktop (lg+):  side-by-side (table 62%, detail 38%)
        */}
        <div className={`lg:flex lg:gap-4 ${panelIsOpen ? 'lg:items-start' : ''}`}>
          {/* Table column */}
          <div className={panelIsOpen ? 'lg:w-[62%] lg:shrink-0' : 'w-full'}>
            <TicketTable
              tickets={tickets}
              loading={loading}
              selectedId={selectedTicketId}
              onSelect={handleSelectTicket}
            />
          </div>

          {/* Detail panel — tablet: below table; desktop: beside table; mobile: overlay (handled inside component) */}
          {panelIsOpen && (
            <div
              className={`
                ${isMobile ? '' : 'mt-4 lg:mt-0 lg:flex-1 lg:min-w-0'}
              `}
              style={isMobile ? {} : { height: '70vh' }}
            >
              <TicketDetailPanel
                ticket={selectedTicket}
                loading={detailLoading}
                onClose={() => setSelectedTicketId(null)}
                onUpdated={handleDetailUpdated}
                isMobile={isMobile}
              />
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-1 flex-wrap gap-2">
            <p className="text-sm text-gray-500">
              Page {currentPage + 1} of {totalPages}
              <span className="hidden sm:inline ml-2 text-gray-400">
                ({currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, totalElements)} of {totalElements})
              </span>
            </p>

            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(0)} disabled={currentPage === 0}
                className="hidden sm:block px-2 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="First page">«</button>

              <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 0}
                className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                ‹ Prev
              </button>

              {/* Page pills — hidden on mobile */}
              {Array.from({ length: totalPages }, (_, i) => i)
                .filter(i => Math.abs(i - currentPage) <= 2)
                .map(i => (
                  <button key={i} onClick={() => setCurrentPage(i)}
                    className={`hidden sm:flex w-9 h-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                      i === currentPage ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}>
                    {i + 1}
                  </button>
                ))}

              <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                Next ›
              </button>

              <button onClick={() => setCurrentPage(totalPages - 1)} disabled={currentPage >= totalPages - 1}
                className="hidden sm:block px-2 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Last page">»</button>
            </div>
          </div>
        )}
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
