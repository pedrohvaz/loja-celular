import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Search, Wrench, CheckCircle2, Clock, XCircle, Package } from 'lucide-react'
import api from '@/shared/api/axios'
import { formatDate, SO_STATUS_LABELS, SO_STATUS_COLORS } from '@/shared/utils/format'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'

interface SOPublic {
  id: string; number: string; status: string; priority: string
  clientName: string; deviceBrand: string; deviceModel: string; deviceColor?: string
  reportedProblem: string; technicalReport?: string
  estimatedDelivery?: string; completedAt?: string; deliveredAt?: string
  statusHistory: Array<{ status: string; date: string; note?: string }>
  createdAt: string
}

export default function ConsultaOS() {
  const { slug = 'demo' } = useParams()
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<SOPublic | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSearch() {
    if (!query.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await api.get(`/service-orders/public/${slug}/${encodeURIComponent(query.trim())}`)
      setResult(res.data)
    } catch {
      setError('Ordem de serviço não encontrada. Verifique o número, CPF ou IMEI.')
    } finally { setLoading(false) }
  }

  const statusIcon: Record<string, JSX.Element> = {
    COMPLETED: <CheckCircle2 className="h-4 w-4 text-green-600" />,
    DELIVERED: <CheckCircle2 className="h-4 w-4 text-gray-500" />,
    CANCELLED: <XCircle className="h-4 w-4 text-red-500" />,
    IN_REPAIR: <Wrench className="h-4 w-4 text-blue-600" />,
    AWAITING_PART: <Package className="h-4 w-4 text-orange-600" />,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-background p-4">
      <div className="max-w-2xl mx-auto pt-12">
        <div className="text-center mb-8">
          <Wrench className="h-10 w-10 text-primary mx-auto mb-3" />
          <h1 className="text-2xl font-bold">Consulta de Ordem de Serviço</h1>
          <p className="text-muted-foreground mt-1">Acompanhe o status do seu aparelho</p>
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="flex gap-2">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Número da OS, CPF ou IMEI..."
              className="flex-1 h-10 px-3 rounded-md border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <Button onClick={handleSearch} loading={loading}><Search className="h-4 w-4" /></Button>
          </div>

          {error && <p className="text-sm text-destructive mt-3 text-center">{error}</p>}

          {result && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <div>
                  <p className="font-semibold text-lg">{result.number}</p>
                  <p className="text-sm text-muted-foreground">{result.deviceBrand} {result.deviceModel}{result.deviceColor ? ` · ${result.deviceColor}` : ''}</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${SO_STATUS_COLORS[result.status] ?? 'bg-muted text-foreground'}`}>
                  {SO_STATUS_LABELS[result.status] ?? result.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground">Entrada</p><p className="font-medium">{formatDate(result.createdAt)}</p></div>
                {result.estimatedDelivery && <div><p className="text-muted-foreground">Previsão</p><p className="font-medium">{formatDate(result.estimatedDelivery)}</p></div>}
                {result.completedAt && <div><p className="text-muted-foreground">Concluído</p><p className="font-medium">{formatDate(result.completedAt)}</p></div>}
                {result.deliveredAt && <div><p className="text-muted-foreground">Entregue</p><p className="font-medium">{formatDate(result.deliveredAt)}</p></div>}
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Problema relatado</p>
                <p className="text-sm">{result.reportedProblem}</p>
              </div>

              {result.technicalReport && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Laudo técnico</p>
                  <p className="text-sm">{result.technicalReport}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Histórico</p>
                <div className="space-y-2">
                  {result.statusHistory.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <div className="mt-0.5">{statusIcon[h.status] ?? <Clock className="h-4 w-4 text-muted-foreground" />}</div>
                      <div>
                        <span className="font-medium">{SO_STATUS_LABELS[h.status] ?? h.status}</span>
                        <span className="text-muted-foreground"> · {formatDate(h.date)}</span>
                        {h.note && <p className="text-muted-foreground text-xs">{h.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
