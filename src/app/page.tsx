'use client'

import { useEffect } from 'react'
import { useApp } from '@/lib/store'
import { AppShell } from '@/components/layout/AppShell'
import { LoginView } from '@/components/views/LoginView'
import { DashboardView } from '@/components/views/DashboardView'
import { BlocksView } from '@/components/views/BlocksView'
import { RoomsView } from '@/components/views/RoomsView'
import { RoomDetailView } from '@/components/views/RoomDetailView'
import { StudentsView } from '@/components/views/StudentsView'
import { StudentDetailView } from '@/components/views/StudentDetailView'
import { FurnitureCatalogView } from '@/components/views/FurnitureCatalogView'
import { UsersView } from '@/components/views/UsersView'
import { AuditLogView } from '@/components/views/AuditLogView'
import { ProfileView } from '@/components/views/ProfileView'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const { user, loading, view, refreshUser } = useApp()

  // On first mount, fetch current user (session cookie if present)
  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-white" size={40} />
      </div>
    )
  }

  // Not signed in
  if (!user) {
    return <LoginView />
  }

  // Signed in — render the requested view inside the app shell
  return (
    <AppShell>
      {view === 'dashboard' && <DashboardView />}
      {view === 'blocks' && <BlocksView />}
      {view === 'rooms' && <RoomsView />}
      {view === 'room-detail' && <RoomDetailView />}
      {view === 'students' && <StudentsView />}
      {view === 'student-detail' && <StudentDetailView />}
      {view === 'furniture-catalog' && <FurnitureCatalogView />}
      {view === 'users' && <UsersView />}
      {view === 'audit-log' && <AuditLogView />}
      {view === 'profile' && <ProfileView />}
    </AppShell>
  )
}
