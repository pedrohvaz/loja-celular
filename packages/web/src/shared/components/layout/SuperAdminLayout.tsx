import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useSuperAdminAuth } from '@/shared/hooks/useSuperAdminAuth'
import { cn } from '@/shared/utils/cn'
import {
  LayoutDashboard, Building2, CreditCard, LogOut, Menu, X, Shield,
} from 'lucide-react'
import superAdminApi from '@/shared/api/superAdminApi'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/super-admin/dashboard' },
  { icon: Building2, label: 'Empresas', to: '/super-admin/tenants' },
  { icon: CreditCard, label: 'Planos', to: '/super-admin/plans' },
]

export default function SuperAdminLayout() {
  const { superAdmin, logout } = useSuperAdminAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function handleLogout() {
    const refreshToken = localStorage.getItem('superAdminRefreshToken')
    try { await superAdminApi.post('/auth/logout', { refreshToken }) } catch { /* ignore */ }
    logout()
    navigate('/super-admin/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-5 w-5 text-violet-400" />
          <h1 className="text-lg font-bold text-white">Super Admin</h1>
        </div>
        <p className="text-xs text-slate-400">{superAdmin?.name} · {superAdmin?.email}</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
              isActive
                ? 'bg-violet-600 text-white'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-red-900/40 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-slate-900 border-r border-slate-700 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-60 h-full bg-slate-900 border-r border-slate-700">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="h-14 border-b border-slate-700 bg-slate-900 flex items-center px-4 gap-3 shrink-0">
          <button className="lg:hidden text-slate-300" onClick={() => setSidebarOpen(o => !o)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex-1" />
          <span className="text-xs text-slate-500 hidden sm:block">Painel de Controle SaaS</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950 text-slate-100">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
