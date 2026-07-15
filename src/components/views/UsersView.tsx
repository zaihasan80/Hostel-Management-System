'use client'

import { useEffect, useState } from 'react'
import {
  UserCog, Plus, Pencil, Trash2, X, Loader2, Lock, Shield,
  CheckCircle2, AlertTriangle, Building2,
} from 'lucide-react'
import { useApp } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'

type ManagedUser = {
  id: string
  email: string
  fullName: string
  role: string
  status: string
  phone: string | null
  lastLoginAt: string | null
  createdAt: string
  failedLoginAttempts: number
  lockedUntil: string | null
  assignedBlocks: Array<{ id: string; blockCode: string; blockName: string }>
}

type Block = { id: string; blockCode: string; blockName: string; genderType: string }

const ROLES = ['Admin', 'Warden', 'Facilities', 'Management', 'Viewer']

export function UsersView() {
  const { user: currentUser } = useApp()
  const { toast } = useToast()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null | { mode: 'create' | 'edit'; user?: ManagedUser }>(null)

  async function load() {
    setLoading(true)
    try {
      const [u, b] = await Promise.all([
        fetch('/api/users').then(r => r.json()),
        fetch('/api/blocks').then(r => r.json()),
      ])
      setUsers(u.users || [])
      setBlocks(b.blocks || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleSave(form: any) {
    const isEdit = modal?.mode === 'edit'
    const url = isEdit ? `/api/users/${modal?.user?.id}` : '/api/users'
    const method = isEdit ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: 'Save failed', description: data.error, variant: 'destructive' })
      return
    }
    toast({ title: isEdit ? 'User updated' : 'User created' })
    setModal(null)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Deactivate this user account? They will be signed out immediately.')) return
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: 'Failed', description: data.error, variant: 'destructive' })
      return
    }
    toast({ title: 'User deactivated' })
    load()
  }

  if (currentUser?.role !== 'Admin') {
    return (
      <div className="glass p-8 text-center text-[#1B1F3B]">
        <Shield size={32} className="mx-auto mb-2 opacity-50" />
        <p>Only administrators can manage users.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white drop-shadow">User Management</h1>
          <p className="text-white/80 text-sm">Create, edit, and deactivate user accounts with role-based access.</p>
        </div>
        <button
          onClick={() => setModal({ mode: 'create' })}
          className="px-4 py-2 rounded-xl bg-[#6C63FF] text-white font-semibold shadow-lg hover:bg-[#5b52e0] transition-all hover-lift flex items-center gap-2"
        >
          <Plus size={18} /> Add User
        </button>
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
                  <th className="py-2.5 px-3 font-semibold">User</th>
                  <th className="py-2.5 px-3 font-semibold">Role</th>
                  <th className="py-2.5 px-3 font-semibold">Assigned Blocks</th>
                  <th className="py-2.5 px-3 font-semibold">Last Login</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isLocked = u.lockedUntil && new Date(u.lockedUntil) > new Date()
                  return (
                    <tr key={u.id} className="border-b border-[#1B1F3B]/8 hover:bg-white/30">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-[#1B1F3B]">{u.fullName}</div>
                        <div className="text-xs text-[#1B1F3B]/60">{u.email}</div>
                        {u.phone && <div className="text-xs text-[#1B1F3B]/50">{u.phone}</div>}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`chip ${
                          u.role === 'Admin' ? 'chip-full' :
                          u.role === 'Warden' ? 'chip-occupied' :
                          u.role === 'Facilities' ? 'chip-maintenance' :
                          u.role === 'Management' ? 'chip-available' : 'chip-checkedout'
                        }`}>{u.role}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        {u.assignedBlocks.length === 0 ? (
                          <span className="text-[#1B1F3B]/40 text-xs">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {u.assignedBlocks.map(b => (
                              <span key={b.id} className="text-xs bg-white/60 px-1.5 py-0.5 rounded font-medium text-[#1B1F3B]">
                                {b.blockCode}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-[#1B1F3B]/70">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('en-MY', { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                      </td>
                      <td className="py-2.5 px-3">
                        {isLocked ? (
                          <span className="chip chip-maintenance flex items-center gap-1 w-fit">
                            <Lock size={10} /> Locked
                          </span>
                        ) : u.status === 'Active' ? (
                          <span className="chip chip-active flex items-center gap-1 w-fit">
                            <CheckCircle2 size={10} /> Active
                          </span>
                        ) : (
                          <span className="chip chip-checkedout">{u.status}</span>
                        )}
                        {u.failedLoginAttempts > 0 && (
                          <div className="text-[10px] text-[#F5A623] mt-0.5">
                            <AlertTriangle size={9} className="inline" /> {u.failedLoginAttempts} failed attempt(s)
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setModal({ mode: 'edit', user: u })}
                            className="btn-glass p-1.5"
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          {u.id !== currentUser.id && u.status === 'Active' && (
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="btn-glass p-1.5 text-[#E85C5C]"
                              title="Deactivate"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <UserModal
          mode={modal.mode}
          user={modal.user}
          blocks={blocks}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

function UserModal({
  mode, user, blocks, onClose, onSave,
}: {
  mode: 'create' | 'edit'
  user?: ManagedUser
  blocks: Block[]
  onClose: () => void
  onSave: (form: any) => void
}) {
  const [form, setForm] = useState({
    email: user?.email || '',
    fullName: user?.fullName || '',
    role: user?.role || 'Warden',
    phone: user?.phone || '',
    password: '',
    status: user?.status || 'Active',
    blockIds: user?.assignedBlocks.map(b => b.id) || [],
  })

  function toggleBlock(id: string) {
    setForm(f => ({
      ...f,
      blockIds: f.blockIds.includes(id) ? f.blockIds.filter(b => b !== id) : [...f.blockIds, id],
    }))
  }

  const needsBlocks = form.role === 'Warden' || form.role === 'Facilities'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="glass-light w-full max-w-lg p-6 animate-fade-in max-h-[90vh] overflow-y-auto scroll-glass">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#1B1F3B]">
            {mode === 'create' ? 'Add New User' : `Edit ${user?.fullName}`}
          </h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault()
          if (mode === 'create' && form.password.length < 1) {
            // require password on create
            return
          }
          onSave(form)
        }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Full Name</label>
              <input required maxLength={150} value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} className="glass-input w-full px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Phone</label>
              <input maxLength={20} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="glass-input w-full px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Email</label>
            <input required type="email" maxLength={254} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value.toLowerCase() }))} className="glass-input w-full px-3 py-2 text-sm" disabled={mode === 'edit'} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="glass-input w-full px-3 py-2 text-sm">
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="glass-input w-full px-3 py-2 text-sm">
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">
              Password {mode === 'edit' && '(leave blank to keep current)'}
            </label>
            <input
              type="password"
              required={mode === 'create'}
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="glass-input w-full px-3 py-2 text-sm"
              placeholder="Min 8 chars, upper+lower+number+symbol"
              autoComplete="new-password"
            />
            <p className="text-[10px] text-[#1B1F3B]/60 mt-1">
              Must contain: 8+ chars, uppercase, lowercase, number, and symbol
            </p>
          </div>

          {needsBlocks && (
            <div>
              <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">
                Assigned Blocks (Wardens can only manage their assigned blocks)
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto scroll-glass p-1">
                {blocks.map(b => (
                  <label
                    key={b.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs ${
                      form.blockIds.includes(b.id) ? 'bg-[#6C63FF]/20 border border-[#6C63FF]' : 'bg-white/40 border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.blockIds.includes(b.id)}
                      onChange={() => toggleBlock(b.id)}
                      className="rounded"
                    />
                    <Building2 size={12} />
                    <span className="font-medium text-[#1B1F3B]">Block {b.blockCode}</span>
                    <span className="text-[#1B1F3B]/50 truncate">· {b.genderType}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-glass px-4 py-2 text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#6C63FF] text-white font-semibold hover:bg-[#5b52e0] text-sm">
              {mode === 'create' ? 'Create User' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
