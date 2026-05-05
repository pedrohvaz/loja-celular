import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Plus, Minus, Trash2, Receipt } from 'lucide-react'
import api from '@/shared/api/axios'
import { Button } from '@/shared/components/ui/button'
import { formatCurrency } from '@/shared/utils/format'

interface Product { id: string; name: string; price: number; category: string; imageUrl?: string; inStock: boolean }
interface CartItem extends Product { qty: number }

export default function SalesPage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [payment, setPayment] = useState('pix')
  const [customerName, setCustomerName] = useState('')
  const [success, setSuccess] = useState(false)

  const { data: cashData } = useQuery({
    queryKey: ['cash-current'],
    queryFn: () => api.get('/finance/cash-register/current').then(r => r.data),
  })

  const { data: productsData } = useQuery({
    queryKey: ['pos-products'],
    queryFn: () => api.get('/products', { params: { inStock: 'true', limit: 100 } }).then(r => r.data),
  })

  const saleMutation = useMutation({
    mutationFn: (data: object) => api.post('/sales', data),
    onSuccess: () => {
      setCart([]); setDiscount(0); setCustomerName(''); setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    },
  })

  function addToCart(product: Product) {
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id)
      return ex ? prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i) : [...prev, { ...product, qty: 1 }]
    })
  }

  function updateQty(id: string, qty: number) {
    if (qty <= 0) { setCart(prev => prev.filter(i => i.id !== id)); return }
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i))
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const total = Math.max(0, subtotal - discount)

  function finalizeSale() {
    if (!cashData) return alert('Abra o caixa primeiro!')
    if (cart.length === 0) return alert('Adicione produtos ao carrinho')
    saleMutation.mutate({
      items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, category: i.category, image: i.imageUrl })),
      discount, payment, customerName: customerName || undefined,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ponto de Venda</h1>
        {!cashData && (
          <div className="text-sm text-yellow-700 bg-yellow-50 px-3 py-1.5 rounded-lg">⚠ Caixa fechado — abra o caixa primeiro</div>
        )}
      </div>

      {success && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm font-medium">✓ Venda realizada com sucesso!</div>}

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Produtos */}
        <div className="lg:col-span-2 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {productsData?.data?.map((product: Product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="text-left rounded-lg border bg-card p-3 hover:border-primary hover:shadow-sm transition-all"
              >
                <p className="font-medium text-sm truncate">{product.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{product.category}</p>
                <p className="text-primary font-bold mt-1">{formatCurrency(product.price)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Carrinho */}
        <div className="space-y-3">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h2 className="font-semibold">Carrinho</h2>

            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Adicione produtos</p>
            ) : (
              <div className="space-y-2">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="text-muted-foreground">{formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.id, item.qty - 1)} className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted"><Minus className="h-3 w-3" /></button>
                      <span className="w-6 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.qty + 1)} className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted"><Plus className="h-3 w-3" /></button>
                    </div>
                    <button onClick={() => updateQty(item.id, 0)}><Trash2 className="h-4 w-4 text-destructive" /></button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex items-center justify-between text-sm">
                <span>Desconto</span>
                <input value={discount} onChange={e => setDiscount(Number(e.target.value))} type="number" step="0.01" className="w-24 h-7 px-2 text-right rounded border border-input bg-transparent text-sm" />
              </div>
              <div className="flex justify-between font-bold"><span>Total</span><span className="text-primary">{formatCurrency(total)}</span></div>
            </div>

            <div className="space-y-2">
              <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nome do cliente (opcional)" className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              <select value={payment} onChange={e => setPayment(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="pix">PIX</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao_credito">Cartão de Crédito</option>
                <option value="cartao_debito">Cartão de Débito</option>
              </select>
              <Button className="w-full" onClick={finalizeSale} loading={saleMutation.isPending} disabled={!cashData || cart.length === 0}>
                <Receipt className="h-4 w-4" /> Finalizar Venda
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
