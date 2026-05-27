const BASE = 'http://localhost:8080/api/tickets';

const jsonOpts = {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
};

/**
 * Fetch ticket list with optional filters.
 * @param {Object} filters
 * @param {string} [filters.status]   - TicketStatus enum string e.g. "NEW"
 * @param {string} [filters.category] - TicketCategory enum string e.g. "BILLING"
 * @param {string} [filters.keyword]  - searches subject and customerEmail
 * @param {string} [filters.from]     - ISO date "YYYY-MM-DD"
 * @param {string} [filters.to]       - ISO date "YYYY-MM-DD"
 * @returns {Promise<TicketSummaryResponse[]>}
 */
export async function getTickets({ status, category, keyword, from, to } = {}) {
  const params = new URLSearchParams();
  if (status)   params.set('status', status);
  if (category) params.set('category', category);
  if (keyword)  params.set('keyword', keyword);
  if (from)     params.set('from', from);
  if (to)       params.set('to', to);

  const url = params.toString() ? `${BASE}?${params}` : BASE;
  const res = await fetch(url, { credentials: 'include' });
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
