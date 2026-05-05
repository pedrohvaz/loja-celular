import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Building2, Eye, Trash2 } from 'lucide-react'
import superAdminApi from '@/shared/api/superAdminApi'
import CreateTenantModal from './CreateTenantModal'

interface Tenant {
  id: string
  name: string
  slug: string
  status: string
  email: string | null
  phone: string | null
  trialEndsAt: string | null
  createdAt: string
  plan: { id: string; name: string } | null
  _count: { users: number; serviceOrders: number; orders: number }
}

const statusConfig: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Ativo', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  TRIAL: { label: 'Trial', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  SUSPENDED: { label: 'Suspenso', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
}

export default function TenantsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['super-admin-tenants', search, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      params.set('page', String(page))
      const { data } = await superAdminApi.get(`/tenants?${params}`)
      return data as { tenants: Tenant[]; total: number; pages: number }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => superAdminApi.delete(`/tenants/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['super-admin-tenants'] }),
  })

  function handleDelete(tenant: Tenant) {
    if (!confirm(`Deletar permanentemente "${tenant.name}"? Esta ação não pode ser desfeita.`)) return
    deleteMutation.mutate(tenant.id)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Empresas</h1>
          <p className="text-slate-400 text-sm mt-0.5">{data?.total ?? 0} empresa(s) cadastrada(s)</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-md text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova Empresa
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por nome, slug ou e-mail..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="">Todos os status</option>
          <option value="ACTIVE">Ativo</option>
          <option value="TRIAL">Trial</option>
          <option value="SUSPENDED">Suspenso</option>
          <option value="CANCELLED">Cancelado</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Carregando...</div>
        ) : data?.tenants.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Nenhuma empresa encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-700">
                <tr className="text-left text-slate-400">
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Plano</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Usuários</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Cadastro</th>
                  <th className="px-4 py-3 font-medium w-20">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {data?.tenants.map(tenant => {
                  const s = statusConfig[tenant.status] ?? { label: tenant.status, color: '' }
                  return (
                    <tr key={tenant.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{tenant.name}</p>
                        <p className="text-slate-500 text-xs">{tenant.slug}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-slate-400">
                        {tenant.plan?.name ?? <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-slate-400">
                        {tenant._count.users}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-slate-500">
                        {new Date(tenant.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/super-admin/tenants/${tenant.id}`)}
                            className="p-1.5 text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-md transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(tenant)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                            title="Deletar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
            <p className="text-sm text-slate-500">Página {page} de {data.pages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-300 rounded-md transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                disabled={page === data.pages}
                className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-300 rounded-md transition-colors"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreate && <CreateTenantModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
