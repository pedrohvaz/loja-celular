import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/shared/api/axios'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { X } from 'lucide-react'

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  category: z.string().min(1, 'Categoria obrigatória'),
  brand: z.string().optional(),
  condition: z.string().min(1),
  price: z.coerce.number().positive('Preço obrigatório'),
  oldPrice: z.coerce.number().positive().optional().or(z.literal('')),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  inStock: z.boolean().default(true),
})

type FormData = z.infer<typeof schema>
interface ProductModalProps { product: { id: string } & Partial<FormData> | null; onClose: () => void }

export default function ProductModal({ product, onClose }: ProductModalProps) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: product ? { ...product, oldPrice: product.oldPrice ?? '', imageUrl: product.imageUrl ?? '' } : { inStock: true, condition: 'novo' },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = { ...data, oldPrice: data.oldPrice || undefined, imageUrl: data.imageUrl || undefined }
      return product ? api.patch(`/products/${product.id}`, payload) : api.post('/products', payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); onClose() },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{product ? 'Editar Produto' : 'Novo Produto'}</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="p-6 space-y-4">
          <Input label="Nome *" error={errors.name?.message} {...register('name')} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Categoria *</label>
              <select {...register('category')} className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                {['smartphones','capinhas','peliculas','carregadores','audio','cabos'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Condição</label>
              <select {...register('condition')} className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="novo">Novo</option>
                <option value="seminovo">Seminovo</option>
                <option value="usado">Usado</option>
              </select>
            </div>
          </div>
          <Input label="Marca" {...register('brand')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Preço *" type="number" step="0.01" error={errors.price?.message} {...register('price')} />
            <Input label="Preço anterior" type="number" step="0.01" {...register('oldPrice')} />
          </div>
          <Input label="URL da imagem" {...register('imageUrl')} />
          <div>
            <label className="text-sm font-medium">Descrição</label>
            <textarea rows={2} {...register('description')} className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('inStock')} className="rounded" />
            Em estoque
          </label>
          {mutation.isError && <p className="text-sm text-destructive">Erro ao salvar.</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={isSubmitting || mutation.isPending}>Salvar</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
