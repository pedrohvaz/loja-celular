import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Smartphone, Wrench, ShoppingCart, DollarSign, BarChart2, Users,
  Check, ArrowRight, Star, Zap, Shield, Globe, ChevronRight, Menu, X
} from 'lucide-react'
import { useState } from 'react'
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

const features = [
  {
    icon: Wrench,
    title: 'Ordens de Serviço',
    desc: 'Gerencie reparos com rastreamento completo — diagnóstico, peças, técnico e histórico de status.',
  },
  {
    icon: ShoppingCart,
    title: 'Loja Virtual',
    desc: 'Vitrine online para venda de celulares e acessórios. Seus clientes compram diretamente.',
  },
  {
    icon: DollarSign,
    title: 'Controle Financeiro',
    desc: 'Lançamentos, contas a receber, controle de caixa e relatórios mensais automáticos.',
  },
  {
    icon: Smartphone,
    title: 'PDV (Ponto de Venda)',
    desc: 'Venda balcão com carrinho, desconto, forma de pagamento e registro automático no financeiro.',
  },
  {
    icon: Users,
    title: 'Gestão de Clientes',
    desc: 'Cadastro completo com histórico de pedidos e ordens de serviço por cliente.',
  },
  {
    icon: BarChart2,
    title: 'Dashboard Completo',
    desc: 'Visão geral do negócio: estoque, OS em aberto, receita do mês e alertas de atraso.',
  },
]

const steps = [
  { num: '1', title: 'Crie sua conta', desc: 'Cadastro em 2 minutos. Sem cartão de crédito.' },
  { num: '2', title: 'Configure sua loja', desc: 'Adicione seu logo, WhatsApp e endereço.' },
  { num: '3', title: 'Comece a usar', desc: 'Abra ordens de serviço e venda no mesmo dia.' },
]

const testimonials = [
  {
    name: 'Carlos Mendes',
    role: 'Dono — TechFix Assistência',
    text: 'Antes eu controlava tudo no caderno. Hoje tenho tudo organizado: OS, financeiro e estoque. Economizo 2h por dia.',
    stars: 5,
  },
  {
    name: 'Ana Paula',
    role: 'Gerente — Celular Express',
    text: 'A vitrine online trouxe clientes novos que eu nunca teria. O sistema paga ele mesmo em vendas extras.',
    stars: 5,
  },
  {
    name: 'Roberto Silva',
    role: 'Técnico — RS Celulares',
    text: 'Meus clientes conseguem acompanhar a OS pelo link. Reduziu as ligações de "como tá meu celular?" quase a zero.',
    stars: 5,
  },
]

const moduleLabels: Record<string, string> = {
  store: 'Loja Virtual',
  service_orders: 'Ordens de Serviço',
  finance: 'Financeiro',
  sales: 'PDV / Vendas',
  campaigns: 'Campanhas',
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ['landing-plans'],
    queryFn: async () => {
      const { data } = await api.get('/settings/plans')
      return data
    },
  })

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
              <Smartphone className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg">CelularSys</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href="#funcionalidades" className="hover:text-violet-600 transition-colors">Funcionalidades</a>
            <a href="#como-funciona" className="hover:text-violet-600 transition-colors">Como funciona</a>
            <a href="#planos" className="hover:text-violet-600 transition-colors">Planos</a>
            <a href="#depoimentos" className="hover:text-violet-600 transition-colors">Depoimentos</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Entrar
            </Link>
            <Link
              to="/cadastro"
              className="text-sm bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Testar grátis
            </Link>
          </div>

          <button className="md:hidden" onClick={() => setMenuOpen(o => !o)}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
            <a href="#funcionalidades" className="block text-sm text-gray-600" onClick={() => setMenuOpen(false)}>Funcionalidades</a>
            <a href="#planos" className="block text-sm text-gray-600" onClick={() => setMenuOpen(false)}>Planos</a>
            <Link to="/login" className="block text-sm text-gray-600">Entrar</Link>
            <Link to="/cadastro" className="block text-sm bg-violet-600 text-white px-4 py-2 rounded-lg font-medium text-center">
              Testar grátis
            </Link>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="pt-20 pb-24 px-4 text-center bg-gradient-to-b from-violet-50 to-white">
        <div className="max-w-4xl mx-auto">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 bg-violet-100 px-3 py-1 rounded-full mb-6">
            <Zap className="h-3 w-3" /> 14 dias grátis · Sem cartão de crédito
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            O sistema completo para{' '}
            <span className="text-violet-600">assistências técnicas</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10">
            Gerencie ordens de serviço, loja virtual, PDV e financeiro em um único lugar.
            Simples de usar, poderoso para crescer.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/cadastro"
              className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg shadow-violet-200"
            >
              Criar conta grátis <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg transition-colors"
            >
              Já tenho conta
            </Link>
          </div>
          <p className="text-sm text-gray-400 mt-4">
            Mais de 100 assistências técnicas já usam o sistema
          </p>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="border-y border-gray-100 py-6 bg-white">
        <div className="max-w-4xl mx-auto px-4 flex flex-wrap justify-center gap-8 text-center">
          {[
            { value: '100+', label: 'Lojas ativas' },
            { value: '5.000+', label: 'OS abertas/mês' },
            { value: '99.9%', label: 'Uptime' },
            { value: '4.9★', label: 'Avaliação média' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-2xl font-bold text-violet-600">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="funcionalidades" className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Tudo que sua assistência precisa</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Do atendimento ao financeiro — sem precisar de vários sistemas diferentes.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title} className="p-6 border border-gray-100 rounded-2xl hover:border-violet-200 hover:shadow-md transition-all">
                <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-violet-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="py-24 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Comece em minutos</h2>
            <p className="text-gray-500 text-lg">Sem instalação, sem técnico de TI, sem complicação.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={s.num} className="text-center relative">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[60%] w-full h-px border-t-2 border-dashed border-violet-200" />
                )}
                <div className="w-12 h-12 bg-violet-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4 relative z-10">
                  {s.num}
                </div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="planos" className="py-24 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Planos simples e transparentes</h2>
            <p className="text-gray-500 text-lg">Todos incluem 14 dias grátis. Cancele quando quiser.</p>
          </div>

          {!plans || plans.length === 0 ? (
            <div className="text-center">
              <div className="max-w-sm mx-auto border-2 border-violet-600 rounded-2xl p-8">
                <h3 className="text-2xl font-bold mb-2">Plano Trial</h3>
                <p className="text-4xl font-extrabold text-violet-600 my-4">Grátis <span className="text-lg font-normal text-gray-400">/ 14 dias</span></p>
                <p className="text-gray-500 mb-6">Acesso completo por 14 dias, sem cartão.</p>
                <Link to="/cadastro" className="block w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-center transition-colors">
                  Começar agora
                </Link>
              </div>
            </div>
          ) : (
            <div className={`grid grid-cols-1 gap-6 ${plans.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : 'md:grid-cols-3'}`}>
              {plans.map((plan, i) => {
                const highlight = i === Math.floor(plans.length / 2) || plans.length === 1
                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl p-8 flex flex-col ${
                      highlight
                        ? 'bg-violet-600 text-white shadow-2xl shadow-violet-200 scale-105'
                        : 'border border-gray-200 bg-white'
                    }`}
                  >
                    {highlight && (
                      <span className="text-xs font-bold bg-white/20 text-white px-3 py-1 rounded-full self-start mb-4">
                        Mais popular
                      </span>
                    )}
                    <h3 className={`text-xl font-bold mb-1 ${highlight ? 'text-white' : 'text-gray-900'}`}>
                      {plan.name}
                    </h3>
                    {plan.description && (
                      <p className={`text-sm mb-4 ${highlight ? 'text-violet-100' : 'text-gray-500'}`}>
                        {plan.description}
                      </p>
                    )}
                    <div className="mb-6">
                      <span className={`text-4xl font-extrabold ${highlight ? 'text-white' : 'text-gray-900'}`}>
                        {Number(plan.price) === 0 ? 'Grátis' : `R$ ${Number(plan.price).toFixed(2).replace('.', ',')}`}
                      </span>
                      {Number(plan.price) > 0 && (
                        <span className={`text-sm ${highlight ? 'text-violet-200' : 'text-gray-400'}`}>/mês</span>
                      )}
                    </div>
                    <div className="space-y-2 mb-8 flex-1">
                      <div className={`flex items-center gap-2 text-sm ${highlight ? 'text-violet-100' : 'text-gray-600'}`}>
                        <Check className="h-4 w-4 shrink-0" />
                        Até {plan.maxUsers} usuário(s)
                      </div>
                      {plan.modules.map(m => (
                        <div key={m} className={`flex items-center gap-2 text-sm ${highlight ? 'text-violet-100' : 'text-gray-600'}`}>
                          <Check className="h-4 w-4 shrink-0" />
                          {moduleLabels[m] ?? m}
                        </div>
                      ))}
                    </div>
                    <Link
                      to={`/cadastro?plan=${plan.id}`}
                      className={`block w-full py-3 rounded-xl font-semibold text-center transition-colors ${
                        highlight
                          ? 'bg-white text-violet-600 hover:bg-violet-50'
                          : 'bg-violet-600 hover:bg-violet-700 text-white'
                      }`}
                    >
                      Começar grátis <ChevronRight className="inline h-4 w-4" />
                    </Link>
                  </div>
                )
              })}
            </div>
          )}

          <p className="text-center text-sm text-gray-400 mt-8">
            Todos os planos incluem suporte por e-mail e atualizações gratuitas.
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section id="depoimentos" className="py-24 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">O que nossos clientes dizem</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <div key={t.name} className="bg-white border border-gray-100 rounded-2xl p-6">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-5">"{t.text}"</p>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="py-12 px-4 bg-white border-y border-gray-100">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-8 text-center text-sm text-gray-500">
          {[
            { icon: Shield, text: 'Dados criptografados e seguros' },
            { icon: Globe, text: 'Acesso de qualquer dispositivo' },
            { icon: Zap, text: 'Sem instalação — 100% online' },
          ].map(b => (
            <div key={b.text} className="flex items-center gap-2">
              <b.icon className="h-4 w-4 text-violet-600" />
              {b.text}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 bg-violet-600 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pronto para organizar sua assistência?
          </h2>
          <p className="text-violet-100 text-lg mb-10">
            14 dias grátis. Sem cartão de crédito. Cancele quando quiser.
          </p>
          <Link
            to="/cadastro"
            className="inline-flex items-center gap-2 bg-white text-violet-600 hover:bg-violet-50 px-10 py-4 rounded-xl font-bold text-lg transition-colors shadow-lg"
          >
            Criar minha conta grátis <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 bg-gray-900 text-gray-400 text-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-violet-600 rounded flex items-center justify-center">
              <Smartphone className="h-3 w-3 text-white" />
            </div>
            <span className="text-white font-semibold">CelularSys</span>
          </div>
          <p>© {new Date().getFullYear()} CelularSys. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <Link to="/login" className="hover:text-white transition-colors">Entrar</Link>
            <Link to="/cadastro" className="hover:text-white transition-colors">Cadastrar</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
