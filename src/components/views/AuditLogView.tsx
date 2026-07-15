'use client'

import { useEffect, useState } from 'react'
import { ScrollText, Loader2, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { useApp } from '@/lib/store'

type AuditEntry = {
  id: string
  action: string
  entity: string
  entityId: string | null
  details: string | null
  severity: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  user: { email: string; fullName: string; role: string } | null
}

export function AuditLogView() {
  const { user } = useApp()
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [filters, setFilters] = useState({ action: '', entity: '', severity: '' })
  const limit = 50

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('limit', limit.toString())
    params.set('offset', offset.toString())
    if (filters.action) params.set('action', filters.action)
    if (filters.entity) params.set('entity', filters.entity)
    if (filters.severity) params.set('severity', filters.severity)
    fetch(`/api/audit-log?${params.toString()}`)
      .then(r => r.json())
      .then(d => {
        setLogs(d.logs || [])
        setTotal(d.total || 0)
      })
      .finally(() => setLoading(false))
  }, [offset, filters])

  if (user?.role !== 'Admin' && user?.role !== 'Management') {
    return (
      <div className="glass p-8 text-center text-[#1B1F3B]">
        <ScrollText size={32} className="mx-auto mb-2 opacity-50" />
        <p>You don't have permission to view the audit log.</p>
      </div>
    )
  }

  const severityColor = (s: string) => {
    if (s === 'critical') return 'chip chip-full'
    if (s === 'warning') return 'chip chip-maintenance'
    return 'chip chip-available'
  }

  const actionColor = (a: string) => {
    if (a.startsWith('LOGIN') || a === 'LOGOUT') return 'chip chip-occupied'
    if (a === 'CREATE') return 'chip chip-available'
    if (a === 'UPDATE') return 'chip chip-maintenance'
    if (a === 'DELETE') return 'chip chip-full'
    if (a === 'SYSTEM_INIT') return 'chip chip-checkedout'
    return 'chip'
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white drop-shadow">Audit Log</h1>
        <p className="text-white/80 text-sm">
          Immutable record of all create/update/delete and authentication events. {total} total entries.
        </p>
      </div>

      {/* Filters */}
      <div className="glass p-4">
        <div className="flex items-center gap-2 mb-2 text-[#1B1F3B]/80 text-xs font-semibold">
          <Filter size={14} /> Filters
        </div>
        <div className="grid grid-cols-3 gap-3">
          <select value={filters.action} onChange={e => { setFilters(f => ({ ...f, action: e.target.value })); setOffset(0) }} className="glass-input px-3 py-2 text-sm">
            <option value="">All Actions</option>
            {['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'LOGIN_BLOCKED', 'PW_CHANGE', 'PW_CHANGE_FAILED', 'SYSTEM_INIT'].map(a => <option key={a}>{a}</option>)}
          </select>
          <select value={filters.entity} onChange={e => { setFilters(f => ({ ...f, entity: e.target.value })); setOffset(0) }} className="glass-input px-3 py-2 text-sm">
            <option value="">All Entities</option>
            {['Block', 'Room', 'Student', 'Allocation', 'User', 'Furniture', 'RoomFurniture', 'Auth', 'System'].map(e => <option key={e}>{e}</option>)}
          </select>
          <select value={filters.severity} onChange={e => { setFilters(f => ({ ...f, severity: e.target.value })); setOffset(0) }} className="glass-input px-3 py-2 text-sm">
            <option value="">All Severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      <div className="glass p-4">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="animate-spin text-[#1B1F3B]" size={28} />
          </div>
        ) : (
          <div className="overflow-x-auto scroll-glass">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-[#1B1F3B]/15 text-left text-[#1B1F3B]/70 text-xs uppercase">
                  <th className="py-2.5 px-3 font-semibold">Time</th>
                  <th className="py-2.5 px-3 font-semibold">User</th>
                  <th className="py-2.5 px-3 font-semibold">Action</th>
                  <th className="py-2.5 px-3 font-semibold">Entity</th>
                  <th className="py-2.5 px-3 font-semibold">Details</th>
                  <th className="py-2.5 px-3 font-semibold">Severity</th>
                  <th className="py-2.5 px-3 font-semibold">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} className="border-b border-[#1B1F3B]/8 hover:bg-white/30">
                    <td className="py-2 px-3 text-xs text-[#1B1F3B]/70 whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString('en-MY', { dateStyle: 'short', timeStyle: 'medium' })}
                    </td>
                    <td className="py-2 px-3">
                      {l.user ? (
                        <>
                          <div className="font-medium text-[#1B1F3B] text-xs">{l.user.fullName}</div>
                          <div className="text-[10px] text-[#1B1F3B]/60">{l.user.role}</div>
                        </>
                      ) : (
                        <span className="text-[#1B1F3B]/40 text-xs">system</span>
                      )}
                    </td>
                    <td className="py-2 px-3"><span className={actionColor(l.action)}>{l.action}</span></td>
                    <td className="py-2 px-3 text-xs font-medium text-[#1B1F3B]">{l.entity}</td>
                    <td className="py-2 px-3 text-xs text-[#1B1F3B]/80 max-w-xs">{l.details}</td>
                    <td className="py-2 px-3"><span className={severityColor(l.severity)}>{l.severity}</span></td>
                    <td className="py-2 px-3 text-[10px] text-[#1B1F3B]/50 font-mono">{l.ipAddress || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 text-xs text-[#1B1F3B]/70">
          <span>
            Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={offset === 0}
              onClick={() => setOffset(o => Math.max(0, o - limit))}
              className="btn-glass p-1.5 disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              disabled={offset + limit >= total}
              onClick={() => setOffset(o => o + limit)}
              className="btn-glass p-1.5 disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
