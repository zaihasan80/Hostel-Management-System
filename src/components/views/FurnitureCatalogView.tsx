'use client'

import { useEffect, useState } from 'react'
import { Sofa, Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react'
import { useApp } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import { FurnitureIcon } from '@/components/furniture-icons'

type CatalogItem = {
  id: string
  itemName: string
  category: string
  defaultIcon: string | null
  inUseCount: number
  createdAt: string
}

const CATEGORIES = ['Furniture', 'Electrical', 'Sanitary', 'Appliance']

export function FurnitureCatalogView() {
  const { user } = useApp()
  const { toast } = useToast()
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null | { mode: 'create' | 'edit'; item?: CatalogItem }>(null)
  const [filter, setFilter] = useState('')

  const canManage = user?.role === 'Admin' || user?.role === 'Facilities'

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/furniture-catalog')
      const data = await res.json()
      setItems(data.catalog || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleSave(form: any) {
    const isEdit = modal?.mode === 'edit'
    const url = isEdit ? `/api/furniture-catalog/${modal?.item?.id}` : '/api/furniture-catalog'
    const method = isEdit ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: 'Save failed', description: data.error, variant: 'destructive' })
      return
    }
    toast({ title: isEdit ? 'Item updated' : 'Item created' })
    setModal(null)
    load()
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/furniture-catalog/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: 'Delete failed', description: data.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Item deleted' })
    load()
  }

  const filtered = items.filter(i =>
    !filter ||
    i.itemName.toLowerCase().includes(filter.toLowerCase()) ||
    i.category.toLowerCase().includes(filter.toLowerCase())
  )

  // Group by category
  const grouped = CATEGORIES.map(cat => ({
    category: cat,
    items: filtered.filter(i => i.category === cat),
  })).filter(g => g.items.length > 0)

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white drop-shadow">Furniture Catalog</h1>
          <p className="text-white/80 text-sm">Master list of item types available to assign to rooms.</p>
        </div>
        {canManage && (
          <button
            onClick={() => setModal({ mode: 'create' })}
            className="px-4 py-2 rounded-xl bg-[#6C63FF] text-white font-semibold shadow-lg hover:bg-[#5b52e0] transition-all hover-lift flex items-center gap-2"
          >
            <Plus size={18} /> Add Item
          </button>
        )}
      </div>

      <div className="glass p-4">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search catalog…"
          className="glass-input w-full px-3 py-2 text-sm"
        />
      </div>

      {loading ? (
        <div className="glass p-12 flex items-center justify-center">
          <Loader2 className="animate-spin text-[#1B1F3B]" size={28} />
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(group => (
            <div key={group.category} className="glass p-5">
              <h2 className="text-sm font-bold text-[#1B1F3B] mb-3 uppercase tracking-wide">
                {group.category} ({group.items.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {group.items.map(item => (
                  <div key={item.id} className="bg-white/40 rounded-xl p-3 hover-lift">
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-10 h-10 rounded-lg bg-white/60 flex items-center justify-center">
                        <FurnitureIcon name={item.defaultIcon} size={18} className="text-[#6C63FF]" />
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setModal({ mode: 'edit', item })}
                            className="btn-glass p-1"
                            title="Edit"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="btn-glass p-1 text-[#E85C5C]"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="font-semibold text-sm text-[#1B1F3B]">{item.itemName}</div>
                    <div className="text-[11px] text-[#1B1F3B]/60 mt-1">
                      Used in <strong>{item.inUseCount}</strong> room(s)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {grouped.length === 0 && (
            <div className="glass p-12 text-center text-[#1B1F3B]/60">
              <Sofa size={32} className="mx-auto mb-2 opacity-50" />
              No catalog items match.
            </div>
          )}
        </div>
      )}

      {modal && (
        <CatalogModal
          mode={modal.mode}
          item={modal.item}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

function CatalogModal({
  mode, item, onClose, onSave,
}: {
  mode: 'create' | 'edit'
  item?: CatalogItem
  onClose: () => void
  onSave: (form: any) => void
}) {
  const [itemName, setItemName] = useState(item?.itemName || '')
  const [category, setCategory] = useState(item?.category || 'Furniture')
  const [defaultIcon, setDefaultIcon] = useState(item?.defaultIcon || 'box')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="glass-light w-full max-w-md p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#1B1F3B]">
            {mode === 'create' ? 'Add Catalog Item' : 'Edit Item'}
          </h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave({ itemName, category, defaultIcon }) }} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Item Name</label>
            <input
              required
              maxLength={100}
              value={itemName}
              onChange={e => setItemName(e.target.value)}
              className="glass-input w-full px-3 py-2 text-sm"
              placeholder="Single Bed Frame"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="glass-input w-full px-3 py-2 text-sm">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1B1F3B]/80 mb-1">Icon</label>
            <select value={defaultIcon} onChange={e => setDefaultIcon(e.target.value)} className="glass-input w-full px-3 py-2 text-sm">
              {['bed', 'bed-double', 'table', 'chair', 'wardrobe', 'book', 'fan', 'lightbulb', 'wind', 'plug', 'mirror', 'droplet', 'shower', 'flame', 'trash', 'box'].map(i => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-glass px-4 py-2 text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#6C63FF] text-white font-semibold hover:bg-[#5b52e0] text-sm">Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}
