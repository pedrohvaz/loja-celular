import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Edit2, Trash2, Package } from 'lucide-react'
import api from '@/shared/api/axios'
import { Button } from '@/shared/components/ui/button'
import { formatCurrency } from '@/shared/utils/format'
import ProductModal from './ProductModal'

interface Product {
  id: string; name: string; category: string; brand?: string; condition: string
  price: number; oldPrice?: number; imageUrl?: string; inStock: boolean; createdAt: string
}

const CONDITION_LABELS: Record<string, string> = { novo: 'Novo', seminovo: 'Seminovo', usado: 'Usado' }

export default function ProductsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [inStock, setInStock] = useState('')
  const [page, setPage] = useState(1)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [showModal, setShowModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, category, inStock, page],
    queryFn: () => api.get('/products', { params: { search, category, inStock: inStock || undefined, page, limit: 15 } }).then(r => r.data),
  })

  const toggleStock = useMutation({
    mutationFn: ({ id, inStock }: { id: string; inStock: boolean }) => api.patch(`/products/${id}`, { inStock }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="text-muted-foreground text-sm">Gerencie seu catálogo de produtos</p>
        </div>
        <Button onClick={() => { setEditProduct(null); setShowModal(true) }}><Plus className="h-4 w-4" /> Novo Produto</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Buscar produtos..." className="w-full pl-8 h-9 rounded-md border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </div>
        <select value={category} onChange={e => { setCategory(e.target.value); setPage(1) }} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
          <option value="">Todas as categorias</option>
          {['smartphones','capinhas','peliculas','carregadores','audio','cabos'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={inStock} onChange={e => { setInStock(e.target.value); setPage(1) }} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
          <option value="">Todos</option>
          <option value="true">Em estoque</option>
          <option value="false">Sem estoque</option>
        </select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Produto</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Categoria</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Condição</th>
                <th className="text-right px-4 py-3 font-medium">Preço</th>
                <th className="text-center px-4 py-3 font-medium">Estoque</th>
                <th className="text-right px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => <tr key={i} className="border-b">{[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>)}</tr>)
              ) : data?.data?.map((p: Product) => (
                <tr key={p.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-muted overflow-hidden shrink-0">
                        {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" /> : <Package className="h-5 w-5 m-auto mt-2.5 text-muted-foreground" />}
                      </div>
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell capitalize text-muted-foreground">{p.category}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{CONDITION_LABELS[p.condition] ?? p.condition}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-semibold">{formatCurrency(p.price)}</div>
                    {p.oldPrice && <div className="text-xs text-muted-foreground line-through">{formatCurrency(p.oldPrice)}</div>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleStock.mutate({ id: p.id, inStock: !p.inStock })}
                      className={`h-6 w-12 rounded-full transition-colors ${p.inStock ? 'bg-green-500' : 'bg-muted'}`}
                    >
                      <span className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${p.inStock ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditProduct(p); setShowModal(true) }}><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm('Excluir produto?')) deleteMutation.mutate(p.id) }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
            <span>{data.total} produto(s)</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>Próximo</Button>
            </div>
          </div>
        )}
      </div>

      {showModal && <ProductModal product={editProduct} onClose={() => setShowModal(false)} />}
    </div>
  )
}
