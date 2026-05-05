import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Building2, Check } from 'lucide-react'
import api from '@/shared/api/axios'

interface Plan {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  maxUsers: number
  modules: string[]
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [form, setForm] = useState({
    tenantName: '',
    slug: '',
    phone: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ['public-plans'],
    queryFn: async () => {
      const { data } = await api.get('/settings/plans')
      return data
    },
  })

  function handleNameChange(value: string) {
    const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    setForm(f => ({ ...f, tenantName: value, slug }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.adminPassword !== form.confirmPassword) {
      setError('As senhas não conferem')
      return
    }
    if (form.adminPassword.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/register', {
        tenantName: form.tenantName,
        slug: form.slug,
        phone: form.phone || undefined,
        planId: selectedPlan || undefined,
        adminName: form.adminName,
        adminEmail: form.adminEmail,
        adminPassword: form.adminPassword,
      })
      navigate('/login?registered=1')
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600 mb-4">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Crie sua conta grátis</h1>
          <p className="text-gray-500 mt-2">14 dias de trial sem precisar de cartão</p>
        </div>

        {step === 1 ? (
          /* Step 1 — Escolha o plano */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Escolha seu plano</h2>
            <p className="text-sm text-gray-500 mb-5">Você pode mudar a qualquer momento. Todos têm 14 dias grátis.</p>

            {!plans || plans.length === 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {/* Sem planos cadastrados — continua sem plano */}
                <button
                  onClick={() => { setSelectedPlan(''); setStep(2) }}
                  className="w-full py-3 px-4 border-2 border-violet-600 bg-violet-50 rounded-xl text-violet-700 font-medium"
                >
                  Continuar sem plano específico
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {plans.map(plan => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`text-left p-4 border-2 rounded-xl transition-all ${
                      selectedPlan === plan.id
                        ? 'border-violet-600 bg-violet-50'
                        : 'border-gray-200 hover:border-violet-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">{plan.name}</p>
                        {plan.description && <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>}
                      </div>
                      {selectedPlan === plan.id && (
                        <span className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-white" />
                        </span>
                      )}
                    </div>
                    <p className="text-xl font-bold text-gray-900 mt-3">
                      {Number(plan.price) === 0 ? 'Grátis' : `R$ ${Number(plan.price).toFixed(2).replace('.', ',')}`}
                      {Number(plan.price) > 0 && <span className="text-sm font-normal text-gray-500">/mês</span>}
                    </p>
                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-gray-500">Até {plan.maxUsers} usuário(s)</p>
                      {plan.modules.slice(0, 3).map(m => (
                        <div key={m} className="flex items-center gap-1.5 text-xs text-gray-600">
                          <Check className="w-3 h-3 text-green-500 shrink-0" />
                          <span className="capitalize">{m.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {plans && plans.length > 0 && (
              <button
                onClick={() => setStep(2)}
                disabled={!selectedPlan}
                className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-medium rounded-xl transition-colors"
              >
                Continuar com {plans.find(p => p.id === selectedPlan)?.name ?? '—'}
              </button>
            )}
          </div>
        ) : (
          /* Step 2 — Dados da empresa e admin */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <button onClick={() => setStep(1)} className="text-sm text-violet-600 hover:text-violet-800 mb-4 flex items-center gap-1">
              ← Voltar
            </button>
            <h2 className="text-lg font-semibold text-gray-900 mb-5">Dados da sua empresa</h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Empresa</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome da empresa *</label>
                    <input
                      type="text"
                      value={form.tenantName}
                      onChange={e => handleNameChange(e.target.value)}
                      required
                      className={inputClass}
                      placeholder="Ex: Planeta Celular"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Endereço da sua loja *
                      <span className="text-gray-400 font-normal ml-1">({window.location.origin}/loja/<strong>{form.slug || 'seu-slug'}</strong>)</span>
                    </label>
                    <input
                      type="text"
                      value={form.slug}
                      onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                      required
                      pattern="[a-z0-9\-]+"
                      className={inputClass}
                      placeholder="planeta-celular"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp / Telefone</label>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      className={inputClass}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Seu acesso</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Seu nome *</label>
                    <input
                      type="text"
                      value={form.adminName}
                      onChange={e => setForm(f => ({ ...f, adminName: e.target.value }))}
                      required
                      className={inputClass}
                      placeholder="João Silva"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
                    <input
                      type="email"
                      value={form.adminEmail}
                      onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))}
                      required
                      className={inputClass}
                      placeholder="joao@empresa.com"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
                      <input
                        type="password"
                        value={form.adminPassword}
                        onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))}
                        required
                        minLength={6}
                        className={inputClass}
                        placeholder="mín. 6 caracteres"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha *</label>
                      <input
                        type="password"
                        value={form.confirmPassword}
                        onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                        required
                        className={inputClass}
                        placeholder="repita a senha"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
              >
                {loading ? 'Criando sua conta...' : 'Criar conta grátis'}
              </button>

              <p className="text-xs text-center text-gray-400">
                Ao criar sua conta você concorda com os termos de uso. Sem cartão de crédito.
              </p>
            </form>
          </div>
        )}

        <p className="text-center text-sm text-gray-500 mt-5">
          Já tem uma conta?{' '}
          <Link to="/login" className="text-violet-600 hover:text-violet-800 font-medium">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  )
}
