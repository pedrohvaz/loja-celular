import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, Trash2, AlertTriangle } from 'lucide-react'
import api from '@/shared/api/axios'
import { Button } from '@/shared/components/ui/button'
import { StatCard } from '@/shared/components/ui/stat-card'
import { formatDate, formatCurrency, SO_STATUS_LABELS, SO_STATUS_COLORS } from '@/shared/utils/format'
import { Wrench, Package, Clock, DollarSign } from 'lucide-react'

interface SO {
  id: string; number: string; status: string; priority: string; paymentStatus: string
  clientName: string; deviceBrand: string; deviceModel: string
  technician?: string; totalValue: number; estimatedDelivery?: string; createdAt: string; isOverdue?: boolean
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'AWAITING_DIAGNOSIS', label: 'Aguardando Diagnóstico' },
  { value: 'IN_REPAIR', label: 'Em Reparo' },
  { value: 'AWAITING_PART', label: 'Aguardando Peça' },
  { value: 'AWAITING_APPROVAL', label: 'Aguardando Aprovação' },
  { value: 'COMPLETED', label: 'Concluído' },
  { value: 'DELIVERED', label: 'Entregue' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

export default function ServiceOrdersPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['service-orders', search, status, page],
    queryFn: () => api.get('/service-orders', { params: { search, status, page, limit: 15 } }).then(r => r.data),
  })

  const { data: stats } = useQuery({
    queryKey: ['so-stats'],
    queryFn: () => api.get('/service-orders/stats').then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/service-orders/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-orders'] }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ordens de Serviço</h1>
          <p className="text-muted-foreground text-sm">Gerencie todas as OS da sua assistência</p>
        </div>
        <Button onClick={() => navigate('/admin/os/nova')}><Plus className="h-4 w-4" /> Nova OS</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Abertas" value={stats?.open ?? 0} icon={Clock} iconColor="text-yellow-600" />
        <StatCard title="Em Reparo" value={stats?.inRepair ?? 0} icon={Wrench} iconColor="text-blue-600" />
        <StatCard title="Aguard. Peça" value={stats?.awaitingPart ?? 0} icon={Package} iconColor="text-orange-600" />
        <StatCard title="Fat. Mês" value={stats ? formatCurrency(stats.revenueThisMonth) : '—'} icon={DollarSign} iconColor="text-green-600" />
      </div>

      {stats?.overdue > 0 && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          <AlertTriangle className="h-4 w-4" />
          <strong>{stats.overdue}</strong> OS(s) com prazo vencido
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por número, cliente, IMEI..."
            className="w-full pl-8 pr-4 h-9 rounded-md border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">OS</th>
                <th className="text-left px-4 py-3 font-medium">Cliente / Aparelho</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Técnico</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Total</th>
                <th className="text-right px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b">
                    {[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>)}
                  </tr>
                ))
              ) : data?.data?.map((so: SO) => (
                <tr key={so.id} className={`border-b hover:bg-muted/30 ${so.isOverdue ? 'bg-red-50/50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs font-medium">{so.number}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(so.createdAt)}</div>
                    {so.isOverdue && <div className="text-xs text-red-600 flex items-center gap-1 mt-0.5"><AlertTriangle className="h-3 w-3" />Vencida</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{so.clientName}</div>
                    <div className="text-xs text-muted-foreground">{so.deviceBrand} {so.deviceModel}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{so.technician ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SO_STATUS_COLORS[so.status] ?? 'bg-muted text-foreground'}`}>
                      {SO_STATUS_LABELS[so.status] ?? so.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">{formatCurrency(so.totalValue)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/admin/os/${so.id}`}>
                        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                      </Link>
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => { if (confirm('Excluir esta OS?')) deleteMutation.mutate(so.id) }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
            <span>{data.total} resultado(s)</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>Próximo</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
