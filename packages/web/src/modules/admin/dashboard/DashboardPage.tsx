import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/shared/hooks/useAuth'
import { formatCurrency } from '@/shared/utils/format'
import { StatCard } from '@/shared/components/ui/stat-card'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import api from '@/shared/api/axios'
import {
  Package, ShoppingCart, Users, Wrench, TrendingUp, TrendingDown,
  DollarSign, AlertTriangle, CheckCircle, Clock
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function DashboardPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const now = new Date()

  const { data: productStats } = useQuery({
    queryKey: ['product-stats'],
    queryFn: () => api.get('/products/stats').then(r => r.data),
  })

  const { data: soStats } = useQuery({
    queryKey: ['so-stats'],
    queryFn: () => api.get('/service-orders/stats').then(r => r.data),
  })

  const { data: finDash } = useQuery({
    queryKey: ['fin-dashboard', now.getFullYear(), now.getMonth() + 1],
    queryFn: () => api.get('/finance/transactions/dashboard', { params: { year: now.getFullYear(), month: now.getMonth() + 1 } }).then(r => r.data),
    enabled: isAdmin,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Visão geral do seu negócio</p>
      </div>

      {/* Produtos */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Estoque</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total de Produtos" value={productStats?.total ?? '—'} icon={Package} />
          <StatCard title="Em Estoque" value={productStats?.inStock ?? '—'} icon={CheckCircle} iconColor="text-green-600" />
          <StatCard title="Sem Estoque" value={productStats?.outOfStock ?? '—'} icon={AlertTriangle} iconColor="text-red-600" />
          <StatCard title="Categorias" value={productStats?.categories ?? '—'} icon={Package} iconColor="text-blue-600" />
        </div>
      </section>

      {/* OS */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Assistência Técnica</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="OS Abertas" value={soStats?.open ?? '—'} icon={Clock} iconColor="text-yellow-600" />
          <StatCard title="Em Reparo" value={soStats?.inRepair ?? '—'} icon={Wrench} iconColor="text-blue-600" />
          <StatCard title="Aguard. Peça" value={soStats?.awaitingPart ?? '—'} icon={Package} iconColor="text-orange-600" />
          <StatCard title="Fat. Mês (OS)" value={soStats ? formatCurrency(soStats.revenueThisMonth) : '—'} icon={DollarSign} iconColor="text-green-600" />
        </div>
        {soStats?.overdue > 0 && (
          <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span><strong>{soStats.overdue}</strong> ordem(ns) com prazo vencido</span>
          </div>
        )}
      </section>

      {/* Financeiro — admin only */}
      {isAdmin && finDash && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Financeiro (Mês Atual)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <StatCard title="Receitas Pagas" value={formatCurrency(finDash.summary.totalIncome)} icon={TrendingUp} iconColor="text-green-600" />
            <StatCard title="Despesas Pagas" value={formatCurrency(finDash.summary.totalExpense)} icon={TrendingDown} iconColor="text-red-600" />
            <StatCard title="Lucro" value={formatCurrency(finDash.summary.profit)} icon={DollarSign} iconColor="text-blue-600" />
            <StatCard title="A Receber" value={formatCurrency(finDash.summary.toReceive)} icon={Clock} iconColor="text-yellow-600" />
          </div>

          {finDash.last6?.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Receitas vs Despesas (6 meses)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={finDash.last6}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="income" name="Receita" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                    <Bar dataKey="expense" name="Despesa" fill="hsl(var(--destructive))" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* Próximos vencimentos */}
      {isAdmin && finDash?.upcoming?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Próximos Vencimentos</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {finDash.upcoming.slice(0, 5).map((t: { id: string; description: string; amount: number; dueDate: string; type: string }) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{t.description}</span>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <Badge variant={t.type === 'INCOME' ? 'success' : 'danger'}>{formatCurrency(t.amount)}</Badge>
                    <span className="text-muted-foreground text-xs">{new Date(t.dueDate).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
