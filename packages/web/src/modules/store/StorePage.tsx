import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ShoppingCart, Search, Package } from 'lucide-react'
import api from '@/shared/api/axios'
import { useCart } from '@/shared/hooks/useCart'
import { formatCurrency } from '@/shared/utils/format'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Input } from '@/shared/components/ui/input'

interface Product {
  id: string; name: string; category: string; brand?: string; condition: string
  price: number; oldPrice?: number; description?: string; imageUrl?: string; inStock: boolean
}

const CATEGORIES = [
  { value: '', label: 'Todos' }, { value: 'smartphones', label: 'Smartphones' },
  { value: 'capinhas', label: 'Capinhas' }, { value: 'peliculas', label: 'Películas' },
  { value: 'carregadores', label: 'Carregadores' }, { value: 'audio', label: 'Áudio' },
  { value: 'cabos', label: 'Cabos' },
]

export default function StorePage() {
  const { slug = 'demo' } = useParams()
  const { addItem, count } = useCart()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [added, setAdded] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['public-products', slug, search, category],
    queryFn: () => api.get(`/products/public/${slug}`, { params: { search, category, limit: 50 } }).then(r => r.data),
  })

  function handleAddToCart(product: Product) {
    addItem({ id: product.id, name: product.name, price: product.price, image: product.imageUrl, category: product.category })
    setAdded(product.id)
    setTimeout(() => setAdded(null), 1500)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
          <h1 className="text-xl font-bold text-primary">Loja</h1>
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar produtos..."
                className="w-full pl-8 pr-4 h-9 rounded-md border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
          <Link to={`/loja/${slug}/checkout`} className="relative">
            <Button variant="outline" size="icon"><ShoppingCart className="h-4 w-4" /></Button>
            {count() > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-white text-xs flex items-center justify-center">{count()}</span>
            )}
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${category === cat.value ? 'bg-primary text-white' : 'bg-muted hover:bg-muted/80'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="h-64 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data?.data?.map((product: Product) => (
              <div key={product.id} className="rounded-lg border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-square bg-muted overflow-hidden">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Package className="h-12 w-12 text-muted-foreground" /></div>
                  )}
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-xs text-muted-foreground capitalize">{product.category}</p>
                  <p className="text-sm font-medium leading-tight">{product.name}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-primary">{formatCurrency(product.price)}</span>
                    {product.oldPrice && <span className="text-xs text-muted-foreground line-through">{formatCurrency(product.oldPrice)}</span>}
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    variant={added === product.id ? 'secondary' : 'default'}
                    onClick={() => handleAddToCart(product)}
                  >
                    {added === product.id ? '✓ Adicionado' : 'Adicionar'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {data?.data?.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum produto encontrado</p>
          </div>
        )}
      </div>
    </div>
  )
}
