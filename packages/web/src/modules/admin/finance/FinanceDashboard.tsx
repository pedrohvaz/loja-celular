import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/shared/api/axios'
import { formatCurrency } from '@/shared/utils/format'
import { StatCard } from '@/shared/components/ui/stat-card'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, Clock, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#10b981']

export default function FinanceDashboard() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data, isLoading } = useQuery({
    queryKey: ['fin-dashboard', year, month],
    queryFn: () => api.get('/finance/transactions/dashboard', { params: { year, month } }).then(r => r.data),
  })

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i, 1).toLocaleString('pt-BR', { month: 'long' }),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Financeiro</h1>
        </div>
        <div className="flex gap-2">
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            {months.map(m => <option key={m.value} value={m.value} className="capitalize">{m.label}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Receitas Pagas" value={formatCurrency(data?.summary.totalIncome ?? 0)} icon={TrendingUp} iconColor="text-green-600" />
            <StatCard title="Despesas Pagas" value={formatCurrency(data?.summary.totalExpense ?? 0)} icon={TrendingDown} iconColor="text-red-600" />
            <StatCard title="Lucro" value={formatCurrency(data?.summary.profit ?? 0)} icon={DollarSign} iconColor="text-blue-600" />
            <StatCard title="A Receber" value={formatCurrency(data?.summary.toReceive ?? 0)} icon={Clock} iconColor="text-yellow-600" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {data?.last6?.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Receitas vs Despesas</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.last6}>
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend />
                      <Bar dataKey="income" name="Receita" fill="#22c55e" radius={[3,3,0,0]} />
                      <Bar dataKey="expense" name="Despesa" fill="#ef4444" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {data?.incomeByCategory?.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Receita por Categoria</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={data.incomeByCategory} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                        {data.incomeByCategory.map((_: unknown, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {data?.upcoming?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-600" />Próximos Vencimentos</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.upcoming.map((t: { id: string; description: string; amount: number; dueDate: string; type: string; category: { name: string } }) => (
                    <div key={t.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                      <div>
                        <p className="font-medium">{t.description}</p>
                        <p className="text-xs text-muted-foreground">{t.category.name}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(t.amount)}</p>
                        <p className="text-xs text-muted-foreground">{new Date(t.dueDate).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
