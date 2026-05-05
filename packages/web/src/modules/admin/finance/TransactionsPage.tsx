import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, CheckCircle, Trash2 } from 'lucide-react'
import api from '@/shared/api/axios'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { formatCurrency, formatDate } from '@/shared/utils/format'

interface Transaction {
  id: string; number: string; type: 'INCOME' | 'EXPENSE'; description: string; amount: number
  status: string; transactionDate: string; dueDate?: string; paymentMethod?: string; source: string
  category: { id: string; name: string }
}

export default function TransactionsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', search, type, status, page],
    queryFn: () => api.get('/finance/transactions', { params: { search, type, status, page, limit: 20 } }).then(r => r.data),
  })

  const payMutation = useMutation({
    mutationFn: ({ id, method }: { id: string; method: string }) => api.patch(`/finance/transactions/${id}/pay`, { paymentMethod: method }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/finance/transactions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lançamentos</h1>
          <p className="text-muted-foreground text-sm">Receitas e despesas do período</p>
        </div>
      </div>

      {data?.summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border bg-card p-4"><p className="text-sm text-muted-foreground">Receitas</p><p className="text-xl font-bold text-green-600">{formatCurrency(data.summary.income)}</p></div>
          <div className="rounded-lg border bg-card p-4"><p className="text-sm text-muted-foreground">Despesas</p><p className="text-xl font-bold text-red-600">{formatCurrency(data.summary.expense)}</p></div>
          <div className="rounded-lg border bg-card p-4"><p className="text-sm text-muted-foreground">Saldo</p><p className={`text-xl font-bold ${data.summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(data.summary.balance)}</p></div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Buscar lançamentos..." className="w-full pl-8 h-9 rounded-md border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </div>
        <select value={type} onChange={e => { setType(e.target.value); setPage(1) }} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
          <option value="">Receitas e Despesas</option>
          <option value="INCOME">Receitas</option>
          <option value="EXPENSE">Despesas</option>
        </select>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
          <option value="">Todos os status</option>
          <option value="PENDING">Pendente</option>
          <option value="PAID">Pago</option>
          <option value="CANCELLED">Cancelado</option>
        </select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Descrição</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Categoria</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Data</th>
                <th className="text-right px-4 py-3 font-medium">Valor</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => <tr key={i} className="border-b">{[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>)}</tr>)
              ) : data?.data?.map((t: Transaction) => (
                <tr key={t.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{t.description}</p>
                    <p className="text-xs text-muted-foreground font-mono">{t.number}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{t.category.name}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{formatDate(t.transactionDate)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={t.status === 'PAID' ? 'success' : t.status === 'CANCELLED' ? 'muted' : 'warning'}>
                      {t.status === 'PAID' ? 'Pago' : t.status === 'CANCELLED' ? 'Cancelado' : 'Pendente'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {t.status === 'PENDING' && (
                        <Button variant="ghost" size="icon" title="Marcar como pago" onClick={() => payMutation.mutate({ id: t.id, method: 'dinheiro' })}>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm('Excluir?')) deleteMutation.mutate(t.id) }}>
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
            <span>{data.total} lançamento(s)</span>
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
