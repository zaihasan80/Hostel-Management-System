'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  DoorOpen, Plus, Search, Download, Pencil, Trash2, X, Loader2,
  ArrowUpDown, FileText, LayoutGrid, AlertTriangle,
} from 'lucide-react'
import { useApp } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import { getStatusChipClass } from '@/components/furniture-icons'

type Room = {
  id: string
  roomNumber: string
  floorNumber: number
  roomType: string
  capacity: number
  status: string
  lastInspectionDate: string | null
  notes: string | null
  block: { id: string; blockCode: string; blockName: string; genderType: string }
  currentOccupancy: number
  vacantBeds: number
  hasMaintenanceIssue: boolean
  tenants: Array<{ id: string; name: string; matric: string; bedNo: string; checkInDate: string }>
}

type Block = {
  id: string
  blockCode: string
  blockName: string
  genderType: string
}

const STATUS_OPTIONS = ['Available', 'Occupied', 'Full', 'Maintenance']
const TYPE_OPTIONS = ['Single', 'Double', 'Dormitory']
type SortKey = 'roomNumber' | 'floorNumber' | 'capacity' | 'currentOccupancy' | 'status'

export function RoomsView() {
  const { user, setView, setSelectedRoomId } = useApp()
  const { toast } = useToast()
  const [rooms, setRooms] = useState<Room[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    blockId: '',
    status: '',
    roomType: '',
    search: '',
  })
  const [sortKey, setSortKey] = useState<SortKey>('roomNumber')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [modal, setModal] = useState<null | { mode: 'create' | 'edit'; room?: Room }>(null)
  const [confirmDelete, setConfirmDelete] = useState<Room | null>(null)

  const isAdmin = user?.role === 'Admin'
  const canEdit = user?.role === 'Admin' || user?.role === 'Warden'

  useEffect(() => {
    fetch('/api/blocks').then(r => r.json()).then(d => setBlocks(d.blocks || [])).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.blockId) params.set('blockId', filters.blockId)
    if (filters.status) params.set('status', filters.status)
    if (filters.roomType) params.set('roomType', filters.roomType)
    if (filters.search) params.set('search', filters.search)
    fetch(`/api/rooms?${params.toString()}`)
      .then(r => r.json())
      .then(d => setRooms(d.rooms || []))
      .catch(() => toast({ title: 'Failed to load rooms', variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [filters])

  const sortedRooms = useMemo(() => {
    const arr = [...rooms]
    arr.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'roomNumber') cmp = a.roomNumber.localeCompare(b.roomNumber)
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status)
      else cmp = (a[sortKey] as number) - (b[sortKey] as number)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [rooms, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const summary = useMemo(() => {
    const total = rooms.length
    const cap = rooms.reduce((s, r) => s + r.capacity, 0)
    const occ = rooms.reduce((s, r) => s + r.currentOccupancy, 0)
    return { total, cap, occ, vacant: cap - occ }
  }, [rooms])

  function exportCSV() {
    const headers = ['Room No', 'Block', 'Floor', 'Type', 'Capacity', 'Occupancy', 'Status', 'Last Inspection']
    const rows = sortedRooms.map(r => [
      r.roomNumber, r.block.blockCode, r.floorNumber, r.roomType,
      r.capacity, r.currentOccupancy, r.status,
      r.lastInspectionDate ? new Date(r.lastInspectionDate).toLocaleDateString() : '—',
    ])
    const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rooms-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'CSV exported', description: `${rows.length} rows downloaded` })
  }

  function printReport() {
    window.print()
    toast({ title: 'Opening print dialog…' })
  }

  async function handleSave(form: any) {
    const isEdit = modal?.mode === 'edit'
    const url = isEdit ? `/api/rooms/${modal?.room?.id}` : '/api/rooms'
    const method = isEdit ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: 'Save failed', description: data.error, variant: 'destructive' })
      return
    }
    toast({ title: isEdit ? 'Room updated' : 'Room created' })
    setModal(null)
    setFilters(f => ({ ...f })) // trigger reload
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/rooms/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: 'Delete failed', description: data.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Room deleted' })
    setConfirmDelete(null)
    setFilters(f => ({ ...f }))
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white drop-shadow">Rooms by Block</h1>
          <p className="text-white/80 text-sm">Filterable, sortable room list with status chips and inventory flags.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={printReport} className="btn-glass px-3 py-2 text-sm font-medium flex items-center gap-1.5">
            <FileText size={16} /> Print
          </button>
          <button onClick={exportCSV} className="btn-glass px-3 py-2 text-sm font-medium flex items-center gap-1.5">
            <Download size={16} /> CSV
          </button>
          {canEdit && (
            <button
              onClick={() => setModal({ mode: 'create' })}
              className="px-4 py-2 rounded-xl bg-[#6C63FF] text-white font-semibold shadow-lg hover:bg-[#5b52e0] transition-all hover-lift flex items-center gap-2"
            >
              <Plus size={18} /> Add Room
            </button>
          )}
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Rooms', value: summary.total, color: '#6C63FF' },
          { label: 'Total Capacity', value: summary.cap, color: '#1B1F3B' },
          { label: 'Occupied', value: summary.occ, color: '#2EC4B6' },
          { label: 'Vacant', value: summary.vacant, color: '#F5A623' },
        ].map(c => (
          <div key={c.label} className="glass p-3 text-center">
            <div className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</div>
            <div className="text-[10px] text-[#1B1F3B]/70 uppercase tracking-wide">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#1B1F3B]/70 mb-1">Block</label>
            <select
              value={filters.blockId}
              onChange={e => setFilters(f => ({ ...f, blockId: e.target.value }))}
              className="glass-input w-full px-3 py-2 text-sm"
            >
              <option value="">All Blocks</option>
              {blocks.map(b => (
                <option key={b.id} value={b.id}>Block {b.blockCode} — {b.blockName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1B1F3B]/70 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className="glass-input w-full px-3 py-2 text-sm"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1B1F3B]/70 mb-1">Room Type</label>
            <select
              value={filters.roomType}
              onChange={e => setFilters(f => ({ ...f, roomType: e.target.value }))}
              className="glass-input w-full px-3 py-2 text-sm"
            >
              <option value="">All Types</option>
              {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1B1F3B]/70 mb-1">Search</label>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#1B1F3B]/50" />
              <input
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                placeholder="Room no…"
                className="glass-input w-full pl-8 pr-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass p-4">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="animate-spin text-[#1B1F3B]" size={28} />
          </div>
        ) : sortedRooms.length === 0 ? (
          <div className="p-12 text-center text-[#1B1F3B]/60">
            <DoorOpen size={32} className="mx-auto mb-2 opacity-50" />
            No rooms match the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto scroll-glass">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-[#1B1F3B]/15 text-left text-[#1B1F3B]/70 text-xs uppercase">
                  <th className="py-2.5 px-3 font-semibold">
                    <button onClick={() => toggleSort('roomNumber')} className="flex items-center gap-1 hover:text-[#1B1F3B]">
                      Room No <ArrowUpDown size={11} />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 font-semibold">Block</th>
                  <th className="py-2.5 px-3 font-semibold">
                    <button onClick={() => toggleSort('floorNumber')} className="flex items-center gap-1 hover:text-[#1B1F3B]">
                      Floor <ArrowUpDown size={11} />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 font-semibold">Type</th>
                  <th className="py-2.5 px-3 font-semibold">
                    <button onClick={() => toggleSort('capacity')} className="flex items-center gap-1 hover:text-[#1B1F3B]">
                      Cap <ArrowUpDown size={11} />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 font-semibold">
                    <button onClick={() => toggleSort('currentOccupancy')} className="flex items-center gap-1 hover:text-[#1B1F3B]">
                      Occupancy <ArrowUpDown size={11} />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 font-semibold">
                    <button onClick={() => toggleSort('status')} className="flex items-center gap-1 hover:text-[#1B1F3B]">
                      Status <ArrowUpDown size={11} />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 font-semibold">Last Inspected</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedRooms.map(r => (
                  <tr key={r.id} className="border-b border-[#1B1F3B]/8 hover:bg-white/30 transition-colors">
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => { setSelectedRoomId(r.id); setView('room-detail') }}
                        className="font-semibold text-[#6C63FF] hover:underline"
                      >
                        {r.roomNumber}
                      </button>
                      {r.hasMaintenanceIssue && (
                        <AlertTriangle size={12} className="inline ml-1 text-[#F5A623]" />
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-[#1B1F3B]">{r.block.blockCode}</span>
                      <span className="text-[#1B1F3B]/50 text-xs ml-1">· {r.block.genderType[0]}</span>
                    </td>
                    <td className="py-2.5 px-3">{r.floorNumber}</td>
                    <td className="py-2.5 px-3">{r.roomType}</td>
                    <td className="py-2.5 px-3">{r.capacity}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#1B1F3B]">{r.currentOccupancy}/{r.capacity}</span>
                        <div className="w-16 h-1.5 bg-[#1B1F3B]/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#6C63FF] to-[#2EC4B6]"
                            style={{ width: `${r.capacity > 0 ? (r.currentOccupancy / r.capacity) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={getStatusChipClass(r.status)}>{r.status}</span>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-[#1B1F3B]/70">
                      {r.lastInspectionDate ? new Date(r.lastInspectionDate).toLocaleDateString('en-MY') : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setSelectedRoomId(r.id); setView('room-detail') }}
                          className="btn-glass p-1.5"
                          title="View layout"
                        >
                          <LayoutGrid size={13} />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => setModal({ mode: 'edit', room: r })}
                            className="btn-glass p-1.5"
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => setConfirmDelete(r)}
                            className="btn-glass p-1.5 text-[#E85C5C]"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <RoomModal
          mode={modal.mode}
          room={modal.room}
          blocks={blocks}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Room"
          message={`Delete room ${confirmDelete.roomNumber}? Make sure no students are currently allocated.`}
          confirmLabel="Delete"
          danger
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete.id)}
        />
      )}
    </div>
  )
}

function RoomModal({
  mode, room, blocks, onClose, onSave,
}: {
  mode: 'create' | 'edit'
  room?: Room
  blocks: Block[]
  onClose: () => void
  onSave: (form: any) => void
}) {
  const [form, setForm] = useState({
    blockId: room?.block.id || blocks[0]?.id || '',
    roomNumber: room?.roomNumber || '',
    floorNumber: room?.floorNumber?.toString() || '1',
    roomType: room?.roomType || 'Double',
    capacity: room?.capacity?.toString() || '2',
    status: room?.status || 'Available',
    lastInspectionDate: room?.lastInspectionDate ? room.lastInspectionDate.slice(0, 10) : '',
    notes: room?.notes || '',
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="glass-light w-full max-w-lg p-6 animate-fade-in max-h-[90vh] overflow-y-auto scroll-glass">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#1B1F3B]">
            {mode === 'create' ? 'Add New Room' : `Edit Room ${room?.roomNumber}`}
          </h2>
          <button onClick={onClose} className="text-[#1B1F3B]/60 hover:text-[#1B1F3B]">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Block</label>
              <select
                required
                value={form.blockId}
                onChange={e => setForm(f => ({ ...f, blockId: e.target.value }))}
                className="glass-input w-full px-3 py-2 text-sm"
                disabled={mode === 'edit'}
              >
                {blocks.map(b => (
                  <option key={b.id} value={b.id}>Block {b.blockCode} — {b.blockName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Room Number</label>
              <input
                required
                maxLength={10}
                value={form.roomNumber}
                onChange={e => setForm(f => ({ ...f, roomNumber: e.target.value.toUpperCase() }))}
                placeholder="A-101"
                className="glass-input w-full px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Floor</label>
              <input
                required
                type="number"
                min={1}
                max={50}
                value={form.floorNumber}
                onChange={e => setForm(f => ({ ...f, floorNumber: e.target.value }))}
                className="glass-input w-full px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Room Type</label>
              <select
                value={form.roomType}
                onChange={e => setForm(f => ({ ...f, roomType: e.target.value }))}
                className="glass-input w-full px-3 py-2 text-sm"
              >
                {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Capacity</label>
              <input
                required
                type="number"
                min={1}
                max={20}
                value={form.capacity}
                onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                className="glass-input w-full px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="glass-input w-full px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Last Inspection Date</label>
            <input
              type="date"
              value={form.lastInspectionDate}
              onChange={e => setForm(f => ({ ...f, lastInspectionDate: e.target.value }))}
              className="glass-input w-full px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Notes</label>
            <textarea
              rows={2}
              maxLength={500}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="glass-input w-full px-3 py-2 text-sm resize-none"
              placeholder="Optional notes"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-glass px-4 py-2 text-sm">Cancel</button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#6C63FF] text-white font-semibold hover:bg-[#5b52e0] text-sm"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ConfirmDialog({
  title, message, confirmLabel, danger, onCancel, onConfirm,
}: {
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="glass-light w-full max-w-sm p-6 animate-fade-in">
        <h2 className="text-lg font-bold text-[#1B1F3B] mb-2">{title}</h2>
        <p className="text-sm text-[#1B1F3B]/70 mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="btn-glass px-4 py-2 text-sm">Cancel</button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-white font-semibold text-sm ${
              danger ? 'bg-[#E85C5C] hover:bg-[#d44747]' : 'bg-[#6C63FF] hover:bg-[#5b52e0]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
