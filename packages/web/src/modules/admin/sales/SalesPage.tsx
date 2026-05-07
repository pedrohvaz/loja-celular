import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Minus, Trash2, Receipt, Search, ShoppingCart, AlertCircle, CheckCircle2 } from 'lucide-react'
import api from '@/shared/api/axios'
import { Button } from '@/shared/components/ui/button'
import { formatCurrency } from '@/shared/utils/format'
import { useNavigate } from 'react-router-dom'

interface Product { id: string; name: string; price: number; category: string; imageUrl?: string; inStock: boolean }
interface CartItem extends Product { qty: number }

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
}

export default function SalesPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [cart, setCart] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [payment, setPayment] = useState('pix')
  const [customerName, setCustomerName] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [lastSale, setLastSale] = useState<{ total: number; payment: string; items: number } | null>(null)
  const [saleError, setSaleError] = useState('')

  const { data: cashData } = useQuery({
    queryKey: ['cash-current'],
    queryFn: () => api.get('/finance/cash-register/current').then(r => r.data),
  })

  const { data: productsData } = useQuery({
    queryKey: ['pos-products'],
    queryFn: () => api.get('/products', { params: { limit: 200 } }).then(r => r.data),
  })

  const products: Product[] = productsData?.data ?? []

  const categories = useMemo(() => {
    const cats = [...new Set(products.map((p: Product) => p.category))].sort()
    return cats
  }, [products])

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
      const matchCat = !categoryFilter || p.category === categoryFilter
      return matchSearch && matchCat
    })
  }, [products, search, categoryFilter])

  const saleMutation = useMutation({
    mutationFn: (data: object) => api.post('/sales', data),
    onSuccess: (res) => {
      const order = res.data
      setLastSale({
        total: Number(order.total),
        payment,
        items: cart.reduce((s, i) => s + i.qty, 0),
      })
      setCart([])
      setDiscount(0)
      setCustomerName('')
      setSaleError('')
      // Invalida financeiro para refletir a nova transação
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['finance-dashboard'] })
      qc.invalidateQueries({ queryKey: ['cash-current'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
    onError: (err: any) => {
      setSaleError(err.response?.data?.error ?? 'Erro ao processar venda. Tente novamente.')
    },
  })

  function addToCart(product: Product) {
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id)
      return ex ? prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i) : [...prev, { ...product, qty: 1 }]
    })
    setLastSale(null)
    setSaleError('')
  }

  function updateQty(id: string, qty: number) {
    if (qty <= 0) { setCart(prev => prev.filter(i => i.id !== id)); return }
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i))
  }

  const subtotal = cart.reduce((s, i) => s + Number(i.price) * i.qty, 0)
  const total = Math.max(0, subtotal - discount)

  function finalizeSale() {
    if (!cashData) return
    if (cart.length === 0) return
    setSaleError('')
    saleMutation.mutate({
      items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, category: i.category, image: i.imageUrl })),
      discount,
      payment,
      customerName: customerName || undefined,
    })
  }

  return (
    <div className="space-y-4 h-full">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Ponto de Venda</h1>
        {!cashData ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" /> Caixa fechado
            </span>
            <Button size="sm" variant="outline" onClick={() => navigate('/admin/financeiro/caixa')}>
              Abrir caixa
            </Button>
          </div>
        ) : (
          <span className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> Caixa aberto
          </span>
        )}
      </div>

      {/* Sucesso */}
      {lastSale && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-800">Venda realizada com sucesso!</p>
            <p className="text-sm text-green-700 mt-0.5">
              {lastSale.items} item(s) · {formatCurrency(lastSale.total)} · {PAYMENT_LABELS[lastSale.payment] ?? lastSale.payment}
            </p>
            <p className="text-xs text-green-600 mt-1">Lançamento financeiro criado automaticamente.</p>
          </div>
        </div>
      )}

      {/* Erro */}
      {saleError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{saleError}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Produtos */}
        <div className="lg:col-span-2 space-y-3">
          {/* Filtros */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar produto..."
                className="w-full pl-9 pr-3 h-9 rounded-md border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="h-9 px-3 rounded-md border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Todas as categorias</option>
              {categories.map(c => (
                <option key={c} value={c} className="capitalize">{c}</option>
              ))}
            </select>
          </div>

          {/* Grade de produtos */}
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {filtered.map((product: Product) => {
                const inCart = cart.find(i => i.id === product.id)
                const outOfStock = !product.inStock
                return (
                  <button
                    key={product.id}
                    onClick={() => !outOfStock && addToCart(product)}
                    disabled={outOfStock}
                    className={`text-left rounded-lg border p-3 transition-all relative ${
                      outOfStock
                        ? 'opacity-50 cursor-not-allowed bg-muted'
                        : inCart
                          ? 'border-primary bg-primary/5 hover:shadow-sm'
                          : 'bg-card hover:border-primary hover:shadow-sm'
                    }`}
                  >
                    {inCart && !outOfStock && (
                      <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">
                        {inCart.qty}
                      </span>
                    )}
                    {outOfStock && (
                      <span className="absolute top-2 right-2 text-xs bg-muted-foreground/20 text-muted-foreground px-1.5 py-0.5 rounded">
                        Sem estoque
                      </span>
                    )}
                    <p className="font-medium text-sm truncate pr-16">{product.name}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">{product.category}</p>
                    <p className={`font-bold mt-1.5 text-sm ${outOfStock ? 'text-muted-foreground' : 'text-primary'}`}>
                      {formatCurrency(product.price)}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Carrinho */}
        <div className="space-y-3">
          <div className="rounded-lg border bg-card p-4 space-y-3 sticky top-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Carrinho
              </h2>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                  Limpar
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Clique nos produtos para adicionar</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-xs">{item.name}</p>
                      <p className="text-muted-foreground text-xs">{formatCurrency(item.price)} × {item.qty} = {formatCurrency(Number(item.price) * item.qty)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => updateQty(item.id, item.qty - 1)} className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-medium">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.qty + 1)} className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted">
                        <Plus className="h-3 w-3" />
                      </button>
                      <button onClick={() => updateQty(item.id, 0)} className="ml-1">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Desconto (R$)</span>
                <input
                  value={discount || ''}
                  onChange={e => setDiscount(Number(e.target.value) || 0)}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  className="w-24 h-7 px-2 text-right rounded border border-input bg-transparent text-sm"
                />
              </div>
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <input
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Nome do cliente (opcional)"
                className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <select
                value={payment}
                onChange={e => setPayment(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="pix">PIX</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao_credito">Cartão de Crédito</option>
                <option value="cartao_debito">Cartão de Débito</option>
              </select>

              {!cashData && (
                <p className="text-xs text-yellow-700 bg-yellow-50 rounded px-2 py-1.5 text-center">
                  Abra o caixa para finalizar vendas
                </p>
              )}

              <Button
                className="w-full"
                onClick={finalizeSale}
                loading={saleMutation.isPending}
                disabled={!cashData || cart.length === 0}
              >
                <Receipt className="h-4 w-4" />
                {saleMutation.isPending ? 'Processando...' : `Finalizar · ${formatCurrency(total)}`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
