import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string
  name: string
  price: number
  qty: number
  image?: string
  category: string
}

interface CartStore {
  items: CartItem[]
  tenantSlug: string | null
  setTenantSlug: (slug: string) => void
  addItem: (item: Omit<CartItem, 'qty'>) => void
  removeItem: (id: string) => void
  updateQty: (id: string, qty: number) => void
  clear: () => void
  total: () => number
  count: () => number
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      tenantSlug: null,
      setTenantSlug: slug => set({ tenantSlug: slug }),
      addItem: item => {
        const items = get().items
        const existing = items.find(i => i.id === item.id)
        if (existing) {
          set({ items: items.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i) })
        } else {
          set({ items: [...items, { ...item, qty: 1 }] })
        }
      },
      removeItem: id => set({ items: get().items.filter(i => i.id !== id) }),
      updateQty: (id, qty) => {
        if (qty <= 0) { get().removeItem(id); return }
        set({ items: get().items.map(i => i.id === id ? { ...i, qty } : i) })
      },
      clear: () => set({ items: [] }),
      total: () => get().items.reduce((s, i) => s + i.price * i.qty, 0),
      count: () => get().items.reduce((s, i) => s + i.qty, 0),
    }),
    { name: 'cart-storage' }
  )
)
