'use client'

import { useEffect, useState } from 'react'
import {
  Building2, DoorOpen, BedDouble, AlertTriangle, Users, Wrench,
  TrendingUp, Activity, Loader2,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

type DashboardData = {
  summary: {
    totalBlocks: number
    totalRooms: number
    totalCapacity: number
    totalOccupied: number
    totalVacant: number
    occupancyRate: number
    activeStudents: number
    totalStudents: number
    maintenanceFlags: number
  }
  blockStats: Array<{
    blockCode: string
    blockName: string
    totalRooms: number
    capacity: number
    occupied: number
    vacant: number
    occupancyRate: number
  }>
  statusCounts: Record<string, number>
  conditionCounts: Record<string, number>
}

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/dashboard')
      .then(async r => {
        if (!r.ok) throw new Error('Failed')
        return r.json()
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-white" size={40} />
      </div>
    )
  }
  if (error || !data) {
    return <div className="glass p-6 text-center text-[#1B1F3B]">Failed to load dashboard.</div>
  }

  const cards = [
    {
      label: 'Total Blocks',
      value: data.summary.totalBlocks,
      icon: Building2,
      color: '#6C63FF',
      bg: 'rgba(108, 99, 255, 0.15)',
    },
    {
      label: 'Total Rooms',
      value: data.summary.totalRooms,
      icon: DoorOpen,
      color: '#2EC4B6',
      bg: 'rgba(46, 196, 182, 0.15)',
    },
    {
      label: 'Occupancy Rate',
      value: `${data.summary.occupancyRate}%`,
      sub: `${data.summary.totalOccupied} / ${data.summary.totalCapacity} beds`,
      icon: TrendingUp,
      color: '#1B1F3B',
      bg: 'rgba(27, 31, 59, 0.15)',
    },
    {
      label: 'Maintenance Flags',
      value: data.summary.maintenanceFlags,
      sub: 'rooms need attention',
      icon: AlertTriangle,
      color: '#F5A623',
      bg: 'rgba(245, 166, 35, 0.15)',
    },
    {
      label: 'Active Students',
      value: data.summary.activeStudents,
      sub: `${data.summary.totalStudents} total`,
      icon: Users,
      color: '#2EC4B6',
      bg: 'rgba(46, 196, 182, 0.15)',
    },
    {
      label: 'Vacant Beds',
      value: data.summary.totalVacant,
      icon: BedDouble,
      color: '#6C63FF',
      bg: 'rgba(108, 99, 255, 0.15)',
    },
  ]

  // Charts data
  const barData = data.blockStats.map(b => ({
    name: `Block ${b.blockCode}`,
    Occupied: b.occupied,
    Vacant: b.vacant,
    capacity: b.capacity,
    rate: b.occupancyRate,
  }))

  const conditionData = Object.entries(data.conditionCounts)
    .filter(([_, v]) => v > 0)
    .map(([name, value]) => ({ name, value }))

  const CONDITION_COLORS: Record<string, string> = {
    Good: '#2EC4B6',
    Fair: '#F5A623',
    Damaged: '#E85C5C',
    Missing: '#64748b',
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white drop-shadow">Dashboard</h1>
        <p className="text-white/80 text-sm">
          Consolidated overview of hostel blocks, rooms, occupancy, and equipment condition.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <div key={c.label} className="glass p-5 hover-lift">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: c.bg, color: c.color }}
              >
                <Icon size={20} />
              </div>
              <div className="text-2xl font-bold text-[#1B1F3B]">{c.value}</div>
              <div className="text-xs text-[#1B1F3B]/70 font-medium uppercase tracking-wide">{c.label}</div>
              {c.sub && <div className="text-[11px] text-[#1B1F3B]/55 mt-1">{c.sub}</div>}
            </div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Occupancy by Block */}
        <div className="glass p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[#1B1F3B]">Occupancy by Block</h2>
              <p className="text-xs text-[#1B1F3B]/60">Occupied vs vacant beds per block</p>
            </div>
            <Activity size={20} className="text-[#6C63FF]" />
          </div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={barData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(27,31,59,0.1)" />
                <XAxis dataKey="name" stroke="#1B1F3B" fontSize={12} />
                <YAxis stroke="#1B1F3B" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(255,255,255,0.95)',
                    border: '1px solid rgba(255,255,255,0.5)',
                    borderRadius: '12px',
                    backdropFilter: 'blur(8px)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Occupied" stackId="a" fill="#6C63FF" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Vacant" stackId="a" fill="#2EC4B6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Furniture Condition Donut */}
        <div className="glass p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[#1B1F3B]">Furniture Condition</h2>
              <p className="text-xs text-[#1B1F3B]/60">Across all rooms</p>
            </div>
            <Wrench size={20} className="text-[#F5A623]" />
          </div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={conditionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                  style={{ fontSize: 11 }}
                >
                  {conditionData.map((entry, idx) => (
                    <Cell key={idx} fill={CONDITION_COLORS[entry.name] || '#999'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(255,255,255,0.95)',
                    border: '1px solid rgba(255,255,255,0.5)',
                    borderRadius: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Block stats table */}
      <div className="glass p-6">
        <h2 className="text-lg font-semibold text-[#1B1F3B] mb-4">Block-wise Breakdown</h2>
        <div className="overflow-x-auto scroll-glass">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1B1F3B]/15 text-left text-[#1B1F3B]/70">
                <th className="py-2 px-3 font-semibold">Block</th>
                <th className="py-2 px-3 font-semibold">Rooms</th>
                <th className="py-2 px-3 font-semibold">Capacity</th>
                <th className="py-2 px-3 font-semibold">Occupied</th>
                <th className="py-2 px-3 font-semibold">Vacant</th>
                <th className="py-2 px-3 font-semibold">Occupancy</th>
              </tr>
            </thead>
            <tbody>
              {data.blockStats.map(b => (
                <tr key={b.blockCode} className="border-b border-[#1B1F3B]/8 hover:bg-white/30">
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-[#1B1F3B]">{b.blockCode}</div>
                    <div className="text-xs text-[#1B1F3B]/60">{b.blockName}</div>
                  </td>
                  <td className="py-2.5 px-3">{b.totalRooms}</td>
                  <td className="py-2.5 px-3">{b.capacity}</td>
                  <td className="py-2.5 px-3 text-[#6C63FF] font-semibold">{b.occupied}</td>
                  <td className="py-2.5 px-3 text-[#2EC4B6] font-semibold">{b.vacant}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-[#1B1F3B]/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#6C63FF] to-[#2EC4B6]"
                          style={{ width: `${b.occupancyRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-[#1B1F3B]">{b.occupancyRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
