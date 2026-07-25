const BASE = 'http://localhost:8080/api/tickets';

const jsonOpts = {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
};

/**
 * Fetch a paginated ticket list with optional filters.
 * @param {Object} opts
 * @param {string} [opts.status]   - TicketStatus enum string e.g. "NEW"
 * @param {string} [opts.category] - TicketCategory enum string e.g. "BILLING"
 * @param {string} [opts.keyword]  - searches subject and customerEmail
 * @param {string} [opts.from]     - ISO date "YYYY-MM-DD"
 * @param {string} [opts.to]       - ISO date "YYYY-MM-DD"
 * @param {number} [opts.page=0]   - zero-based page index
 * @param {number} [opts.size=10]  - page size
 * @returns {Promise<SpringPage<TicketSummaryResponse>>} Spring Page object with content[], totalElements, totalPages, number
 */
export async function getTickets({ status, category, keyword, from, to, page = 0, size = 10 } = {}) {
  const params = new URLSearchParams();
  if (status)            params.set('status', status);
  if (category)          params.set('category', category);
  if (keyword)           params.set('keyword', keyword);
  if (from)              params.set('from', from);
  if (to)                params.set('to', to);
  params.set('page', page);
  params.set('size', size);

  const res = await fetch(`${BASE}?${params}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch tickets');
  return res.json();
}

/**
 * Fetch a single ticket with its full message thread.
 * @param {number} id
 * @returns {Promise<TicketDetailResponse>}
 */
export async function getTicket(id) {
  const res = await fetch(`${BASE}/${id}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch ticket');
  return res.json();
}

/**
 * Create a new ticket manually.
 * @param {{ subject: string, customerEmail: string, customerName: string, body: string, category: string }} data
 * @returns {Promise<TicketDetailResponse>}
 */
export async function createTicket(data) {
  const res = await fetch(BASE, {
    ...jsonOpts,
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create ticket');
  }
  return res.json();
}

/**
 * Add an agent reply to a ticket.
 * senderType is derived server-side — always AGENT when the admin replies.
 * @param {number} id
 * @param {string} body
 * @returns {Promise<TicketDetailResponse>}
 */
export async function replyToTicket(id, body) {
  const res = await fetch(`${BASE}/${id}/messages`, {
    ...jsonOpts,
    method: 'POST',
    body: JSON.stringify({ body }),
  });
  if (!res.ok) throw new Error('Failed to send reply');
  return res.json();
}

/**
 * Update the status of a ticket.
 * @param {number} id
 * @param {string} status - TicketStatus enum string e.g. "RESOLVED"
 * @returns {Promise<TicketSummaryResponse>}
 */
export async function updateTicketStatus(id, status) {
  const res = await fetch(`${BASE}/${id}/status`, {
    ...jsonOpts,
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update status');
  return res.json();
}

/**
 * Fetch the latest pre-computed dashboard metrics snapshot.
 * @returns {Promise<DashboardStatsResponse>}
 *   { totalTickets, ticketsToday, ticketsThisWeek, openOlderThan24h,
 *     computedAt, byStatus, byCategory }
 */
export async function getStats() {
  const res = await fetch(`${BASE}/stats`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return res.json();
}
