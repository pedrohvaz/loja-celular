import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Edit2, Trash2, MessageCircle, Download } from 'lucide-react'
import api from '@/shared/api/axios'
import { Button } from '@/shared/components/ui/button'
import { formatDate } from '@/shared/utils/format'
import CustomerModal from './CustomerModal'

interface Customer { id: string; name: string; phone?: string; email?: string; cpf?: string; city?: string; state?: string; createdAt: string }

export default function CustomersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [showModal, setShowModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, page],
    queryFn: () => api.get('/customers', { params: { search, page, limit: 15 } }).then(r => r.data),
  })

  const importMutation = useMutation({
    mutationFn: () => api.post('/customers/import-from-orders'),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['customers'] }); alert(`${res.data.imported} clientes importados`) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Clientes</h1><p className="text-muted-foreground text-sm">Cadastro de clientes</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => importMutation.mutate()} loading={importMutation.isPending}><Download className="h-4 w-4" />Importar</Button>
          <Button onClick={() => { setEditCustomer(null); setShowModal(true) }}><Plus className="h-4 w-4" /> Novo</Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Buscar clientes..." className="w-full pl-8 h-9 rounded-md border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Nome</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Telefone</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">E-mail</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Cidade</th>
              <th className="text-right px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => <tr key={i} className="border-b">{[...Array(5)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>)}</tr>)
            ) : data?.data?.map((c: Customer) => (
              <tr key={c.id} className="border-b hover:bg-muted/30">
                <td className="px-4 py-3">
                  <p className="font-medium">{c.name}</p>
                  {c.cpf && <p className="text-xs text-muted-foreground">{c.cpf}</p>}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{c.phone ?? '—'}</td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{c.email ?? '—'}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{c.city ? `${c.city}/${c.state}` : '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    {c.phone && (
                      <a href={`https://wa.me/55${c.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer">
                        <Button variant="ghost" size="icon"><MessageCircle className="h-4 w-4 text-green-600" /></Button>
                      </a>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => { setEditCustomer(c); setShowModal(true) }}><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm('Excluir?')) deleteMutation.mutate(c.id) }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
            <span>{data.total} cliente(s)</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>Próximo</Button>
            </div>
          </div>
        )}
      </div>

      {showModal && <CustomerModal customer={editCustomer} onClose={() => setShowModal(false)} />}
    </div>
  )
}
