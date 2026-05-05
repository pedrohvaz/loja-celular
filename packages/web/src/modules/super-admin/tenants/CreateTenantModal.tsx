import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import superAdminApi from '@/shared/api/superAdminApi'

interface Props {
  onClose: () => void
}

interface Plan {
  id: string
  name: string
  price: number
}

export default function CreateTenantModal({ onClose }: Props) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    name: '',
    slug: '',
    planId: '',
    phone: '',
    email: '',
    document: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    trialDays: '14',
  })
  const [error, setError] = useState('')

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ['super-admin-plans-list'],
    queryFn: async () => {
      const { data } = await superAdminApi.get('/plans')
      return data
    },
  })

  const mutation = useMutation({
    mutationFn: (payload: typeof form) =>
      superAdminApi.post('/tenants', {
        ...payload,
        planId: payload.planId || undefined,
        trialDays: Number(payload.trialDays),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenants'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin-stats'] })
      onClose()
    },
    onError: (err: any) => {
      setError(err.response?.data?.error ?? 'Erro ao criar empresa')
    },
  })

  function handleSlugFromName(name: string) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    setForm(f => ({ ...f, name, slug }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    mutation.mutate(form)
  }

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      {children}
    </div>
  )

  const inputClass = "w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Nova Empresa</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Empresa */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Dados da empresa</p>
            <div className="space-y-3">
              <Field label="Nome da empresa *">
                <input
                  type="text"
                  value={form.name}
                  onChange={e => handleSlugFromName(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="Ex: Planeta Celular SP"
                />
              </Field>
              <Field label="Slug (URL) *">
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  required
                  pattern="[a-z0-9\-]+"
                  className={inputClass}
                  placeholder="planeta-celular-sp"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="E-mail">
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputClass} placeholder="empresa@email.com" />
                </Field>
                <Field label="Telefone">
                  <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} placeholder="(11) 99999-9999" />
                </Field>
              </div>
              <Field label="CNPJ">
                <input type="text" value={form.document} onChange={e => setForm(f => ({ ...f, document: e.target.value }))} className={inputClass} placeholder="00.000.000/0001-00" />
              </Field>
            </div>
          </div>

          {/* Plano */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Plano e Trial</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Plano">
                <select value={form.planId} onChange={e => setForm(f => ({ ...f, planId: e.target.value }))} className={inputClass}>
                  <option value="">Sem plano</option>
                  {plans?.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Dias de trial">
                <input type="number" min="0" value={form.trialDays} onChange={e => setForm(f => ({ ...f, trialDays: e.target.value }))} className={inputClass} />
              </Field>
            </div>
          </div>

          {/* Admin */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Administrador inicial</p>
            <div className="space-y-3">
              <Field label="Nome do admin *">
                <input type="text" value={form.adminName} onChange={e => setForm(f => ({ ...f, adminName: e.target.value }))} required className={inputClass} placeholder="João Silva" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="E-mail do admin *">
                  <input type="email" value={form.adminEmail} onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))} required className={inputClass} placeholder="joao@empresa.com" />
                </Field>
                <Field label="Senha *">
                  <input type="password" value={form.adminPassword} onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))} required minLength={6} className={inputClass} placeholder="mínimo 6 caracteres" />
                </Field>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-md px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md text-sm transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 py-2 px-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-md text-sm font-medium transition-colors">
              {mutation.isPending ? 'Criando...' : 'Criar Empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
