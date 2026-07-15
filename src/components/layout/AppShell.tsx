'use client'

import { useApp, type ViewKey } from '@/lib/store'
import {
  LayoutDashboard, Building2, DoorOpen, Users, Sofa, UserCog,
  ScrollText, LogOut, UserCircle, ShieldCheck, ChevronRight,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useState } from 'react'

type NavItem = {
  key: ViewKey
  label: string
  icon: typeof LayoutDashboard
  roles: string[] // allowed roles
}

const NAV: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Warden', 'Facilities', 'Management'] },
  { key: 'blocks', label: 'Block Management', icon: Building2, roles: ['Admin', 'Warden', 'Management'] },
  { key: 'rooms', label: 'Rooms by Block', icon: DoorOpen, roles: ['Admin', 'Warden', 'Facilities', 'Management'] },
  { key: 'students', label: 'Students by Block/Room', icon: Users, roles: ['Admin', 'Warden', 'Management'] },
  { key: 'furniture-catalog', label: 'Furniture Catalog', icon: Sofa, roles: ['Admin', 'Facilities'] },
  { key: 'users', label: 'User Management', icon: UserCog, roles: ['Admin'] },
  { key: 'audit-log', label: 'Audit Log', icon: ScrollText, roles: ['Admin', 'Management'] },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, view, setView, logout } = useApp()
  const { toast } = useToast()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (!user) return null
  const items = NAV.filter(n => n.roles.includes(user.role))

  async function handleLogout() {
    await logout()
    toast({ title: 'Signed out', description: 'You have been logged out successfully' })
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={`${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:static z-40 inset-y-0 left-0 w-72 glass-dark p-5 flex flex-col transition-transform duration-300`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur">
            <Building2 className="text-white" size={24} />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">JTM HMS</div>
            <div className="text-white/60 text-[11px]">Hostel Management</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto scroll-glass">
          {items.map((item) => {
            const Icon = item.icon
            const active = view === item.key || (view === 'room-detail' && item.key === 'rooms') || (view === 'student-detail' && item.key === 'students')
            return (
              <button
                key={item.key}
                onClick={() => {
                  setView(item.key)
                  setMobileOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-white/25 text-white shadow-inner'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span className="flex-1 text-left">{item.label}</span>
                {active && <ChevronRight size={16} />}
              </button>
            )
          })}
        </nav>

        {/* User card + logout */}
        <div className="mt-4 pt-4 border-t border-white/15">
          <button
            onClick={() => setView('profile')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
              view === 'profile' ? 'bg-white/25 text-white' : 'text-white/80 hover:bg-white/10'
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#2EC4B6] flex items-center justify-center text-white font-bold text-xs">
              {user.fullName.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-white text-sm font-semibold truncate">{user.fullName}</div>
              <div className="text-white/60 text-[11px] truncate">{user.email}</div>
            </div>
          </button>

          <div className="mt-2 flex items-center justify-between text-[11px] text-white/60 px-3">
            <div className="flex items-center gap-1">
              <ShieldCheck size={12} />
              <span>{user.role}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-100">
              {user.status}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-red-500/20 text-red-100 hover:bg-red-500/30 text-sm font-medium transition-all"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="glass-dark px-5 py-3 flex items-center justify-between sticky top-0 z-20">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden text-white p-2 rounded-lg hover:bg-white/10"
            aria-label="Toggle menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className="flex items-center gap-2 text-white/85 text-sm">
            <UserCircle size={16} />
            <span className="hidden sm:inline">
              Signed in as <strong className="text-white">{user.fullName}</strong> ({user.role})
            </span>
            <span className="sm:hidden">{user.fullName}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex chip chip-active">DEMO DATA</span>
            <span className="text-white/60 text-xs hidden sm:inline">
              {new Date().toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-5 overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  )
}
