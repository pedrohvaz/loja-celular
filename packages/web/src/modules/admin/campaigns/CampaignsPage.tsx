import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Edit2, Trash2, Send } from 'lucide-react'
import api from '@/shared/api/axios'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { formatDate } from '@/shared/utils/format'

interface Campaign {
  id: string; name: string; type: string; status: string
  startDate?: string; endDate?: string; audience?: string; message?: string
}

const TYPE_LABELS: Record<string, string> = { WHATSAPP: 'WhatsApp', INSTAGRAM: 'Instagram', EMAIL: 'E-mail', SMS: 'SMS' }
const STATUS_LABELS: Record<string, string> = { PLANNED: 'Planejada', ACTIVE: 'Ativa', PAUSED: 'Pausada', ENDED: 'Encerrada' }
const STATUS_COLORS: Record<string, 'default' | 'success' | 'warning' | 'muted'> = {
  PLANNED: 'default', ACTIVE: 'success', PAUSED: 'warning', ENDED: 'muted',
}

export default function CampaignsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'WHATSAPP', status: 'PLANNED', audience: '', message: '' })

  const { data } = useQuery({
    queryKey: ['campaigns', search],
    queryFn: () => api.get('/campaigns', { params: { search } }).then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: () => editCampaign ? api.patch(`/campaigns/${editCampaign.id}`, form) : api.post('/campaigns', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); setShowModal(false) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/campaigns/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  })

  function openEdit(c?: Campaign) {
    if (c) { setEditCampaign(c); setForm({ name: c.name, type: c.type, status: c.status, audience: c.audience ?? '', message: c.message ?? '' }) }
    else { setEditCampaign(null); setForm({ name: '', type: 'WHATSAPP', status: 'PLANNED', audience: '', message: '' }) }
    setShowModal(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Campanhas</h1><p className="text-muted-foreground text-sm">Gerencie campanhas de marketing</p></div>
        <Button onClick={() => openEdit()}><Plus className="h-4 w-4" /> Nova Campanha</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar campanhas..." className="w-full pl-8 h-9 rounded-md border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.map((c: Campaign) => (
          <div key={c.id} className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">{TYPE_LABELS[c.type]}</p>
              </div>
              <Badge variant={STATUS_COLORS[c.status] ?? 'default'}>{STATUS_LABELS[c.status] ?? c.status}</Badge>
            </div>
            {c.audience && <p className="text-sm text-muted-foreground truncate">{c.audience}</p>}
            {c.message && <p className="text-sm line-clamp-2">{c.message}</p>}
            <div className="flex items-center justify-between pt-1">
              <div className="text-xs text-muted-foreground">{c.startDate ? formatDate(c.startDate) : ''}</div>
              <div className="flex gap-1">
                {c.type === 'WHATSAPP' && c.message && (
                  <a href={`https://wa.me/?text=${encodeURIComponent(c.message)}`} target="_blank" rel="noreferrer">
                    <Button variant="ghost" size="icon"><Send className="h-4 w-4 text-green-600" /></Button>
                  </a>
                )}
                <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit2 className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => { if (confirm('Excluir?')) deleteMutation.mutate(c.id) }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          </div>
        ))}
        {data?.length === 0 && <div className="sm:col-span-2 lg:col-span-3 text-center py-12 text-muted-foreground">Nenhuma campanha cadastrada</div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-card rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="font-semibold">{editCampaign ? 'Editar Campanha' : 'Nova Campanha'}</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium">Nome</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Canal</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Público-alvo</label>
                <input value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))} className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>
              <div>
                <label className="text-sm font-medium">Mensagem</label>
                <textarea rows={4} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button className="flex-1" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>Salvar</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
