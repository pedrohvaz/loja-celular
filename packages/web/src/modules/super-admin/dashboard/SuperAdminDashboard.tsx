import { useQuery } from '@tanstack/react-query'
import { Building2, Users, Wrench, ShoppingCart, CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import superAdminApi from '@/shared/api/superAdminApi'

interface Stats {
  totalTenants: number
  activeTenants: number
  trialTenants: number
  suspendedTenants: number
  cancelledTenants: number
  totalUsers: number
  totalServiceOrders: number
  totalOrders: number
  recentTenants: Array<{
    id: string
    name: string
    slug: string
    status: string
    createdAt: string
    plan: { name: string } | null
    _count: { users: number }
  }>
}

const statusConfig: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Ativo', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  TRIAL: { label: 'Trial', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  SUSPENDED: { label: 'Suspenso', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate()
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['super-admin-stats'],
    queryFn: async () => {
      const { data } = await superAdminApi.get('/tenants/stats')
      return data
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-slate-800 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-0.5">Visão geral de todas as empresas</p>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Total de Empresas" value={stats?.totalTenants ?? 0} color="violet" />
        <StatCard icon={CheckCircle} label="Ativas" value={stats?.activeTenants ?? 0} color="green" />
        <StatCard icon={Clock} label="Em Trial" value={stats?.trialTenants ?? 0} color="blue" />
        <StatCard icon={AlertTriangle} label="Suspensas" value={stats?.suspendedTenants ?? 0} color="yellow" />
      </div>

      {/* Global counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-700 rounded-lg">
              <Users className="h-5 w-5 text-slate-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.totalUsers ?? 0}</p>
              <p className="text-sm text-slate-400">Usuários totais</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-700 rounded-lg">
              <Wrench className="h-5 w-5 text-slate-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.totalServiceOrders ?? 0}</p>
              <p className="text-sm text-slate-400">Ordens de serviço</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-700 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-slate-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.totalOrders ?? 0}</p>
              <p className="text-sm text-slate-400">Pedidos totais</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent tenants */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="font-semibold text-white">Empresas recentes</h2>
          <button
            onClick={() => navigate('/super-admin/tenants')}
            className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
          >
            Ver todas
          </button>
        </div>
        <div className="divide-y divide-slate-700">
          {stats?.recentTenants.length === 0 && (
            <p className="p-4 text-slate-500 text-sm">Nenhuma empresa cadastrada ainda.</p>
          )}
          {stats?.recentTenants.map(tenant => {
            const s = statusConfig[tenant.status] ?? { label: tenant.status, color: 'bg-slate-500/20 text-slate-400' }
            return (
              <div
                key={tenant.id}
                onClick={() => navigate(`/super-admin/tenants/${tenant.id}`)}
                className="flex items-center justify-between p-4 hover:bg-slate-700/30 cursor-pointer transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{tenant.name}</p>
                  <p className="text-sm text-slate-400">{tenant.slug} · {tenant._count.users} usuário(s)</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  {tenant.plan && (
                    <span className="text-xs text-slate-400 hidden sm:block">{tenant.plan.name}</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType
  label: string
  value: number
  color: 'violet' | 'green' | 'blue' | 'yellow'
}) {
  const colors = {
    violet: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  }
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
      <div className={`inline-flex p-2 rounded-lg border mb-3 ${colors[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-slate-400 mt-0.5">{label}</p>
    </div>
  )
}
