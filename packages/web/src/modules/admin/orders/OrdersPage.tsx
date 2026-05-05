import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Eye, Trash2, MessageCircle } from 'lucide-react'
import api from '@/shared/api/axios'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { formatCurrency, formatDate, ORDER_STATUS_LABELS } from '@/shared/utils/format'

interface Order {
  id: string; customer: { name?: string; nome?: string; phone?: string; tel?: string; email?: string }
  items: Array<{ name: string; price: number; qty: number }>
  total: number; payment: string; status: string; source: string; createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800', CONFIRMED: 'bg-blue-100 text-blue-800',
  DELIVERED: 'bg-green-100 text-green-800', CANCELLED: 'bg-red-100 text-red-800',
}

export default function OrdersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [viewOrder, setViewOrder] = useState<Order | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['orders', search, status, page],
    queryFn: () => api.get('/orders', { params: { search, status, page, limit: 15 } }).then(r => r.data),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/orders/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Pedidos</h1><p className="text-muted-foreground text-sm">E-commerce e vendas do balcão</p></div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar pedidos..." className="w-full pl-8 h-9 rounded-md border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
          <option value="">Todos</option>
          <option value="PENDING">Pendente</option>
          <option value="CONFIRMED">Confirmado</option>
          <option value="DELIVERED">Entregue</option>
          <option value="CANCELLED">Cancelado</option>
        </select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Pedido</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Cliente</th>
              <th className="text-right px-4 py-3 font-medium">Total</th>
              <th className="text-center px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => <tr key={i} className="border-b">{[...Array(5)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>)}</tr>)
            ) : data?.data?.map((o: Order) => (
              <tr key={o.id} className="border-b hover:bg-muted/30">
                <td className="px-4 py-3">
                  <p className="font-mono text-xs">{o.id.slice(-8).toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(o.createdAt)} · {o.source === 'pos' ? 'Balcão' : 'E-commerce'}</p>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <p className="font-medium">{(o.customer as Record<string, string>).name ?? (o.customer as Record<string, string>).nome ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">{(o.customer as Record<string, string>).phone ?? (o.customer as Record<string, string>).tel ?? ''}</p>
                </td>
                <td className="px-4 py-3 text-right font-semibold">{formatCurrency(o.total)}</td>
                <td className="px-4 py-3 text-center">
                  <select
                    value={o.status}
                    onChange={e => statusMutation.mutate({ id: o.id, status: e.target.value })}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 cursor-pointer ${STATUS_COLORS[o.status] ?? ''}`}
                  >
                    {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setViewOrder(o)}><Eye className="h-4 w-4" /></Button>
                    {((o.customer as Record<string, string>).phone || (o.customer as Record<string, string>).tel) && (
                      <a href={`https://wa.me/55${((o.customer as Record<string, string>).phone ?? (o.customer as Record<string, string>).tel ?? '').replace(/\D/g,'')}`} target="_blank" rel="noreferrer">
                        <Button variant="ghost" size="icon"><MessageCircle className="h-4 w-4 text-green-600" /></Button>
                      </a>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm('Excluir?')) deleteMutation.mutate(o.id) }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
            <span>{data.total} pedido(s)</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>Próximo</Button>
            </div>
          </div>
        )}
      </div>

      {viewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setViewOrder(null)} />
          <div className="relative bg-card rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="font-bold mb-4">Detalhes do Pedido</h2>
            <div className="space-y-3 text-sm">
              <div><p className="text-muted-foreground">Cliente</p><p className="font-medium">{(viewOrder.customer as Record<string, string>).name ?? (viewOrder.customer as Record<string, string>).nome}</p></div>
              <div>
                <p className="text-muted-foreground mb-1">Itens</p>
                {viewOrder.items.map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{item.name} × {item.qty}</span>
                    <span>{formatCurrency(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold border-t pt-2"><span>Total</span><span>{formatCurrency(viewOrder.total)}</span></div>
            </div>
            <Button className="w-full mt-4" onClick={() => setViewOrder(null)}>Fechar</Button>
          </div>
        </div>
      )}
    </div>
  )
}
