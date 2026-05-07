import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/shared/hooks/useAuth'
import { cn } from '@/shared/utils/cn'
import {
  LayoutDashboard, Package, ShoppingCart, Users, Wrench, DollarSign,
  Megaphone, Settings, LogOut, Menu, X, CreditCard, ChevronDown, ChevronRight,
  Clock, AlertTriangle, Store, ExternalLink
} from 'lucide-react'
import api from '@/shared/api/axios'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/admin/dashboard' },
  { icon: Package, label: 'Produtos', to: '/admin/produtos' },
  { icon: ShoppingCart, label: 'Pedidos', to: '/admin/pedidos' },
  { icon: Users, label: 'Clientes', to: '/admin/clientes' },
  { icon: Wrench, label: 'Ordens de Serviço', to: '/admin/os' },
  { icon: CreditCard, label: 'Vendas (POS)', to: '/admin/vendas' },
  {
    icon: DollarSign, label: 'Financeiro', adminOnly: true,
    children: [
      { label: 'Dashboard', to: '/admin/financeiro/dashboard' },
      { label: 'Lançamentos', to: '/admin/financeiro/lancamentos' },
      { label: 'Contas', to: '/admin/financeiro/contas' },
      { label: 'Caixa', to: '/admin/financeiro/caixa' },
      { label: 'Relatórios', to: '/admin/financeiro/relatorios' },
    ],
  },
  { icon: Megaphone, label: 'Campanhas', to: '/admin/campanhas' },
  { icon: Settings, label: 'Configurações', to: '/admin/configuracoes' },
]

function TrialBanner({ trial, status }: { trial?: { daysLeft: number; expired: boolean } | null; status?: string }) {
  if (!trial && status !== 'SUSPENDED' && status !== 'CANCELLED') return null

  if (status === 'SUSPENDED') {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-yellow-50 border-b border-yellow-200 text-yellow-800 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>Sua conta está <strong>suspensa</strong>. Entre em contato com o suporte para regularizar.</span>
      </div>
    )
  }

  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border-b border-red-200 text-red-800 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>Conta <strong>cancelada</strong>. Entre em contato com o suporte.</span>
      </div>
    )
  }

  if (!trial) return null

  if (trial.expired) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border-b border-red-200 text-red-800 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>Seu <strong>trial expirou</strong>. Entre em contato para ativar seu plano e manter o acesso.</span>
      </div>
    )
  }

  if (trial.daysLeft <= 7) {
    const urgent = trial.daysLeft <= 2
    return (
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b text-sm ${urgent ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
        <Clock className="h-4 w-4 shrink-0" />
        <span>
          Seu trial termina em <strong>{trial.daysLeft} dia(s)</strong>.
          {' '}Acesse <strong>Configurações → Plano</strong> para ativar sua assinatura.
        </span>
      </div>
    )
  }

  return null
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [financeOpen, setFinanceOpen] = useState(false)

  async function handleLogout() {
    const refreshToken = localStorage.getItem('refreshToken')
    try { await api.post('/auth/logout', { refreshToken }) } catch { /* ignore */ }
    logout()
    navigate('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h1 className="text-lg font-bold text-primary">{user?.tenantName ?? 'Gestão'}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{user?.name} · {user?.role === 'ADMIN' ? 'Administrador' : 'Funcionário'}</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {navItems.map(item => {
          if (item.adminOnly && user?.role !== 'ADMIN') return null
          if (item.children) {
            return (
              <div key={item.label}>
                <button
                  onClick={() => setFinanceOpen(o => !o)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {financeOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
                {financeOpen && (
                  <div className="ml-6 mt-0.5 space-y-0.5">
                    {item.children.map(child => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) => cn(
                          'flex items-center px-3 py-1.5 rounded-md text-sm transition-colors',
                          isActive ? 'bg-primary text-white' : 'hover:bg-accent'
                        )}
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          }
          return (
            <NavLink
              key={item.to}
              to={item.to!}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                isActive ? 'bg-primary text-white' : 'hover:bg-accent'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="p-2 border-t space-y-0.5">
        {user?.tenantSlug && (
          <a
            href={`/loja/${user.tenantSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors"
          >
            <Store className="h-4 w-4 shrink-0" />
            <span className="flex-1">Minha Vitrine</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </a>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 border-r bg-card shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-60 h-full bg-card border-r">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="h-14 border-b bg-card flex items-center px-4 gap-3 shrink-0">
          <button className="lg:hidden" onClick={() => setSidebarOpen(o => !o)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex-1" />
        </header>

        <TrialBanner trial={user?.trial} status={user?.tenantStatus} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
