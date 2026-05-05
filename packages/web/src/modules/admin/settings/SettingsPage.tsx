import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Users, CreditCard, Save, Plus, Trash2, Check, AlertTriangle } from 'lucide-react'
import api from '@/shared/api/axios'
import { useAuth } from '@/shared/hooks/useAuth'

type Tab = 'profile' | 'users' | 'plan'

interface TenantInfo {
  id: string
  name: string
  slug: string
  status: string
  email: string | null
  phone: string | null
  document: string | null
  trialEndsAt: string | null
  modules: string[]
  settings: Record<string, unknown> | null
  plan: { id: string; name: string; maxUsers: number; price: number } | null
  _count: { users: number }
}

interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'EMPLOYEE'
  createdAt: string
}

interface Plan {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  maxUsers: number
  modules: string[]
}

const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profile')
  const { user: authUser, updateUser } = useAuth()

  const tabs = [
    { id: 'profile' as Tab, label: 'Perfil da empresa', icon: Building2 },
    { id: 'users' as Tab, label: 'Usuários', icon: Users },
    { id: 'plan' as Tab, label: 'Plano', icon: CreditCard },
  ]

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Gerencie sua empresa, usuários e plano</p>
      </div>

      <div className="flex gap-1 border-b">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-violet-600 text-violet-600' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && <ProfileTab onSave={(data) => updateUser({ tenantName: (data as any).name })} />}
      {tab === 'users' && <UsersTab currentUserId={authUser?.id ?? ''} planMaxUsers={authUser?.tenantPlan?.maxUsers} />}
      {tab === 'plan' && <PlanTab currentPlan={authUser?.tenantPlan ?? null} tenantStatus={authUser?.tenantStatus} trial={authUser?.trial} />}
    </div>
  )
}

// ── Profile Tab ────────────────────────────────────────────────────────────

function ProfileTab({ onSave }: { onSave: (data: unknown) => void }) {
  const queryClient = useQueryClient()
  const { data: tenant, isLoading } = useQuery<TenantInfo>({
    queryKey: ['tenant-settings'],
    queryFn: async () => { const { data } = await api.get('/settings'); return data },
  })

  const [form, setForm] = useState<Record<string, string> | null>(null)
  const [saved, setSaved] = useState(false)

  const init = (t: TenantInfo): Record<string, string> => ({
    name: t.name,
    email: t.email ?? '',
    phone: t.phone ?? '',
    document: t.document ?? '',
    whatsapp: (t.settings as any)?.whatsapp ?? '',
    address: (t.settings as any)?.address ?? '',
  })

  const mutation = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { data } = await api.patch('/settings', {
        name: values.name,
        email: values.email || null,
        phone: values.phone || null,
        document: values.document || null,
        settings: { whatsapp: values.whatsapp, address: values.address },
      })
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings'] })
      onSave(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  if (isLoading || !tenant) return <div className="text-muted-foreground text-sm py-8">Carregando...</div>

  const values: Record<string, string> = form ?? init(tenant)

  return (
    <div className="bg-card border rounded-xl p-5 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { key: 'name', label: 'Nome da empresa *', type: 'text' },
          { key: 'email', label: 'E-mail comercial', type: 'email' },
          { key: 'phone', label: 'Telefone', type: 'text' },
          { key: 'document', label: 'CNPJ', type: 'text' },
          { key: 'whatsapp', label: 'WhatsApp (com DDD)', type: 'text' },
          { key: 'address', label: 'Endereço', type: 'text' },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-sm font-medium mb-1">{f.label}</label>
            <input
              type={f.type}
              value={values[f.key] ?? ''}
              onChange={e => setForm({ ...values, [f.key]: e.target.value })}
              className={inputClass}
            />
          </div>
        ))}
      </div>

      <div className="pt-1 flex items-center gap-3">
        <button
          onClick={() => mutation.mutate(values)}
          disabled={mutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Save className="h-4 w-4" />
          {mutation.isPending ? 'Salvando...' : 'Salvar alterações'}
        </button>
        {saved && <span className="text-green-600 text-sm flex items-center gap-1"><Check className="h-4 w-4" /> Salvo!</span>}
      </div>

      <div className="pt-2 border-t">
        <p className="text-xs text-muted-foreground">Slug da empresa: <code className="bg-muted px-1.5 py-0.5 rounded">{tenant.slug}</code> — usado na URL da loja e login.</p>
      </div>
    </div>
  )
}

// ── Users Tab ──────────────────────────────────────────────────────────────

function UsersTab({ currentUserId, planMaxUsers }: { currentUserId: string; planMaxUsers?: number }) {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', role: 'EMPLOYEE' })
  const [addError, setAddError] = useState('')

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['tenant-users'],
    queryFn: async () => { const { data } = await api.get('/users'); return data },
  })

  const addMutation = useMutation({
    mutationFn: (payload: typeof addForm) => api.post('/users', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users'] })
      setShowAdd(false)
      setAddForm({ name: '', email: '', password: '', role: 'EMPLOYEE' })
      setAddError('')
    },
    onError: (err: any) => setAddError(err.response?.data?.error ?? 'Erro ao criar usuário'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenant-users'] }),
    onError: (err: any) => alert(err.response?.data?.error ?? 'Erro ao excluir'),
  })

  const maxUsers = planMaxUsers ?? 999
  const atLimit = (users?.length ?? 0) >= maxUsers

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {users?.length ?? 0} de {planMaxUsers ? `${planMaxUsers} usuário(s) do plano` : 'usuários ilimitados'}
        </p>
        {atLimit ? (
          <div className="flex items-center gap-1.5 text-sm text-amber-600">
            <AlertTriangle className="h-4 w-4" />
            Limite atingido — faça upgrade para adicionar mais
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm transition-colors"
          >
            <Plus className="h-4 w-4" /> Novo usuário
          </button>
        )}
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center text-muted-foreground text-sm">Carregando...</div>
        ) : (
          <div className="divide-y">
            {users?.map(u => (
              <div key={u.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-sm">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    u.role === 'ADMIN'
                      ? 'bg-violet-50 text-violet-700 border-violet-200'
                      : 'bg-muted text-muted-foreground border-border'
                  }`}>
                    {u.role === 'ADMIN' ? 'Admin' : 'Funcionário'}
                  </span>
                  {u.id !== currentUserId && (
                    <button
                      onClick={() => confirm('Excluir este usuário?') && deleteMutation.mutate(u.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <h3 className="font-medium text-sm">Adicionar usuário</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Nome *</label>
              <input type="text" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="Nome completo" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">E-mail *</label>
              <input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} className={inputClass} placeholder="email@empresa.com" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Senha *</label>
              <input type="password" value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} className={inputClass} placeholder="mín. 6 caracteres" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Perfil</label>
              <select value={addForm.role} onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))} className={inputClass}>
                <option value="EMPLOYEE">Funcionário</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
          </div>
          {addError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{addError}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setShowAdd(false); setAddError('') }} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted transition-colors">Cancelar</button>
            <button
              onClick={() => addMutation.mutate(addForm)}
              disabled={addMutation.isPending || !addForm.name || !addForm.email || !addForm.password}
              className="px-3 py-1.5 text-sm bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {addMutation.isPending ? 'Criando...' : 'Criar usuário'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Plan Tab ───────────────────────────────────────────────────────────────

function PlanTab({ currentPlan, tenantStatus, trial }: {
  currentPlan: { id?: string; name: string; maxUsers: number; price?: number } | null
  tenantStatus?: string
  trial?: { daysLeft: number; expired: boolean } | null
}) {
  const { data: plans } = useQuery<Plan[]>({
    queryKey: ['available-plans'],
    queryFn: async () => { const { data } = await api.get('/settings/plans'); return data },
  })

  const statusLabel: Record<string, { label: string; color: string }> = {
    ACTIVE: { label: 'Ativo', color: 'text-green-700 bg-green-50 border-green-200' },
    TRIAL: { label: 'Trial', color: 'text-blue-700 bg-blue-50 border-blue-200' },
    SUSPENDED: { label: 'Suspenso', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
    CANCELLED: { label: 'Cancelado', color: 'text-red-700 bg-red-50 border-red-200' },
  }
  const s = statusLabel[tenantStatus ?? ''] ?? { label: tenantStatus ?? '', color: '' }

  return (
    <div className="space-y-5">
      {/* Status atual */}
      <div className="bg-card border rounded-xl p-5">
        <h2 className="font-semibold mb-3">Status da conta</h2>
        <div className="flex flex-wrap items-center gap-4">
          <span className={`text-sm px-3 py-1 rounded-full border font-medium ${s.color}`}>{s.label}</span>
          {trial && !trial.expired && (
            <p className="text-sm text-muted-foreground">
              Trial encerra em <strong>{trial.daysLeft} dia(s)</strong>
            </p>
          )}
          {trial?.expired && (
            <p className="text-sm text-red-600 font-medium">Trial expirado</p>
          )}
        </div>

        <div className="mt-4 pt-4 border-t">
          <p className="text-sm font-medium mb-1">Plano atual</p>
          {currentPlan ? (
            <p className="text-sm text-muted-foreground">
              <strong>{currentPlan.name}</strong> — até {currentPlan.maxUsers} usuário(s)
              {currentPlan.price !== undefined && currentPlan.price > 0 && ` · R$ ${Number(currentPlan.price).toFixed(2).replace('.', ',')}/mês`}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Sem plano definido (trial)</p>
          )}
        </div>
      </div>

      {/* Planos disponíveis */}
      {plans && plans.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">Planos disponíveis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map(plan => {
              const isCurrent = plan.id === currentPlan?.id
              return (
                <div key={plan.id} className={`border rounded-xl p-4 ${isCurrent ? 'border-violet-400 bg-violet-50' : 'border-border bg-card'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold">{plan.name}</p>
                      {plan.description && <p className="text-xs text-muted-foreground">{plan.description}</p>}
                    </div>
                    {isCurrent && (
                      <span className="text-xs px-2 py-0.5 bg-violet-600 text-white rounded-full">Atual</span>
                    )}
                  </div>
                  <p className="text-xl font-bold mt-2">
                    {Number(plan.price) === 0 ? 'Grátis' : `R$ ${Number(plan.price).toFixed(2).replace('.', ',')}`}
                    {Number(plan.price) > 0 && <span className="text-sm font-normal text-muted-foreground">/mês</span>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Até {plan.maxUsers} usuário(s)</p>
                  <div className="mt-3 space-y-1">
                    {plan.modules.map(m => (
                      <div key={m} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Check className="h-3 w-3 text-green-500 shrink-0" />
                        <span className="capitalize">{m.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                  {!isCurrent && (
                    <button
                      onClick={() => alert('Para fazer upgrade, entre em contato com o suporte.')}
                      className="mt-4 w-full py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
                    >
                      Selecionar plano
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Para fazer upgrade ou downgrade, entre em contato com o suporte.
          </p>
        </div>
      )}
    </div>
  )
}
