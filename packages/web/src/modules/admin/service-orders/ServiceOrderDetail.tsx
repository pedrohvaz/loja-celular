import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/shared/api/axios'
import { formatDate, formatCurrency, SO_STATUS_LABELS, SO_STATUS_COLORS } from '@/shared/utils/format'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'

interface ServiceItem { description: string; value: number }
interface PartItem { description: string; quantity: number; unitValue: number }

export default function ServiceOrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: so, isLoading } = useQuery({
    queryKey: ['service-order', id],
    queryFn: () => api.get(`/service-orders/${id}`).then(r => r.data),
    enabled: !!id,
  })

  const [services, setServices] = useState<ServiceItem[]>([])
  const [parts, setParts] = useState<PartItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [paymentStatus, setPaymentStatus] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [techReport, setTechReport] = useState('')
  const [notes, setNotes] = useState('')
  const [newService, setNewService] = useState({ description: '', value: '' })
  const [newPart, setNewPart] = useState({ description: '', quantity: '1', unitValue: '' })

  // Sync state when data loads
  const [initialized, setInitialized] = useState(false)
  if (so && !initialized) {
    setServices(so.servicesPerformed ?? [])
    setParts(so.partsUsed ?? [])
    setDiscount(Number(so.discount))
    setPaymentStatus(so.paymentStatus)
    setPaymentMethod(so.paymentMethod ?? '')
    setTechReport(so.technicalReport ?? '')
    setNotes(so.internalNotes ?? '')
    setInitialized(true)
  }

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch(`/service-orders/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-order', id] }),
  })

  const statusMutation = useMutation({
    mutationFn: ({ status, note }: { status: string; note?: string }) => api.patch(`/service-orders/${id}/status`, { status, note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-order', id] }),
  })

  function addService() {
    if (!newService.description || !newService.value) return
    const updated = [...services, { description: newService.description, value: Number(newService.value) }]
    setServices(updated)
    setNewService({ description: '', value: '' })
    updateMutation.mutate({ servicesPerformed: updated })
  }

  function removeService(idx: number) {
    const updated = services.filter((_, i) => i !== idx)
    setServices(updated)
    updateMutation.mutate({ servicesPerformed: updated })
  }

  function addPart() {
    if (!newPart.description || !newPart.unitValue) return
    const updated = [...parts, { description: newPart.description, quantity: Number(newPart.quantity), unitValue: Number(newPart.unitValue) }]
    setParts(updated)
    setNewPart({ description: '', quantity: '1', unitValue: '' })
    updateMutation.mutate({ partsUsed: updated })
  }

  function removePart(idx: number) {
    const updated = parts.filter((_, i) => i !== idx)
    setParts(updated)
    updateMutation.mutate({ partsUsed: updated })
  }

  function saveFinancial() {
    updateMutation.mutate({ discount, paymentStatus, paymentMethod, technicalReport: techReport, internalNotes: notes })
  }

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>
  if (!so) return <div className="p-8 text-center text-destructive">OS não encontrada</div>

  const serviceTotal = services.reduce((s, x) => s + x.value, 0)
  const partsTotal = parts.reduce((s, x) => s + x.quantity * x.unitValue, 0)
  const total = Math.max(0, serviceTotal + partsTotal - discount)

  const STATUS_OPTIONS = ['AWAITING_DIAGNOSIS','IN_REPAIR','AWAITING_PART','AWAITING_APPROVAL','COMPLETED','DELIVERED','CANCELLED']

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold font-mono">{so.number}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${SO_STATUS_COLORS[so.status] ?? 'bg-muted'}`}>
              {SO_STATUS_LABELS[so.status]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{so.clientName} · {so.deviceBrand} {so.deviceModel}</p>
        </div>
        <select
          onChange={e => e.target.value && statusMutation.mutate({ status: e.target.value })}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          defaultValue=""
        >
          <option value="" disabled>Mudar status...</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{SO_STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Cliente */}
        <div className="rounded-lg border bg-card p-4 space-y-2 text-sm">
          <h3 className="font-semibold">Cliente</h3>
          <p>{so.clientName}</p>
          {so.clientPhone && <p className="text-muted-foreground">{so.clientPhone}</p>}
          {so.clientEmail && <p className="text-muted-foreground">{so.clientEmail}</p>}
          {so.clientCpf && <p className="text-muted-foreground">CPF: {so.clientCpf}</p>}
        </div>
        {/* Aparelho */}
        <div className="rounded-lg border bg-card p-4 space-y-2 text-sm">
          <h3 className="font-semibold">Aparelho</h3>
          <p className="font-medium">{so.deviceBrand} {so.deviceModel}</p>
          {so.deviceImei && <p className="text-muted-foreground">IMEI: {so.deviceImei}</p>}
          {so.deviceColor && <p className="text-muted-foreground">Cor: {so.deviceColor}</p>}
          {so.visualConditions && <p className="text-muted-foreground">{so.visualConditions}</p>}
        </div>
      </div>

      {/* Problema / Laudo */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Problema Relatado</p>
          <p className="text-sm">{so.reportedProblem}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Laudo Técnico</label>
          <textarea rows={3} value={techReport} onChange={e => setTechReport(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Observações Internas</label>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </div>
      </div>

      {/* Serviços */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h3 className="font-semibold">Serviços Realizados</h3>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-muted-foreground"><th className="pb-2">Descrição</th><th className="pb-2 text-right">Valor</th><th /></tr></thead>
          <tbody>
            {services.map((s, i) => (
              <tr key={i} className="border-t">
                <td className="py-1.5">{s.description}</td>
                <td className="py-1.5 text-right">{formatCurrency(s.value)}</td>
                <td className="py-1.5 text-right"><button onClick={() => removeService(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-2">
          <input value={newService.description} onChange={e => setNewService(v => ({ ...v, description: e.target.value }))} placeholder="Descrição do serviço" className="flex-1 h-8 px-3 rounded border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          <input value={newService.value} onChange={e => setNewService(v => ({ ...v, value: e.target.value }))} placeholder="Valor" type="number" step="0.01" className="w-28 h-8 px-3 rounded border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          <Button size="sm" onClick={addService}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Peças */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h3 className="font-semibold">Peças Utilizadas</h3>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-muted-foreground"><th className="pb-2">Descrição</th><th className="pb-2 text-center">Qtd</th><th className="pb-2 text-right">Unit.</th><th className="pb-2 text-right">Total</th><th /></tr></thead>
          <tbody>
            {parts.map((p, i) => (
              <tr key={i} className="border-t">
                <td className="py-1.5">{p.description}</td>
                <td className="py-1.5 text-center">{p.quantity}</td>
                <td className="py-1.5 text-right">{formatCurrency(p.unitValue)}</td>
                <td className="py-1.5 text-right">{formatCurrency(p.quantity * p.unitValue)}</td>
                <td className="py-1.5 text-right"><button onClick={() => removePart(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-2">
          <input value={newPart.description} onChange={e => setNewPart(v => ({ ...v, description: e.target.value }))} placeholder="Descrição da peça" className="flex-1 h-8 px-3 rounded border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          <input value={newPart.quantity} onChange={e => setNewPart(v => ({ ...v, quantity: e.target.value }))} placeholder="Qtd" type="number" className="w-16 h-8 px-3 rounded border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          <input value={newPart.unitValue} onChange={e => setNewPart(v => ({ ...v, unitValue: e.target.value }))} placeholder="Valor unit." type="number" step="0.01" className="w-28 h-8 px-3 rounded border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          <Button size="sm" onClick={addPart}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Financeiro */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h3 className="font-semibold">Financeiro</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><p className="text-muted-foreground">Serviços</p><p className="font-semibold">{formatCurrency(serviceTotal)}</p></div>
          <div><p className="text-muted-foreground">Peças</p><p className="font-semibold">{formatCurrency(partsTotal)}</p></div>
          <div>
            <label className="text-muted-foreground">Desconto</label>
            <input value={discount} onChange={e => setDiscount(Number(e.target.value))} type="number" step="0.01" className="mt-1 w-full h-8 px-3 rounded border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          <div><p className="text-muted-foreground">Total</p><p className="font-bold text-lg text-primary">{formatCurrency(total)}</p></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-muted-foreground">Status Pagamento</label>
            <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="PENDING">Pendente</option>
              <option value="PAID">Pago</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Forma de Pagamento</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="">Selecionar...</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="pix">PIX</option>
              <option value="cartao_credito">Cartão de Crédito</option>
              <option value="cartao_debito">Cartão de Débito</option>
              <option value="transferencia">Transferência</option>
            </select>
          </div>
        </div>
        <Button onClick={saveFinancial} loading={updateMutation.isPending}><Save className="h-4 w-4" /> Salvar Alterações</Button>
      </div>

      {/* Histórico */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="font-semibold mb-3">Histórico de Status</h3>
        <div className="space-y-2">
          {(so.statusHistory as Array<{ status: string; date: string; note?: string }>).map((h, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
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
  )
}
