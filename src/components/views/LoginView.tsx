'use client'

import { useState } from 'react'
import { useApp } from '@/lib/store'
import { Building2, Eye, EyeOff, Lock, Mail, Shield, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function LoginView() {
  const { setUser } = useApp()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Login failed', description: data.error, variant: 'destructive' })
        return
      }
      setUser(data.user)
      toast({ title: `Welcome, ${data.user.fullName}`, description: `Logged in as ${data.user.role}` })
    } catch (err) {
      toast({ title: 'Network error', description: 'Could not reach server', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  function fillDemo(email: string, password: string) {
    setEmail(email)
    setPassword(password)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass-dark mb-4">
            <Building2 className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white drop-shadow">
            JTM Hostel Management System
          </h1>
          <p className="text-white/80 text-sm mt-1">
            Jabatan Tenaga Manusia, Malaysia
          </p>
        </div>

        <div className="glass p-8">
          <h2 className="text-xl font-semibold text-[#1B1F3B] mb-1">Sign in to your account</h2>
          <p className="text-sm text-[#1B1F3B]/70 mb-6">
            Enter your credentials to access the hostel dashboard.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1B1F3B]/50" size={16} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@jtm.gov.my"
                  className="glass-input w-full pl-10 pr-3 py-2.5 text-sm"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1B1F3B]/50" size={16} />
                <input
                  type={show ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="glass-input w-full pl-10 pr-10 py-2.5 text-sm"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1B1F3B]/50 hover:text-[#1B1F3B]"
                  tabIndex={-1}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[#6C63FF] text-white font-semibold shadow-lg hover:bg-[#5b52e0] transition-all hover-lift disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 flex items-start gap-2 text-xs text-[#1B1F3B]/70 bg-white/40 rounded-lg p-3">
            <Shield size={14} className="mt-0.5 flex-shrink-0" />
            <span>
              Account locks for 15 minutes after 5 failed attempts. All actions are audit-logged.
              Sessions expire after 8 hours.
            </span>
          </div>
        </div>

        <div className="glass mt-4 p-5">
          <h3 className="text-sm font-semibold text-[#1B1F3B] mb-3">Demo accounts — click to fill</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { label: 'Admin', email: 'admin@jtm.gov.my', pwd: 'Admin@JTM2026' },
              { label: 'Warden A', email: 'warden.a@jtm.gov.my', pwd: 'Warden@JTM2026' },
              { label: 'Warden B', email: 'warden.b@jtm.gov.my', pwd: 'Warden@JTM2026' },
              { label: 'Warden C', email: 'warden.c@jtm.gov.my', pwd: 'Warden@JTM2026' },
              { label: 'Facilities', email: 'facilities@jtm.gov.my', pwd: 'Facilities@JTM2026' },
              { label: 'Management', email: 'management@jtm.gov.my', pwd: 'Management@JTM2026' },
            ].map((c) => (
              <button
                key={c.email}
                type="button"
                onClick={() => fillDemo(c.email, c.pwd)}
                className="btn-glass px-3 py-2 text-left hover-lift"
              >
                <div className="font-semibold text-[#1B1F3B]">{c.label}</div>
                <div className="text-[#1B1F3B]/60 truncate">{c.email}</div>
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-white/70 text-xs mt-6">
          © 2026 Jabatan Tenaga Manusia. Internal / Confidential.
        </p>
      </div>
    </div>
  )
}
