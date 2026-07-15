'use client'

import { useEffect, useState } from 'react'
import {
  ArrowLeft, Loader2, Printer, Plus, Trash2, Pencil, X,
  BedDouble, DoorOpen, User, AlertTriangle, CheckCircle2,
} from 'lucide-react'
import { useApp } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import { FurnitureIcon, getConditionChipClass, getStatusChipClass } from '@/components/furniture-icons'

type RoomDetail = {
  id: string
  roomNumber: string
  floorNumber: number
  roomType: string
  capacity: number
  status: string
  lastInspectionDate: string | null
  notes: string | null
  block: { id: string; blockCode: string; blockName: string; genderType: string; totalFloors: number }
  currentOccupancy: number
  vacantBeds: number
  hasMaintenanceIssue: boolean
  furniture: Array<{
    id: string
    itemName: string
    category: string
    icon: string | null
    itemId: string
    quantity: number
    condition: string
    posX: number | null
    posY: number | null
    lastCheckedDate: string | null
  }>
  allocations: Array<{
    id: string
    isActive: boolean
    bedNo: string
    checkInDate: string
    checkOutDate: string | null
    student: {
      id: string
      fullName: string
      icMatricNo: string
      programme: string
      gender: string
      phoneNo: string | null
    }
  }>
}

export function RoomDetailView() {
  const { selectedRoomId, setView, user } = useApp()
  const { toast } = useToast()
  const [room, setRoom] = useState<RoomDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingFurniture, setEditingFurniture] = useState<string | null>(null)
  const [addingFurniture, setAddingFurniture] = useState(false)
  const [catalog, setCatalog] = useState<Array<{ id: string; itemName: string; category: string; defaultIcon: string | null }>>([])

  const canEditFurniture = user?.role === 'Admin' || user?.role === 'Facilities'
  const canManageAllocations = user?.role === 'Admin' || user?.role === 'Warden'

  async function load() {
    if (!selectedRoomId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/rooms/${selectedRoomId}`)
      const data = await res.json()
      if (res.ok) setRoom(data.room)
      else toast({ title: 'Failed to load room', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    fetch('/api/furniture-catalog').then(r => r.json()).then(d => setCatalog(d.catalog || []))
  }, [selectedRoomId])

  async function updateFurniture(id: string, updates: any) {
    const res = await fetch(`/api/room-furniture/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) {
      const d = await res.json()
      toast({ title: 'Update failed', description: d.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Furniture updated' })
    setEditingFurniture(null)
    load()
  }

  async function removeFurniture(id: string) {
    if (!confirm('Remove this furniture from the room?')) return
    const res = await fetch(`/api/room-furniture/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast({ title: 'Delete failed', variant: 'destructive' })
      return
    }
    toast({ title: 'Furniture removed' })
    load()
  }

  async function checkout(allocationId: string, studentName: string) {
    if (!confirm(`Check out ${studentName}? Bed will be vacated.`)) return
    const res = await fetch(`/api/allocations/${allocationId}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (!res.ok) {
      toast({ title: 'Checkout failed', variant: 'destructive' })
      return
    }
    toast({ title: 'Student checked out' })
    load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-white" size={32} />
      </div>
    )
  }

  if (!room) {
    return (
      <div className="glass p-8 text-center">
        <p className="text-[#1B1F3B]">Room not found.</p>
        <button onClick={() => setView('rooms')} className="btn-glass mt-4 px-4 py-2">← Back to Rooms</button>
      </div>
    )
  }

  const activeAllocations = room.allocations.filter(a => a.isActive)

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('rooms')} className="btn-glass p-2">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white drop-shadow">Room {room.roomNumber}</h1>
              <span className={getStatusChipClass(room.status)}>{room.status}</span>
              {room.hasMaintenanceIssue && (
                <span className="chip chip-maintenance flex items-center gap-1">
                  <AlertTriangle size={12} /> Maintenance Issue
                </span>
              )}
            </div>
            <p className="text-white/80 text-sm">
              {room.block.blockName} · Floor {room.floorNumber} · {room.roomType} · Cap {room.capacity}
            </p>
          </div>
        </div>
        <button onClick={() => window.print()} className="btn-glass px-4 py-2 text-sm font-medium flex items-center gap-1.5">
          <Printer size={16} /> Print Room Card
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Room layout canvas */}
        <div className="glass p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-[#1B1F3B] mb-1">Room Layout</h2>
          <p className="text-xs text-[#1B1F3B]/60 mb-4">Schematic showing furniture positions</p>
          <div
            className="relative w-full rounded-2xl border-2 border-dashed border-[#1B1F3B]/20 bg-white/30 overflow-hidden"
            style={{ aspectRatio: '16/10' }}
          >
            {/* Door indicator (bottom-left) */}
            <div className="absolute bottom-0 left-8 w-12 h-1 bg-[#1B1F3B]/60 rounded-t" />
            <div className="absolute bottom-1 left-8 text-[10px] text-[#1B1F3B]/60 font-semibold">DOOR</div>

            {/* Window indicator (top) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-[#6C63FF]/60 rounded-b" />
            <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] text-[#1B1F3B]/60 font-semibold">WINDOW</div>

            {/* Furniture items */}
            {room.furniture.map((f) => {
              const x = f.posX ?? 50
              const y = f.posY ?? 50
              const isDamaged = f.condition === 'Damaged' || f.condition === 'Missing'
              return (
                <div
                  key={f.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group"
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md transition-transform hover:scale-110 ${
                      isDamaged
                        ? 'bg-[#E85C5C]/30 border-2 border-[#E85C5C]'
                        : f.condition === 'Fair'
                        ? 'bg-[#F5A623]/25 border-2 border-[#F5A623]'
                        : 'bg-white/70 border-2 border-[#2EC4B6]'
                    }`}
                    title={`${f.itemName} (${f.condition})`}
                  >
                    <FurnitureIcon name={f.icon} size={20} className="text-[#1B1F3B]" />
                  </div>
                  <div className="mt-1 text-[10px] font-medium text-[#1B1F3B] bg-white/70 px-1.5 rounded">
                    {f.itemName.split(' ').slice(0, 2).join(' ')}{f.quantity > 1 ? ` ×${f.quantity}` : ''}
                  </div>
                </div>
              )
            })}

            {/* Empty state */}
            {room.furniture.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-[#1B1F3B]/50">
                <div className="text-center">
                  <DoorOpen size={32} className="mx-auto mb-2" />
                  <p className="text-sm">No furniture assigned yet.</p>
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-white/70 border border-[#2EC4B6]" /> Good
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-[#F5A623]/25 border border-[#F5A623]" /> Fair
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-[#E85C5C]/30 border border-[#E85C5C]" /> Damaged/Missing
            </div>
          </div>
        </div>

        {/* Itemized furniture list */}
        <div className="glass p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[#1B1F3B]">Inventory</h2>
              <p className="text-xs text-[#1B1F3B]/60">{room.furniture.length} item type(s)</p>
            </div>
            {canEditFurniture && (
              <button
                onClick={() => setAddingFurniture(true)}
                className="btn-glass p-1.5"
                title="Add furniture"
              >
                <Plus size={16} />
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto scroll-glass pr-1">
            {room.furniture.map(f => (
              <div key={f.id} className="bg-white/40 rounded-xl p-3">
                {editingFurniture === f.id ? (
                  <FurnitureEditor
                    item={f}
                    onSave={(updates) => updateFurniture(f.id, updates)}
                    onCancel={() => setEditingFurniture(null)}
                  />
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FurnitureIcon name={f.icon} size={16} className="text-[#6C63FF] flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-semibold text-[#1B1F3B] text-sm truncate">{f.itemName}</div>
                          <div className="text-[11px] text-[#1B1F3B]/60">{f.category}</div>
                        </div>
                      </div>
                      <span className={getConditionChipClass(f.condition)}>{f.condition}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <div className="text-[#1B1F3B]/70">
                        Qty: <strong className="text-[#1B1F3B]">{f.quantity}</strong>
                        {f.lastCheckedDate && (
                          <span className="ml-2">
                            · Checked: {new Date(f.lastCheckedDate).toLocaleDateString('en-MY')}
                          </span>
                        )}
                      </div>
                      {canEditFurniture && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingFurniture(f.id)}
                            className="p-1 text-[#1B1F3B]/60 hover:text-[#1B1F3B]"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => removeFurniture(f.id)}
                            className="p-1 text-[#E85C5C]/70 hover:text-[#E85C5C]"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
            {room.furniture.length === 0 && (
              <div className="text-center text-[#1B1F3B]/50 py-8 text-sm">
                No furniture assigned.
              </div>
            )}
          </div>

          {addingFurniture && (
            <AddFurnitureForm
              catalog={catalog}
              onSave={async (form) => {
                const res = await fetch('/api/room-furniture', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ...form, roomId: room.id }),
                })
                if (!res.ok) {
                  const d = await res.json()
                  toast({ title: 'Failed', description: d.error, variant: 'destructive' })
                  return
                }
                toast({ title: 'Furniture added' })
                setAddingFurniture(false)
                load()
              }}
              onCancel={() => setAddingFurniture(false)}
            />
          )}
        </div>
      </div>

      {/* Tenants / Allocations */}
      <div className="glass p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-[#1B1F3B]">Current Tenants & History</h2>
            <p className="text-xs text-[#1B1F3B]/60">
              {activeAllocations.length} active · {room.allocations.length - activeAllocations.length} past
            </p>
          </div>
          <button
            onClick={() => setView('students')}
            className="btn-glass px-3 py-1.5 text-xs font-semibold"
          >
            Go to Students →
          </button>
        </div>

        {room.allocations.length === 0 ? (
          <div className="text-center py-8 text-[#1B1F3B]/50">
            <User size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No allocations yet. Add students from the Students page.</p>
          </div>
        ) : (
          <div className="overflow-x-auto scroll-glass">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-[#1B1F3B]/15 text-left text-[#1B1F3B]/70 text-xs uppercase">
                  <th className="py-2 px-3">Student</th>
                  <th className="py-2 px-3">Matric No.</th>
                  <th className="py-2 px-3">Programme</th>
                  <th className="py-2 px-3">Bed</th>
                  <th className="py-2 px-3">Check-in</th>
                  <th className="py-2 px-3">Check-out</th>
                  <th className="py-2 px-3">Status</th>
                  {canManageAllocations && <th className="py-2 px-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody>
                {room.allocations.map(a => (
                  <tr key={a.id} className="border-b border-[#1B1F3B]/8 hover:bg-white/30">
                    <td className="py-2.5 px-3 font-semibold text-[#1B1F3B]">{a.student.fullName}</td>
                    <td className="py-2.5 px-3 text-[#1B1F3B]/70">{a.student.icMatricNo}</td>
                    <td className="py-2.5 px-3 text-[#1B1F3B]/70">{a.student.programme}</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1">
                        <BedDouble size={12} className="text-[#6C63FF]" />
                        {a.bedNo}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-[#1B1F3B]/70">
                      {new Date(a.checkInDate).toLocaleDateString('en-MY')}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-[#1B1F3B]/70">
                      {a.checkOutDate ? new Date(a.checkOutDate).toLocaleDateString('en-MY') : '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      {a.isActive ? (
                        <span className="chip chip-active flex items-center gap-1 w-fit">
                          <CheckCircle2 size={10} /> Active
                        </span>
                      ) : (
                        <span className="chip chip-checkedout">Checked out</span>
                      )}
                    </td>
                    {canManageAllocations && (
                      <td className="py-2.5 px-3 text-right">
                        {a.isActive && (
                          <button
                            onClick={() => checkout(a.id, a.student.fullName)}
                            className="btn-glass px-2.5 py-1 text-xs"
                          >
                            Check Out
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function FurnitureEditor({
  item, onSave, onCancel,
}: {
  item: { quantity: number; condition: string; posX: number | null; posY: number | null; lastCheckedDate: string | null }
  onSave: (updates: any) => void
  onCancel: () => void
}) {
  const [quantity, setQuantity] = useState(item.quantity.toString())
  const [condition, setCondition] = useState(item.condition)
  const [lastCheckedDate, setLastCheckedDate] = useState(
    item.lastCheckedDate ? item.lastCheckedDate.slice(0, 10) : ''
  )

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          min={1}
          max={100}
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          className="glass-input px-2 py-1 text-xs w-full"
          placeholder="Qty"
        />
        <select
          value={condition}
          onChange={e => setCondition(e.target.value)}
          className="glass-input px-2 py-1 text-xs w-full"
        >
          {['Good', 'Fair', 'Damaged', 'Missing'].map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <input
        type="date"
        value={lastCheckedDate}
        onChange={e => setLastCheckedDate(e.target.value)}
        className="glass-input px-2 py-1 text-xs w-full"
      />
      <div className="flex gap-1">
        <button onClick={onCancel} className="btn-glass flex-1 py-1 text-xs">Cancel</button>
        <button
          onClick={() => onSave({
            quantity: parseInt(quantity, 10) || 1,
            condition,
            lastCheckedDate: lastCheckedDate || null,
          })}
          className="flex-1 py-1 text-xs rounded bg-[#6C63FF] text-white font-semibold"
        >
          Save
        </button>
      </div>
    </div>
  )
}

function AddFurnitureForm({
  catalog, onSave, onCancel,
}: {
  catalog: Array<{ id: string; itemName: string; category: string; defaultIcon: string | null }>
  onSave: (form: any) => void
  onCancel: () => void
}) {
  const [itemId, setItemId] = useState(catalog[0]?.id || '')
  const [quantity, setQuantity] = useState('1')
  const [condition, setCondition] = useState('Good')

  return (
    <div className="bg-white/50 rounded-xl p-3 mt-2 space-y-2">
      <div className="text-xs font-semibold text-[#1B1F3B]">Add Furniture</div>
      <select
        value={itemId}
        onChange={e => setItemId(e.target.value)}
        className="glass-input px-2 py-1.5 text-xs w-full"
      >
        {catalog.map(c => <option key={c.id} value={c.id}>{c.itemName} ({c.category})</option>)}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          min={1}
          max={100}
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          className="glass-input px-2 py-1.5 text-xs w-full"
          placeholder="Qty"
        />
        <select
          value={condition}
          onChange={e => setCondition(e.target.value)}
          className="glass-input px-2 py-1.5 text-xs w-full"
        >
          {['Good', 'Fair', 'Damaged', 'Missing'].map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="flex gap-1">
        <button onClick={onCancel} className="btn-glass flex-1 py-1 text-xs">Cancel</button>
        <button
          onClick={() => onSave({ itemId, quantity: parseInt(quantity, 10) || 1, condition })}
          className="flex-1 py-1 text-xs rounded bg-[#6C63FF] text-white font-semibold"
        >
          Add
        </button>
      </div>
    </div>
  )
}
