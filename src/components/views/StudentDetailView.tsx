'use client'

import { useEffect, useState } from 'react'
import {
  ArrowLeft, Loader2, BedDouble, Phone, Mail, GraduationCap,
  Calendar, CheckCircle2, XCircle, User,
} from 'lucide-react'
import { useApp } from '@/lib/store'
import { getStatusChipClass } from '@/components/furniture-icons'

export function StudentDetailView() {
  const { selectedStudentId, setView } = useApp()
  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedStudentId) return
    fetch(`/api/students/${selectedStudentId}`)
      .then(r => r.json())
      .then(d => setStudent(d.student))
      .finally(() => setLoading(false))
  }, [selectedStudentId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-white" size={32} />
      </div>
    )
  }
  if (!student) {
    return (
      <div className="glass p-8 text-center">
        <p className="text-[#1B1F3B]">Student not found.</p>
        <button onClick={() => setView('students')} className="btn-glass mt-4 px-4 py-2">← Back to Students</button>
      </div>
    )
  }

  const activeAlloc = student.allocations.find((a: any) => a.isActive)

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('students')} className="btn-glass p-2">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-bold text-white drop-shadow">Student Profile</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile card */}
        <div className="glass p-6 lg:col-span-1">
          <div className="text-center mb-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#2EC4B6] flex items-center justify-center text-white text-3xl font-bold mx-auto mb-3 shadow-lg">
              {student.fullName.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()}
            </div>
            <h2 className="text-lg font-bold text-[#1B1F3B]">{student.fullName}</h2>
            <p className="text-sm text-[#1B1F3B]/70">{student.icMatricNo}</p>
            <span className={`mt-2 inline-block ${getStatusChipClass(student.status)}`}>{student.status}</span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-[#1B1F3B]/80">
              <GraduationCap size={16} className="text-[#6C63FF]" />
              <span>{student.programme}</span>
            </div>
            <div className="flex items-center gap-2 text-[#1B1F3B]/80">
              <User size={16} className="text-[#6C63FF]" />
              <span>{student.gender}</span>
            </div>
            {student.phoneNo && (
              <div className="flex items-center gap-2 text-[#1B1F3B]/80">
                <Phone size={16} className="text-[#6C63FF]" />
                <span>{student.phoneNo}</span>
              </div>
            )}
            {student.email && (
              <div className="flex items-center gap-2 text-[#1B1F3B]/80">
                <Mail size={16} className="text-[#6C63FF]" />
                <span className="truncate">{student.email}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-[#1B1F3B]/60 text-xs">
              <Calendar size={14} />
              <span>Joined: {new Date(student.createdAt).toLocaleDateString('en-MY')}</span>
            </div>
          </div>
        </div>

        {/* Current allocation + history */}
        <div className="glass p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-[#1B1F3B] mb-4">Allocation History</h2>

          {activeAlloc && (
            <div className="bg-gradient-to-r from-[#6C63FF]/15 to-[#2EC4B6]/15 border border-[#6C63FF]/30 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={16} className="text-[#2EC4B6]" />
                <span className="font-semibold text-[#1B1F3B]">Current Allocation</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-xs text-[#1B1F3B]/60">Block</div>
                  <div className="font-semibold text-[#1B1F3B]">{activeAlloc.room.block.blockCode}</div>
                  <div className="text-xs text-[#1B1F3B]/60">{activeAlloc.room.block.blockName}</div>
                </div>
                <div>
                  <div className="text-xs text-[#1B1F3B]/60">Room</div>
                  <div className="font-semibold text-[#1B1F3B]">{activeAlloc.room.roomNumber}</div>
                  <div className="text-xs text-[#1B1F3B]/60">Floor {activeAlloc.room.floorNumber}</div>
                </div>
                <div>
                  <div className="text-xs text-[#1B1F3B]/60">Bed</div>
                  <div className="font-semibold text-[#1B1F3B] flex items-center gap-1">
                    <BedDouble size={12} /> {activeAlloc.bedNo}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#1B1F3B]/60">Check-in</div>
                  <div className="font-semibold text-[#1B1F3B]">{new Date(activeAlloc.checkInDate).toLocaleDateString('en-MY')}</div>
                </div>
              </div>
            </div>
          )}

          {student.allocations.length === 0 ? (
            <div className="text-center py-8 text-[#1B1F3B]/50">
              <BedDouble size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No allocations yet. Allocate this student to a room from the Students page.</p>
            </div>
          ) : (
            <div className="overflow-x-auto scroll-glass">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1B1F3B]/15 text-left text-[#1B1F3B]/70 text-xs uppercase">
                    <th className="py-2 px-3">Block</th>
                    <th className="py-2 px-3">Room</th>
                    <th className="py-2 px-3">Bed</th>
                    <th className="py-2 px-3">Check-in</th>
                    <th className="py-2 px-3">Check-out</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {student.allocations.map((a: any) => (
                    <tr key={a.id} className="border-b border-[#1B1F3B]/8">
                      <td className="py-2 px-3 font-medium">{a.room.block.blockCode}</td>
                      <td className="py-2 px-3">{a.room.roomNumber}</td>
                      <td className="py-2 px-3">{a.bedNo}</td>
                      <td className="py-2 px-3 text-xs">{new Date(a.checkInDate).toLocaleDateString('en-MY')}</td>
                      <td className="py-2 px-3 text-xs">
                        {a.checkOutDate ? new Date(a.checkOutDate).toLocaleDateString('en-MY') : '—'}
                      </td>
                      <td className="py-2 px-3">
                        {a.isActive ? (
                          <span className="chip chip-active flex items-center gap-1 w-fit">
                            <CheckCircle2 size={10} /> Active
                          </span>
                        ) : (
                          <span className="chip chip-checkedout flex items-center gap-1 w-fit">
                            <XCircle size={10} /> Closed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
