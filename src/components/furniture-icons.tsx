'use client'

import {
  Bed, BedDouble, Table2, Armchair, DoorClosed, Lightbulb, Fan,
  Wind, Plug, BookOpen, Image as ImageIcon, Droplets, ShowerHead, Flame,
  Trash2, Box, type LucideIcon,
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  bed: Bed,
  'bed-double': BedDouble,
  table: Table2,
  chair: Armchair,
  wardrobe: DoorClosed,
  book: BookOpen,
  fan: Fan,
  lightbulb: Lightbulb,
  wind: Wind,
  plug: Plug,
  mirror: ImageIcon,
  droplet: Droplets,
  shower: ShowerHead,
  flame: Flame,
  trash: Trash2,
}

export function FurnitureIcon({
  name,
  className,
  size = 18,
}: {
  name?: string | null
  className?: string
  size?: number
}) {
  const Icon = (name && ICON_MAP[name]) || Box
  return <Icon className={className} size={size} />
}

export function getConditionChipClass(condition: string): string {
  switch (condition) {
    case 'Good': return 'chip chip-good'
    case 'Fair': return 'chip chip-fair'
    case 'Damaged': return 'chip chip-damaged'
    case 'Missing': return 'chip chip-missing'
    default: return 'chip'
  }
}

export function getStatusChipClass(status: string): string {
  switch (status) {
    case 'Available': return 'chip chip-available'
    case 'Occupied': return 'chip chip-occupied'
    case 'Full': return 'chip chip-full'
    case 'Maintenance': return 'chip chip-maintenance'
    case 'Active': return 'chip chip-active'
    case 'Checked-out': return 'chip chip-checkedout'
    case 'Suspended': return 'chip chip-suspended'
    default: return 'chip'
  }
}
