'use client'

import { create } from 'zustand'

export type AuthUser = {
  id: string
  email: string
  fullName: string
  role: 'Admin' | 'Warden' | 'Facilities' | 'Management' | 'Viewer'
  status: string
}

export type ViewKey =
  | 'dashboard'
  | 'blocks'
  | 'rooms'
  | 'room-detail'
  | 'students'
  | 'student-detail'
  | 'furniture-catalog'
  | 'users'
  | 'audit-log'
  | 'profile'

type AppState = {
  user: AuthUser | null
  loading: boolean
  view: ViewKey
  // Context for detail views
  selectedRoomId: string | null
  selectedStudentId: string | null
  // Setters
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  setView: (view: ViewKey) => void
  setSelectedRoomId: (id: string | null) => void
  setSelectedStudentId: (id: string | null) => void
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

export const useApp = create<AppState>((set, get) => ({
  user: null,
  loading: true,
  view: 'dashboard',
  selectedRoomId: null,
  selectedStudentId: null,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setView: (view) => set({ view }),
  setSelectedRoomId: (id) => set({ selectedRoomId: id }),
  setSelectedStudentId: (id) => set({ selectedStudentId: id }),
  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    set({ user: null, view: 'dashboard' })
  },
  refreshUser: async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      set({ user: data.user, loading: false })
    } catch {
      set({ user: null, loading: false })
    }
  },
}))
