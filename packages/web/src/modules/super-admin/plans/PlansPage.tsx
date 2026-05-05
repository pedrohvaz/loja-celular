import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, CreditCard, Check } from 'lucide-react'
import superAdminApi from '@/shared/api/superAdminApi'

interface Plan {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  maxUsers: number
  modules: string[]
  isActive: boolean
  _count?: { tenants: number }
}

const defaultModules = ['store', 'service_orders', 'finance', 'sales', 'campaigns']

export default function PlansPage() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Plan | null>(null)

  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ['super-admin-plans'],
    queryFn: async () => {
      const { data } = await superAdminApi.get('/plans')
      return data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => superAdminApi.delete(`/plans/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['super-admin-plans'] }),
    onError: (err: any) => alert(err.response?.data?.error ?? 'Erro ao excluir plano'),
  })

  function handleDelete(plan: Plan) {
    if (!confirm(`Excluir plano "${plan.name}"?`)) return
    deleteMutation.mutate(plan.id)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Planos</h1>
          <p className="text-slate-400 text-sm mt-0.5">Gerencie os planos disponíveis para as empresas</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-md text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo Plano
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-slate-800 rounded-xl animate-pulse" />)}
        </div>
      ) : plans?.length === 0 ? (
        <div className="text-center py-16">
          <CreditCard className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Nenhum plano cadastrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans?.map(plan => (
            <div key={plan.id} className={`bg-slate-800/50 border rounded-xl p-5 flex flex-col gap-4 ${plan.isActive ? 'border-slate-700' : 'border-slate-700/50 opacity-60'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{plan.name}</h3>
                    {!plan.isActive && <span className="text-xs px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded">Inativo</span>}
                  </div>
                  {plan.description && <p className="text-sm text-slate-400 mt-0.5">{plan.description}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(plan); setShowModal(true) }} className="p-1.5 text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-md transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(plan)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <p className="text-2xl font-bold text-white">
                  {plan.price === 0 ? 'Grátis' : `R$ ${Number(plan.price).toFixed(2).replace('.', ',')}`}
                  {plan.price > 0 && <span className="text-sm text-slate-400 font-normal">/mês</span>}
                </p>
                <p className="text-sm text-slate-500 mt-0.5">Até {plan.maxUsers} usuário(s)</p>
              </div>

              <div className="space-y-1">
                {plan.modules.map(m => (
                  <div key={m} className="flex items-center gap-2 text-sm text-slate-400">
                    <Check className="h-3.5 w-3.5 text-green-400 shrink-0" />
                    <span className="capitalize">{m.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <PlanModal
          plan={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['super-admin-plans'] })
            queryClient.invalidateQueries({ queryKey: ['super-admin-plans-list'] })
            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}

function PlanModal({ plan, onClose, onSaved }: { plan: Plan | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: plan?.name ?? '',
    slug: plan?.slug ?? '',
    description: plan?.description ?? '',
    price: String(plan?.price ?? '0'),
    maxUsers: String(plan?.maxUsers ?? '5'),
    modules: plan?.modules ?? ['store', 'service_orders', 'finance', 'sales'],
    isActive: plan?.isActive ?? true,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function toggleModule(m: string) {
    setForm(f => ({
      ...f,
      modules: f.modules.includes(m) ? f.modules.filter(x => x !== m) : [...f.modules, m],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = { ...form, price: Number(form.price), maxUsers: Number(form.maxUsers) }
      if (plan) {
        await superAdminApi.patch(`/plans/${plan.id}`, payload)
      } else {
        await superAdminApi.post('/plans', payload)
      }
      onSaved()
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Erro ao salvar plano')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">{plan ? 'Editar Plano' : 'Novo Plano'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nome *</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }))} required className={inputClass} placeholder="Pro" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Slug *</label>
              <input type="text" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} required className={inputClass} placeholder="pro" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Descrição</label>
            <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputClass} placeholder="Ideal para lojas em crescimento" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Preço (R$/mês)</label>
              <input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Máx. usuários</label>
              <input type="number" min="1" value={form.maxUsers} onChange={e => setForm(f => ({ ...f, maxUsers: e.target.value }))} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-2">Módulos incluídos</label>
            <div className="grid grid-cols-2 gap-2">
              {defaultModules.map(m => (
                <label key={m} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={form.modules.includes(m)} onChange={() => toggleModule(m)} className="accent-violet-500" />
                  <span className="capitalize">{m.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="accent-violet-500" />
            Plano ativo
          </label>

          {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-md px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md text-sm transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-md text-sm font-medium transition-colors">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
