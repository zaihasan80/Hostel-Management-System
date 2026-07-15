'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  Users, Plus, Search, Download, Pencil, Trash2, X, Loader2,
  FileText, UserCheck, LogOut, BedDouble,
} from 'lucide-react'
import { useApp } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import { getStatusChipClass } from '@/components/furniture-icons'

type Student = {
  id: string
  fullName: string
  icMatricNo: string
  programme: string
  gender: string
  phoneNo: string | null
  email: string | null
  status: string
  currentAllocation: {
    id: string
    bedNo: string
    checkInDate: string
    room: {
      id: string
      roomNumber: string
      block: { id: string; blockCode: string; blockName: string }
    }
  } | null
  allocationHistory: Array<any>
}

type Block = { id: string; blockCode: string; blockName: string }
type RoomOption = { id: string; roomNumber: string; blockId: string }

export function StudentsView() {
  const { user, setView, setSelectedStudentId } = useApp()
  const { toast } = useToast()
  const [students, setStudents] = useState<Student[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [rooms, setRooms] = useState<RoomOption[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ blockId: '', roomId: '', search: '', status: '' })
  const [modal, setModal] = useState<null | { mode: 'create' | 'edit'; student?: Student }>(null)
  const [allocateModal, setAllocateModal] = useState<Student | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Student | null>(null)

  const canEdit = user?.role === 'Admin' || user?.role === 'Warden'

  useEffect(() => {
    fetch('/api/blocks').then(r => r.json()).then(d => setBlocks(d.blocks || []))
  }, [])

  // Load rooms when block filter changes
  useEffect(() => {
    if (filters.blockId) {
      fetch(`/api/rooms?blockId=${filters.blockId}`)
        .then(r => r.json())
        .then(d => setRooms((d.rooms || []).map((r: any) => ({ id: r.id, roomNumber: r.roomNumber, blockId: r.block.id }))))
    } else {
      setRooms([])
    }
  }, [filters.blockId])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.blockId) params.set('blockId', filters.blockId)
    if (filters.roomId) params.set('roomId', filters.roomId)
    if (filters.search) params.set('search', filters.search)
    if (filters.status) params.set('status', filters.status)
    fetch(`/api/students?${params.toString()}`)
      .then(r => r.json())
      .then(d => setStudents(d.students || []))
      .catch(() => toast({ title: 'Failed to load students', variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [filters])

  function exportCSV() {
    const headers = ['Name', 'Matric No.', 'Programme', 'Gender', 'Block', 'Room', 'Bed', 'Check-in', 'Status']
    const rows = students.map(s => [
      s.fullName, s.icMatricNo, s.programme, s.gender,
      s.currentAllocation?.room.block.blockCode || '—',
      s.currentAllocation?.room.roomNumber || '—',
      s.currentAllocation?.bedNo || '—',
      s.currentAllocation ? new Date(s.currentAllocation.checkInDate).toLocaleDateString() : '—',
      s.status,
    ])
    const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `students-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'CSV exported' })
  }

  async function handleSave(form: any) {
    const isEdit = modal?.mode === 'edit'
    const url = isEdit ? `/api/students/${modal?.student?.id}` : '/api/students'
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
    toast({ title: isEdit ? 'Student updated' : 'Student created' })
    setModal(null)
    setFilters(f => ({ ...f }))
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/students/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: 'Delete failed', description: data.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Student deleted' })
    setConfirmDelete(null)
    setFilters(f => ({ ...f }))
  }

  async function allocate(studentId: string, roomId: string, bedNo: string) {
    const res = await fetch('/api/allocations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, roomId, bedNo, checkInDate: new Date().toISOString().slice(0, 10) }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: 'Allocation failed', description: data.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Student allocated to room' })
    setAllocateModal(null)
    setFilters(f => ({ ...f }))
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white drop-shadow">Students by Block & Room</h1>
          <p className="text-white/80 text-sm">Cascading block → room filter, with current allocation details.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="btn-glass px-3 py-2 text-sm font-medium flex items-center gap-1.5">
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
              <Plus size={18} /> Add Student
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="glass p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#1B1F3B]/70 mb-1">Block</label>
            <select
              value={filters.blockId}
              onChange={e => setFilters(f => ({ ...f, blockId: e.target.value, roomId: '' }))}
              className="glass-input w-full px-3 py-2 text-sm"
            >
              <option value="">All Blocks</option>
              {blocks.map(b => <option key={b.id} value={b.id}>Block {b.blockCode} — {b.blockName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1B1F3B]/70 mb-1">Room</label>
            <select
              value={filters.roomId}
              onChange={e => setFilters(f => ({ ...f, roomId: e.target.value }))}
              className="glass-input w-full px-3 py-2 text-sm"
              disabled={!filters.blockId}
            >
              <option value="">All Rooms in Block</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.roomNumber}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1B1F3B]/70 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className="glass-input w-full px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="Active">Active</option>
              <option value="Checked-out">Checked-out</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1B1F3B]/70 mb-1">Search</label>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#1B1F3B]/50" />
              <input
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                placeholder="Name / matric / programme…"
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
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-[#1B1F3B]/60">
            <Users size={32} className="mx-auto mb-2 opacity-50" />
            No students match the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto scroll-glass">
            <table className="w-full text-sm min-w-[1000px]">
              <thead>
                <tr className="border-b border-[#1B1F3B]/15 text-left text-[#1B1F3B]/70 text-xs uppercase">
                  <th className="py-2.5 px-3 font-semibold">Name</th>
                  <th className="py-2.5 px-3 font-semibold">Matric No.</th>
                  <th className="py-2.5 px-3 font-semibold">Programme</th>
                  <th className="py-2.5 px-3 font-semibold">Gender</th>
                  <th className="py-2.5 px-3 font-semibold">Block</th>
                  <th className="py-2.5 px-3 font-semibold">Room / Bed</th>
                  <th className="py-2.5 px-3 font-semibold">Check-in</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id} className="border-b border-[#1B1F3B]/8 hover:bg-white/30">
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => { setSelectedStudentId(s.id); setView('student-detail') }}
                        className="font-semibold text-[#6C63FF] hover:underline"
                      >
                        {s.fullName}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-[#1B1F3B]/70">{s.icMatricNo}</td>
                    <td className="py-2.5 px-3 text-[#1B1F3B]/70 text-xs">{s.programme}</td>
                    <td className="py-2.5 px-3">{s.gender}</td>
                    <td className="py-2.5 px-3">
                      {s.currentAllocation ? (
                        <span className="font-medium text-[#1B1F3B]">{s.currentAllocation.room.block.blockCode}</span>
                      ) : (
                        <span className="text-[#1B1F3B]/40">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {s.currentAllocation ? (
                        <span className="inline-flex items-center gap-1">
                          <BedDouble size={12} className="text-[#6C63FF]" />
                          {s.currentAllocation.room.roomNumber} · {s.currentAllocation.bedNo}
                        </span>
                      ) : (
                        <span className="text-[#1B1F3B]/40">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-[#1B1F3B]/70">
                      {s.currentAllocation ? new Date(s.currentAllocation.checkInDate).toLocaleDateString('en-MY') : '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={getStatusChipClass(s.status)}>{s.status}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && !s.currentAllocation && s.status === 'Active' && (
                          <button
                            onClick={() => setAllocateModal(s)}
                            className="btn-glass px-2 py-1 text-xs flex items-center gap-1"
                            title="Allocate to room"
                          >
                            <UserCheck size={12} /> Allocate
                          </button>
                        )}
                        {canEdit && (
                          <>
                            <button
                              onClick={() => setModal({ mode: 'edit', student: s })}
                              className="btn-glass p-1.5"
                              title="Edit"
                            >
                              <Pencil size={13} />
                            </button>
                            {user?.role === 'Admin' && (
                              <button
                                onClick={() => setConfirmDelete(s)}
                                className="btn-glass p-1.5 text-[#E85C5C]"
                                title="Delete"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </>
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
        <StudentModal
          mode={modal.mode}
          student={modal.student}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {allocateModal && (
        <AllocateModal
          student={allocateModal}
          blocks={blocks}
          onClose={() => setAllocateModal(null)}
          onAllocate={allocate}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Student"
          message={`Delete ${confirmDelete.fullName} (${confirmDelete.icMatricNo})? This is permanent.`}
          confirmLabel="Delete"
          danger
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete.id)}
        />
      )}
    </div>
  )
}

function StudentModal({
  mode, student, onClose, onSave,
}: {
  mode: 'create' | 'edit'
  student?: Student
  onClose: () => void
  onSave: (form: any) => void
}) {
  const [form, setForm] = useState({
    fullName: student?.fullName || '',
    icMatricNo: student?.icMatricNo || '',
    programme: student?.programme || '',
    gender: student?.gender || 'Male',
    phoneNo: student?.phoneNo || '',
    email: student?.email || '',
    status: student?.status || 'Active',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="glass-light w-full max-w-lg p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#1B1F3B]">
            {mode === 'create' ? 'Add New Student' : `Edit ${student?.fullName}`}
          </h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave(form) }} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Full Name</label>
            <input required maxLength={150} value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} className="glass-input w-full px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">IC / Matric No.</label>
              <input required maxLength={30} value={form.icMatricNo} onChange={e => setForm(f => ({ ...f, icMatricNo: e.target.value.toUpperCase() }))} className="glass-input w-full px-3 py-2 text-sm" placeholder="JTM2026-0011" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Gender</label>
              <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className="glass-input w-full px-3 py-2 text-sm">
                <option>Male</option>
                <option>Female</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Programme</label>
            <input required maxLength={100} value={form.programme} onChange={e => setForm(f => ({ ...f, programme: e.target.value }))} className="glass-input w-full px-3 py-2 text-sm" placeholder="Dip. Kejuruteraan Awam" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Phone</label>
              <input maxLength={20} value={form.phoneNo} onChange={e => setForm(f => ({ ...f, phoneNo: e.target.value }))} className="glass-input w-full px-3 py-2 text-sm" placeholder="+6012-345 6789" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="glass-input w-full px-3 py-2 text-sm">
                <option>Active</option>
                <option>Checked-out</option>
                <option>Suspended</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Email (optional)</label>
            <input type="email" maxLength={254} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="glass-input w-full px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-glass px-4 py-2 text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#6C63FF] text-white font-semibold hover:bg-[#5b52e0] text-sm">Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AllocateModal({
  student, blocks, onClose, onAllocate,
}: {
  student: Student
  blocks: Block[]
  onClose: () => void
  onAllocate: (studentId: string, roomId: string, bedNo: string) => void
}) {
  const [blockId, setBlockId] = useState(blocks[0]?.id || '')
  const [rooms, setRooms] = useState<RoomOption[]>([])
  const [roomId, setRoomId] = useState('')
  const [bedNo, setBedNo] = useState('Bed-1')

  useEffect(() => {
    if (blockId) {
      fetch(`/api/rooms?blockId=${blockId}&status=Occupied`)
        .then(r => r.json())
        .then(d => {
          // include Available + Occupied rooms (not Full, not Maintenance)
          const filtered = (d.rooms || []).filter((r: any) => r.status !== 'Full' && r.status !== 'Maintenance')
          setRooms(filtered.map((r: any) => ({ id: r.id, roomNumber: r.roomNumber, blockId: r.block.id, capacity: r.capacity, currentOccupancy: r.currentOccupancy })))
        })
    } else {
      setRooms([])
    }
    setRoomId('')
  }, [blockId])

  const selectedRoom: any = rooms.find(r => r.id === roomId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="glass-light w-full max-w-md p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#1B1F3B]">Allocate Room</h2>
            <p className="text-xs text-[#1B1F3B]/70">{student.fullName} · {student.icMatricNo}</p>
          </div>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (roomId && bedNo) onAllocate(student.id, roomId, bedNo) }} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Block</label>
            <select value={blockId} onChange={e => setBlockId(e.target.value)} className="glass-input w-full px-3 py-2 text-sm">
              {blocks.map(b => <option key={b.id} value={b.id}>Block {b.blockCode} — {b.blockName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Room (with available beds)</label>
            <select required value={roomId} onChange={e => setRoomId(e.target.value)} className="glass-input w-full px-3 py-2 text-sm">
              <option value="">Select room…</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>
                  {r.roomNumber} — {r.currentOccupancy}/{r.capacity} occupied
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Bed No.</label>
            <input required maxLength={10} value={bedNo} onChange={e => setBedNo(e.target.value)} className="glass-input w-full px-3 py-2 text-sm" placeholder="Bed-1" />
            {selectedRoom && (
              <p className="text-[11px] text-[#1B1F3B]/60 mt-1">
                {selectedRoom.currentOccupancy}/{selectedRoom.capacity} occupied — {selectedRoom.capacity - selectedRoom.currentOccupancy} bed(s) free
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-glass px-4 py-2 text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#6C63FF] text-white font-semibold hover:bg-[#5b52e0] text-sm">Allocate</button>
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
