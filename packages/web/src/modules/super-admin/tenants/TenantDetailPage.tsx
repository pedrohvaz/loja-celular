import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Users, Wrench, ShoppingCart, Package, DollarSign } from 'lucide-react'
import superAdminApi from '@/shared/api/superAdminApi'

interface TenantDetail {
  id: string
  name: string
  slug: string
  status: string
  email: string | null
  phone: string | null
  document: string | null
  trialEndsAt: string | null
  modules: string[]
  createdAt: string
  plan: { id: string; name: string; slug: string } | null
  users: Array<{ id: string; name: string; email: string; role: string; createdAt: string }>
  _count: { serviceOrders: number; orders: number; products: number; customers: number; transactions: number }
}

interface Plan {
  id: string
  name: string
}

const statusOptions = [
  { value: 'TRIAL', label: 'Trial' },
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'SUSPENDED', label: 'Suspenso' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-500/20 text-green-400 border-green-500/30',
  TRIAL: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  SUSPENDED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<TenantDetail>>({})
  const [saveError, setSaveError] = useState('')

  const { data: tenant, isLoading } = useQuery<TenantDetail>({
    queryKey: ['super-admin-tenant', id],
    queryFn: async () => {
      const { data } = await superAdminApi.get(`/tenants/${id}`)
      return data
    },
  })

  useEffect(() => {
    if (!tenant) return
    setForm({
      name: tenant.name,
      status: tenant.status,
      email: tenant.email ?? '',
      phone: tenant.phone ?? '',
      document: tenant.document ?? '',
      trialEndsAt: tenant.trialEndsAt ? tenant.trialEndsAt.split('T')[0] : '',
      planId: tenant.plan?.id,
    } as any)
  }, [tenant?.id])

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ['super-admin-plans-list'],
    queryFn: async () => {
      const { data } = await superAdminApi.get('/plans')
      return data
    },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => superAdminApi.patch(`/tenants/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenant', id] })
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenants'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin-stats'] })
      setEditing(false)
      setSaveError('')
    },
    onError: (err: any) => setSaveError(err.response?.data?.error ?? 'Erro ao salvar'),
  })

  if (isLoading) return <div className="text-slate-400 p-8">Carregando...</div>
  if (!tenant) return <div className="text-slate-400 p-8">Empresa não encontrada</div>

  const inputClass = "w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/super-admin/tenants')} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white truncate">{tenant.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${statusColors[tenant.status]}`}>
              {statusOptions.find(s => s.value === tenant.status)?.label ?? tenant.status}
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-0.5">/{tenant.slug} · Criado em {new Date(tenant.createdAt).toLocaleDateString('pt-BR')}</p>
        </div>
        <button
          onClick={() => editing ? updateMutation.mutate(form as any) : setEditing(true)}
          disabled={updateMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-md text-sm font-medium transition-colors"
        >
          <Save className="h-4 w-4" />
          {editing ? (updateMutation.isPending ? 'Salvando...' : 'Salvar') : 'Editar'}
        </button>
      </div>

      {saveError && (
        <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-md px-3 py-2">{saveError}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Info */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <h2 className="font-semibold text-white mb-4">Informações da empresa</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Nome</label>
                {editing ? (
                  <input type="text" value={(form as any).name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} />
                ) : (
                  <p className="text-white">{tenant.name}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Status</label>
                {editing ? (
                  <select value={(form as any).status ?? ''} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inputClass}>
                    {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <p className="text-white">{statusOptions.find(s => s.value === tenant.status)?.label}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">E-mail</label>
                {editing ? (
                  <input type="email" value={(form as any).email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputClass} />
                ) : (
                  <p className="text-white">{tenant.email ?? <span className="text-slate-600">—</span>}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Telefone</label>
                {editing ? (
                  <input type="text" value={(form as any).phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} />
                ) : (
                  <p className="text-white">{tenant.phone ?? <span className="text-slate-600">—</span>}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">CNPJ</label>
                {editing ? (
                  <input type="text" value={(form as any).document ?? ''} onChange={e => setForm(f => ({ ...f, document: e.target.value }))} className={inputClass} />
                ) : (
                  <p className="text-white">{tenant.document ?? <span className="text-slate-600">—</span>}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Trial até</label>
                {editing ? (
                  <input type="date" value={(form as any).trialEndsAt ?? ''} onChange={e => setForm(f => ({ ...f, trialEndsAt: e.target.value }))} className={inputClass} />
                ) : (
                  <p className="text-white">
                    {tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toLocaleDateString('pt-BR') : <span className="text-slate-600">—</span>}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Plano</label>
                {editing ? (
                  <select value={(form as any).planId ?? ''} onChange={e => setForm(f => ({ ...f, planId: e.target.value || null }))} className={inputClass}>
                    <option value="">Sem plano</option>
                    {plans?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                ) : (
                  <p className="text-white">{tenant.plan?.name ?? <span className="text-slate-600">Sem plano</span>}</p>
                )}
              </div>
            </div>
          </div>

          {/* Users */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl">
            <div className="flex items-center gap-2 p-4 border-b border-slate-700">
              <Users className="h-4 w-4 text-slate-400" />
              <h2 className="font-semibold text-white">Usuários ({tenant.users.length})</h2>
            </div>
            <div className="divide-y divide-slate-700">
              {tenant.users.length === 0 && (
                <p className="p-4 text-slate-500 text-sm">Nenhum usuário.</p>
              )}
              {tenant.users.map(u => (
                <div key={u.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-white text-sm font-medium">{u.name}</p>
                    <p className="text-slate-500 text-xs">{u.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${u.role === 'ADMIN' ? 'bg-violet-500/20 text-violet-400 border-violet-500/30' : 'bg-slate-500/20 text-slate-400 border-slate-600'}`}>
                    {u.role === 'ADMIN' ? 'Admin' : 'Funcionário'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column — stats */}
        <div className="space-y-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <h2 className="font-semibold text-white mb-4">Uso da plataforma</h2>
            <div className="space-y-3">
              {[
                { icon: Wrench, label: 'Ordens de serviço', value: tenant._count.serviceOrders },
                { icon: ShoppingCart, label: 'Pedidos', value: tenant._count.orders },
                { icon: Package, label: 'Produtos', value: tenant._count.products },
                { icon: Users, label: 'Clientes', value: tenant._count.customers },
                { icon: DollarSign, label: 'Lançamentos', value: tenant._count.transactions },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </div>
                  <span className="text-white font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <h2 className="font-semibold text-white mb-3">Módulos ativos</h2>
            <div className="flex flex-wrap gap-1.5">
              {tenant.modules.map(m => (
                <span key={m} className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full">{m}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
