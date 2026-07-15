'use client'

import { useState } from 'react'
import { UserCircle, Mail, Phone, Shield, Lock, Loader2, Building2, CheckCircle2 } from 'lucide-react'
import { useApp } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'

export function ProfileView() {
  const { user, logout } = useApp()
  const { toast } = useToast()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [saving, setSaving] = useState(false)

  if (!user) return null

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    if (form.newPassword !== form.confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Failed', description: data.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Password changed', description: 'Please sign in again with your new password.' })
      setForm({ currentPassword: '', newPassword: '', confirm: '' })
      setTimeout(() => logout(), 1500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white drop-shadow">My Profile</h1>
        <p className="text-white/80 text-sm">Your account details and security settings.</p>
      </div>

      <div className="glass p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#6C63FF] to-[#2EC4B6] flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {user.fullName.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#1B1F3B]">{user.fullName}</h2>
            <p className="text-sm text-[#1B1F3B]/70">{user.email}</p>
            <span className="chip chip-occupied mt-1 inline-flex">{user.role}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/40 rounded-xl p-3 flex items-center gap-3">
            <Mail size={18} className="text-[#6C63FF]" />
            <div>
              <div className="text-xs text-[#1B1F3B]/60">Email</div>
              <div className="text-sm font-semibold text-[#1B1F3B]">{user.email}</div>
            </div>
          </div>
          <div className="bg-white/40 rounded-xl p-3 flex items-center gap-3">
            <Shield size={18} className="text-[#6C63FF]" />
            <div>
              <div className="text-xs text-[#1B1F3B]/60">Role</div>
              <div className="text-sm font-semibold text-[#1B1F3B]">{user.role}</div>
            </div>
          </div>
          <div className="bg-white/40 rounded-xl p-3 flex items-center gap-3">
            <CheckCircle2 size={18} className="text-[#2EC4B6]" />
            <div>
              <div className="text-xs text-[#1B1F3B]/60">Account Status</div>
              <div className="text-sm font-semibold text-[#1B1F3B]">{user.status}</div>
            </div>
          </div>
          <div className="bg-white/40 rounded-xl p-3 flex items-center gap-3">
            <UserCircle size={18} className="text-[#6C63FF]" />
            <div>
              <div className="text-xs text-[#1B1F3B]/60">User ID</div>
              <div className="text-xs font-mono text-[#1B1F3B]/70 truncate max-w-[180px]">{user.id}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="glass p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={18} className="text-[#6C63FF]" />
          <h2 className="text-lg font-semibold text-[#1B1F3B]">Change Password</h2>
        </div>
        <p className="text-xs text-[#1B1F3B]/60 mb-4">
          For your security, you will be signed out after changing your password. Passwords must contain at least 8 characters including uppercase, lowercase, a number, and a symbol.
        </p>
        <form onSubmit={changePassword} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Current Password</label>
            <input
              type="password"
              required
              value={form.currentPassword}
              onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
              className="glass-input w-full px-3 py-2 text-sm"
              autoComplete="current-password"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">New Password</label>
              <input
                type="password"
                required
                value={form.newPassword}
                onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                className="glass-input w-full px-3 py-2 text-sm"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                className="glass-input w-full px-3 py-2 text-sm"
                autoComplete="new-password"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#6C63FF] text-white font-semibold hover:bg-[#5b52e0] text-sm disabled:opacity-60 flex items-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
            Change Password
          </button>
        </form>
      </div>

      {/* Security info */}
      <div className="glass p-6">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={18} className="text-[#2EC4B6]" />
          <h2 className="text-lg font-semibold text-[#1B1F3B]">Security Information</h2>
        </div>
        <ul className="text-sm text-[#1B1F3B]/80 space-y-2">
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-[#2EC4B6] mt-0.5 flex-shrink-0" />
            <span>Your password is hashed with bcrypt (12 rounds) — even administrators cannot see it.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-[#2EC4B6] mt-0.5 flex-shrink-0" />
            <span>Your session expires after 8 hours of inactivity and is stored in an httpOnly, SameSite=Strict cookie.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-[#2EC4B6] mt-0.5 flex-shrink-0" />
            <span>Your account locks automatically for 15 minutes after 5 failed login attempts.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-[#2EC4B6] mt-0.5 flex-shrink-0" />
            <span>All your actions (create / update / delete) are recorded in the audit log.</span>
          </li>
          {user.role === 'Warden' && (
            <li className="flex items-start gap-2">
              <Building2 size={14} className="text-[#6C63FF] mt-0.5 flex-shrink-0" />
              <span>As a Warden, you can only manage blocks assigned to you by an administrator.</span>
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
