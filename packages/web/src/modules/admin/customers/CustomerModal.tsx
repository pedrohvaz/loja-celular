import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/shared/api/axios'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { X } from 'lucide-react'

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  cpf: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>
interface Props { customer: ({ id: string } & Partial<FormData>) | null; onClose: () => void }

export default function CustomerModal({ customer, onClose }: Props) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: customer ?? {},
  })
  const mutation = useMutation({
    mutationFn: (data: FormData) => customer ? api.patch(`/customers/${customer.id}`, data) : api.post('/customers', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); onClose() },
  })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{customer ? 'Editar Cliente' : 'Novo Cliente'}</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="p-6 space-y-4">
          <Input label="Nome *" error={errors.name?.message} {...register('name')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Telefone" {...register('phone')} />
            <Input label="CPF" {...register('cpf')} />
          </div>
          <Input label="E-mail" type="email" {...register('email')} />
          <Input label="Endereço" {...register('address')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Cidade" {...register('city')} />
            <Input label="Estado" {...register('state')} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={isSubmitting || mutation.isPending}>Salvar</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
