import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/shared/api/axios'
import { Button } from '@/shared/components/ui/button'
import { formatCurrency, formatDateTime } from '@/shared/utils/format'
import { LockOpen, Lock, DollarSign } from 'lucide-react'

interface CashRegister {
  id: string; status: 'OPEN' | 'CLOSED'; openedAt: string; closedAt?: string
  openingBalance: number; countedBalance?: number; expectedBalance?: number
  cashIn: number; cashOut: number; difference?: number; notes?: string
}

export default function CashRegisterPage() {
  const qc = useQueryClient()
  const [openingBalance, setOpeningBalance] = useState('0')
  const [countedBalance, setCountedBalance] = useState('0')
  const [notes, setNotes] = useState('')
  const [showOpenModal, setShowOpenModal] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)

  const { data: current } = useQuery({
    queryKey: ['cash-current'],
    queryFn: () => api.get('/finance/cash-register/current').then(r => r.data),
  })

  const { data: history } = useQuery({
    queryKey: ['cash-history'],
    queryFn: () => api.get('/finance/cash-register').then(r => r.data),
  })

  const openMutation = useMutation({
    mutationFn: () => api.post('/finance/cash-register/open', { openingBalance: Number(openingBalance), notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cash-current'] }); qc.invalidateQueries({ queryKey: ['cash-history'] }); setShowOpenModal(false) },
  })

  const closeMutation = useMutation({
    mutationFn: () => api.post('/finance/cash-register/close', { countedBalance: Number(countedBalance), notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cash-current'] }); qc.invalidateQueries({ queryKey: ['cash-history'] }); setShowCloseModal(false) },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Controle de Caixa</h1></div>
        {!current ? (
          <Button onClick={() => setShowOpenModal(true)}><LockOpen className="h-4 w-4" /> Abrir Caixa</Button>
        ) : (
          <Button variant="destructive" onClick={() => setShowCloseModal(true)}><Lock className="h-4 w-4" /> Fechar Caixa</Button>
        )}
      </div>

      {/* Status atual */}
      <div className={`rounded-xl border-2 p-6 ${current ? 'border-green-300 bg-green-50' : 'border-muted bg-muted/30'}`}>
        {current ? (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              <span className="font-semibold text-green-700">Caixa Aberto</span>
              <span className="text-sm text-muted-foreground ml-auto">Desde {formatDateTime(current.openedAt)}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-lg bg-white p-3 text-center shadow-sm">
                <p className="text-xs text-muted-foreground">Abertura</p>
                <p className="font-bold">{formatCurrency(current.openingBalance)}</p>
              </div>
              <div className="rounded-lg bg-white p-3 text-center shadow-sm">
                <p className="text-xs text-muted-foreground">Entradas (dinheiro)</p>
                <p className="font-bold text-green-600">{formatCurrency(current.cashIn)}</p>
              </div>
              <div className="rounded-lg bg-white p-3 text-center shadow-sm">
                <p className="text-xs text-muted-foreground">Saídas (dinheiro)</p>
                <p className="font-bold text-red-600">{formatCurrency(current.cashOut)}</p>
              </div>
              <div className="rounded-lg bg-white p-3 text-center shadow-sm">
                <p className="text-xs text-muted-foreground">Esperado</p>
                <p className="font-bold">{formatCurrency(Number(current.openingBalance) + Number(current.cashIn) - Number(current.cashOut))}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p className="font-medium">Nenhum caixa aberto</p>
            <p className="text-sm">Abra o caixa para registrar movimentações em dinheiro</p>
          </div>
        )}
      </div>

      {/* Histórico */}
      {history?.length > 0 && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/50"><h2 className="font-semibold text-sm">Histórico</h2></div>
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Abertura</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Fechamento</th>
                <th className="text-right px-4 py-3 font-medium">Esperado</th>
                <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Contado</th>
                <th className="text-right px-4 py-3 font-medium">Diferença</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((c: CashRegister) => (
                <tr key={c.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-3">{formatDateTime(c.openedAt)}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{c.closedAt ? formatDateTime(c.closedAt) : '—'}</td>
                  <td className="px-4 py-3 text-right">{c.expectedBalance != null ? formatCurrency(c.expectedBalance) : '—'}</td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">{c.countedBalance != null ? formatCurrency(c.countedBalance) : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {c.difference != null ? (
                      <span className={Number(c.difference) < 0 ? 'text-red-600' : 'text-green-600'}>{formatCurrency(c.difference)}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                      {c.status === 'OPEN' ? 'Aberto' : 'Fechado'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Abrir */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowOpenModal(false)} />
          <div className="relative bg-card rounded-xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h2 className="font-bold">Abrir Caixa</h2>
            <div>
              <label className="text-sm font-medium">Saldo inicial (dinheiro em caixa)</label>
              <input value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} type="number" step="0.01" className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>
            <div>
              <label className="text-sm font-medium">Observação</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowOpenModal(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={() => openMutation.mutate()} loading={openMutation.isPending}>Abrir</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fechar */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCloseModal(false)} />
          <div className="relative bg-card rounded-xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h2 className="font-bold">Fechar Caixa</h2>
            <div>
              <label className="text-sm font-medium">Saldo contado (dinheiro físico)</label>
              <input value={countedBalance} onChange={e => setCountedBalance(e.target.value)} type="number" step="0.01" className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>
            <div>
              <label className="text-sm font-medium">Observação</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowCloseModal(false)}>Cancelar</Button>
              <Button variant="destructive" className="flex-1" onClick={() => closeMutation.mutate()} loading={closeMutation.isPending}>Fechar Caixa</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
