import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '@/shared/api/axios'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'

const schema = z.object({
  priority: z.enum(['NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  clientName: z.string().min(2, 'Nome obrigatório'),
  clientCpf: z.string().optional(),
  clientPhone: z.string().optional(),
  clientEmail: z.string().optional(),
  clientAddress: z.string().optional(),
  deviceBrand: z.string().min(1, 'Marca obrigatória'),
  deviceModel: z.string().min(1, 'Modelo obrigatório'),
  deviceImei: z.string().optional(),
  deviceColor: z.string().optional(),
  devicePassword: z.string().optional(),
  visualConditions: z.string().optional(),
  technician: z.string().optional(),
  reportedProblem: z.string().min(5, 'Descreva o problema (mínimo 5 caracteres)'),
  estimatedValue: z.coerce.number().min(0).default(0),
  estimatedDelivery: z.string().optional(),
  internalNotes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function ServiceOrderForm() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => api.post('/service-orders', data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['service-orders'] })
      navigate(`/admin/os/${res.data.id}`)
    },
  })

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nova Ordem de Serviço</h1>
        <p className="text-muted-foreground text-sm">Preencha os dados do cliente e do aparelho</p>
      </div>

      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-6">
        {/* Cliente */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h2 className="font-semibold">Dados do Cliente</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nome *" error={errors.clientName?.message} {...register('clientName')} />
            <Input label="Telefone" {...register('clientPhone')} />
            <Input label="CPF" {...register('clientCpf')} />
            <Input label="E-mail" type="email" {...register('clientEmail')} />
            <div className="sm:col-span-2"><Input label="Endereço" {...register('clientAddress')} /></div>
          </div>
        </div>

        {/* Aparelho */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h2 className="font-semibold">Dados do Aparelho</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Marca *" error={errors.deviceBrand?.message} {...register('deviceBrand')} />
            <Input label="Modelo *" error={errors.deviceModel?.message} {...register('deviceModel')} />
            <Input label="IMEI / Serial" {...register('deviceImei')} />
            <Input label="Cor" {...register('deviceColor')} />
            <Input label="Senha / PIN" type="password" {...register('devicePassword')} />
          </div>
          <div>
            <label className="text-sm font-medium">Condições visuais</label>
            <textarea rows={2} {...register('visualConditions')} className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
        </div>

        {/* Diagnóstico */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h2 className="font-semibold">Diagnóstico</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Técnico Responsável" {...register('technician')} />
            <Input label="Valor Estimado (R$)" type="number" step="0.01" {...register('estimatedValue')} />
            <Input label="Previsão de Entrega" type="date" {...register('estimatedDelivery')} />
          </div>
          <div>
            <label className="text-sm font-medium">Prioridade</label>
            <select {...register('priority')} className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="NORMAL">Normal</option>
              <option value="HIGH">Alta</option>
              <option value="URGENT">Urgente</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Problema relatado pelo cliente *</label>
            <textarea rows={3} {...register('reportedProblem')} className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            {errors.reportedProblem && <p className="text-xs text-destructive mt-1">{errors.reportedProblem.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Observações internas</label>
            <textarea rows={2} {...register('internalNotes')} className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
        </div>

        {mutation.isError && (
          <p className="text-sm text-destructive">Erro ao salvar. Verifique os campos e tente novamente.</p>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting || mutation.isPending}>Salvar OS</Button>
        </div>
      </form>
    </div>
  )
}
