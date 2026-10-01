import { z } from 'zod'

export const createCustomerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  cpf: z.string().optional(),
  // O input date envia "AAAA-MM-DD"; o Prisma exige Date. "" limpa o campo.
  birthDate: z.string().optional()
    .refine((v) => !v || !isNaN(Date.parse(v)), 'Data de nascimento inválida')
    .transform((v) => (v ? new Date(v) : v === '' ? null : undefined)),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  notes: z.string().optional(),
})

export const updateCustomerSchema = createCustomerSchema.partial()

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
