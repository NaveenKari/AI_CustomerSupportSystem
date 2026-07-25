import { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  BarChart, Bar,
  PieChart, Pie,
  XAxis, YAxis,
  Tooltip, Cell, Legend,
} from 'recharts'
import Navbar from '../components/Navbar'
import { getStats } from '../services/ticketService'

// ── Color maps ────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  NEW:           '#3b82f6',
  AI_RESPONDED:  '#8b5cf6',
  PENDING_HUMAN: '#f97316',
  IN_PROGRESS:   '#eab308',
  RESOLVED:      '#22c55e',
}

const CATEGORY_COLORS = {
  BILLING:         '#14b8a6',
  TECHNICAL:       '#6366f1',
  GENERAL_INQUIRY: '#06b6d4',
  OTHER:           '#94a3b8',
}

const SENDER_COLORS = {
  AGENT:    '#6366f1', // indigo — human agent
  AI:       '#8b5cf6', // violet — AI bot
  CUSTOMER: '#94a3b8', // slate  — inbound (shown separately for context)
}

const STATUS_LABELS = {
  NEW:           'New',
  AI_RESPONDED:  'AI Responded',
  PENDING_HUMAN: 'Pending Human',
  IN_PROGRESS:   'In Progress',
  RESOLVED:      'Resolved',
}

const CATEGORY_LABELS = {
  BILLING:         'Billing',
  TECHNICAL:       'Technical',
  GENERAL_INQUIRY: 'General Inquiry',
  OTHER:           'Other',
}

const SENDER_LABELS = {
  AGENT:    'Human Agent',
  AI:       'AI Bot',
  CUSTOMER: 'Customer',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatComputedAt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function mapToBarData(obj, labelMap, colorMap) {
  return Object.entries(obj).map(([key, value]) => ({
    name:  labelMap[key] ?? key,
    value,
    color: colorMap[key] ?? '#94a3b8',
  }))
}

function mapToPieData(obj, labelMap, colorMap) {
  return Object.entries(obj)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name:  labelMap[key] ?? key,
      value,
      color: colorMap[key] ?? '#94a3b8',
    }))
}

// Custom label shown inside pie slices — only rendered when slice is large enough
const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.07) return null
  const RAD = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + r * Math.cos(-midAngle * RAD)
  const y = cy + r * Math.sin(-midAngle * RAD)
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central"
          fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent = 'white', highlight = false }) {
  const bases = {
    white:  'bg-white text-gray-900',
    blue:   'bg-blue-50 text-blue-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    red:    'bg-red-50 text-red-700',
    green:  'bg-green-50 text-green-700',
  }
  return (
    <div className={`rounded-xl p-5 shadow-sm ${highlight ? bases[accent] : bases.white}`}>
      <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold ${highlight ? '' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl bg-white shadow-sm p-5 animate-pulse">
      <div className="h-2.5 bg-gray-200 rounded w-1/2 mb-3" />
      <div className="h-8 bg-gray-200 rounded w-1/3" />
    </div>
  )
}

function SkeletonChart() {
  return (
    <div className="rounded-xl bg-white shadow-sm p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-6" />
      <div className="h-52 bg-gray-100 rounded" />
    </div>
  )
}

function BarChartCard({ title, data }) {
  const hasData = data.some(d => d.value > 0)
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      {hasData ? (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }}
                   axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }}
                   axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: '#f3f4f6' }}
                     contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
      )}
    </div>
  )
}

function PieChartCard({ title, data, note }) {
  const hasData = data.length > 0
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-1">{title}</h3>
      {note && <p className="text-xs text-gray-400 mb-3">{note}</p>}
      {hasData ? (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name"
                 cx="50%" cy="50%" outerRadius={80}
                 labelLine={false} label={renderPieLabel}>
              {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
            <Legend iconType="circle" iconSize={10}
                    formatter={(value) => <span style={{ fontSize: 12, color: '#374151' }}>{value}</span>} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getStats()
      .then(data => { if (!cancelled) { setStats(data);  setLoading(false) } })
      .catch(err  => { if (!cancelled) { setError(err.message || 'Failed to load dashboard'); setLoading(false) } })
    return () => { cancelled = true }
  }, [retryCount])

  // ── Derived data ────────────────────────────────────────────────────────────
  const statusBarData   = stats ? mapToBarData(stats.byStatus,   STATUS_LABELS,   STATUS_COLORS)   : []
  const categoryBarData = stats ? mapToBarData(stats.byCategory, CATEGORY_LABELS, CATEGORY_COLORS) : []

  // Pie: AI vs Human responses (exclude CUSTOMER — those are inbound, not responses)
  const responsePieData = stats
    ? mapToPieData(
        { AGENT: stats.byResponseSender.AGENT, AI: stats.byResponseSender.AI },
        SENDER_LABELS, SENDER_COLORS)
    : []

  // Pie: Open vs Resolved (RESOLVED vs everything else)
  const openVsResolvedPieData = stats
    ? mapToPieData(
        {
          RESOLVED: stats.byStatus.RESOLVED,
          OPEN: Object.entries(stats.byStatus)
            .filter(([k]) => k !== 'RESOLVED')
            .reduce((sum, [, v]) => sum + v, 0),
        },
        { RESOLVED: 'Resolved', OPEN: 'Open' },
        { RESOLVED: '#22c55e', OPEN: '#f97316' })
    : []

  const resolutionRate = stats && stats.totalTickets > 0
    ? Math.round((stats.byStatus.RESOLVED / stats.totalTickets) * 100)
    : null

  const backlogCount  = stats?.openOlderThan24h ?? 0

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-1">
          <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
          {stats && (
            <p className="text-xs text-gray-400">
              Last updated: {formatComputedAt(stats.computedAt)}
            </p>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 flex items-center justify-between rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button onClick={() => setRetryCount(c => c + 1)}
                    className="ml-4 text-red-600 underline hover:text-red-800 font-medium">
              Retry
            </button>
          </div>
        )}

        {/* Summary Cards — 5 cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <StatCard label="Total Tickets"  value={stats?.totalTickets ?? 0} />
              <StatCard label="Tickets Today"  value={stats?.ticketsToday ?? 0}
                        accent="blue" highlight />
              <StatCard label="This Week"      value={stats?.ticketsThisWeek ?? 0}
                        accent="indigo" highlight />
              <StatCard
                label="Backlog › 24h"
                value={backlogCount}
                accent="red"
                highlight={backlogCount > 0}
                sub={backlogCount > 0 ? 'Needs attention' : 'All caught up'}
              />
              <StatCard
                label="Resolution Rate"
                value={resolutionRate !== null ? `${resolutionRate}%` : '—'}
                accent="green"
                highlight={resolutionRate !== null && resolutionRate >= 50}
                sub={resolutionRate !== null ? `${stats.byStatus.RESOLVED} resolved` : 'No tickets yet'}
              />
            </>
          )}
        </div>

        {/* Charts Row 1 — Bar charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {loading ? (
            <>
              <SkeletonChart />
              <SkeletonChart />
            </>
          ) : (
            <>
              <BarChartCard title="Tickets by Status"   data={statusBarData} />
              <BarChartCard title="Tickets by Category" data={categoryBarData} />
            </>
          )}
        </div>

        {/* Charts Row 2 — Pie charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {loading ? (
            <>
              <SkeletonChart />
              <SkeletonChart />
            </>
          ) : (
            <>
              <PieChartCard
                title="AI vs Human Responses"
                note="Messages sent by the AI bot vs. human agent (excludes inbound customer messages)"
                data={responsePieData}
              />
              <PieChartCard
                title="Open vs Resolved"
                note="Resolved tickets vs. all still-open tickets across every status"
                data={openVsResolvedPieData}
              />
            </>
          )}
        </div>

      </main>
    </div>
  )
}
