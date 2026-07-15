'use client'

import { useEffect, useState } from 'react'
import { Building2, Plus, Pencil, Trash2, X, Loader2, Users, DoorOpen } from 'lucide-react'
import { useApp } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'

type Block = {
  id: string
  blockCode: string
  blockName: string
  totalFloors: number
  genderType: string
  createdAt: string
  roomCount: number
  totalCapacity: number
  totalOccupied: number
  totalVacant: number
  wardenCount: number
}

const GENDER_TYPES = ['Male', 'Female', 'Mixed']

export function BlocksView() {
  const { user, setView } = useApp()
  const { toast } = useToast()
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null | { mode: 'create' | 'edit'; block?: Block }>(null)
  const [confirmDelete, setConfirmDelete] = useState<Block | null>(null)

  const isAdmin = user?.role === 'Admin'

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/blocks')
      const data = await res.json()
      if (res.ok) setBlocks(data.blocks)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleSave(form: {
    blockCode: string
    blockName: string
    totalFloors: number
    genderType: string
  }) {
    const isEdit = modal?.mode === 'edit'
    const url = isEdit ? `/api/blocks/${modal?.block?.id}` : '/api/blocks'
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
    toast({ title: isEdit ? 'Block updated' : 'Block created', description: `${form.blockCode} — ${form.blockName}` })
    setModal(null)
    load()
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/blocks/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: 'Delete failed', description: data.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Block deleted' })
    setConfirmDelete(null)
    load()
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white drop-shadow">Block Management</h1>
          <p className="text-white/80 text-sm">Create and manage hostel blocks (asrama).</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setModal({ mode: 'create' })}
            className="px-4 py-2 rounded-xl bg-[#6C63FF] text-white font-semibold shadow-lg hover:bg-[#5b52e0] transition-all hover-lift flex items-center gap-2"
          >
            <Plus size={18} /> Add Block
          </button>
        )}
      </div>

      {/* Blocks grid */}
      {loading ? (
        <div className="glass p-12 flex items-center justify-center">
          <Loader2 className="animate-spin text-[#1B1F3B]" size={28} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {blocks.map(b => (
            <div key={b.id} className="glass p-5 hover-lift">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#2EC4B6] flex items-center justify-center text-white font-bold text-lg">
                    {b.blockCode}
                  </div>
                  <div>
                    <div className="font-semibold text-[#1B1F3B]">{b.blockName}</div>
                    <div className="text-xs text-[#1B1F3B]/60">{b.totalFloors} floor(s) · {b.genderType}</div>
                  </div>
                </div>
                <span className={`chip ${
                  b.genderType === 'Male' ? 'chip-occupied' :
                  b.genderType === 'Female' ? 'chip-available' :
                  'chip-maintenance'
                }`}>{b.genderType}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 mb-4 text-center">
                <div className="bg-white/40 rounded-lg p-2">
                  <DoorOpen size={14} className="mx-auto text-[#6C63FF]" />
                  <div className="font-bold text-[#1B1F3B] text-sm mt-1">{b.roomCount}</div>
                  <div className="text-[10px] text-[#1B1F3B]/60 uppercase">Rooms</div>
                </div>
                <div className="bg-white/40 rounded-lg p-2">
                  <Users size={14} className="mx-auto text-[#2EC4B6]" />
                  <div className="font-bold text-[#1B1F3B] text-sm mt-1">{b.totalOccupied}/{b.totalCapacity}</div>
                  <div className="text-[10px] text-[#1B1F3B]/60 uppercase">Beds</div>
                </div>
                <div className="bg-white/40 rounded-lg p-2">
                  <Building2 size={14} className="mx-auto text-[#F5A623]" />
                  <div className="font-bold text-[#1B1F3B] text-sm mt-1">{b.wardenCount}</div>
                  <div className="text-[10px] text-[#1B1F3B]/60 uppercase">Wardens</div>
                </div>
              </div>

              {/* Occupancy bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-[#1B1F3B]/70 mb-1">
                  <span>Occupancy</span>
                  <span>{b.totalCapacity > 0 ? Math.round((b.totalOccupied / b.totalCapacity) * 100) : 0}%</span>
                </div>
                <div className="w-full h-2 bg-[#1B1F3B]/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#6C63FF] to-[#2EC4B6]"
                    style={{ width: `${b.totalCapacity > 0 ? (b.totalOccupied / b.totalCapacity) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setView('rooms'); /* could pass blockId via state */ }}
                  className="flex-1 btn-glass py-1.5 text-xs font-semibold"
                >
                  View Rooms →
                </button>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => setModal({ mode: 'edit', block: b })}
                      className="btn-glass p-1.5"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(b)}
                      className="btn-glass p-1.5 text-[#E85C5C]"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <BlockModal
          mode={modal.mode}
          block={modal.block}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Block"
          message={`Are you sure you want to delete ${confirmDelete.blockName}? This action is logged.`}
          confirmLabel="Delete"
          danger
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete.id)}
        />
      )}
    </div>
  )
}

function BlockModal({
  mode, block, onClose, onSave,
}: {
  mode: 'create' | 'edit'
  block?: Block
  onClose: () => void
  onSave: (form: { blockCode: string; blockName: string; totalFloors: number; genderType: string }) => void
}) {
  const [blockCode, setBlockCode] = useState(block?.blockCode || '')
  const [blockName, setBlockName] = useState(block?.blockName || '')
  const [totalFloors, setTotalFloors] = useState(block?.totalFloors?.toString() || '3')
  const [genderType, setGenderType] = useState(block?.genderType || 'Male')
  const [saving, setSaving] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    onSave({
      blockCode: blockCode.toUpperCase().trim(),
      blockName: blockName.trim(),
      totalFloors: parseInt(totalFloors, 10),
      genderType,
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="glass-light w-full max-w-md p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#1B1F3B]">
            {mode === 'create' ? 'Add New Block' : 'Edit Block'}
          </h2>
          <button onClick={onClose} className="text-[#1B1F3B]/60 hover:text-[#1B1F3B]">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Block Code</label>
              <input
                required
                maxLength={10}
                value={blockCode}
                onChange={e => setBlockCode(e.target.value)}
                placeholder="A"
                className="glass-input w-full px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Floors</label>
              <input
                required
                type="number"
                min={1}
                max={50}
                value={totalFloors}
                onChange={e => setTotalFloors(e.target.value)}
                className="glass-input w-full px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Block Name</label>
            <input
              required
              maxLength={100}
              value={blockName}
              onChange={e => setBlockName(e.target.value)}
              placeholder="Block A - Melur"
              className="glass-input w-full px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Gender Type</label>
            <select
              value={genderType}
              onChange={e => setGenderType(e.target.value)}
              className="glass-input w-full px-3 py-2 text-sm"
            >
              {GENDER_TYPES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-glass px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-[#6C63FF] text-white font-semibold hover:bg-[#5b52e0] text-sm disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
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
