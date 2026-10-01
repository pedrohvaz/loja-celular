import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
  slug: z.string().min(1, 'Identificador da empresa obrigatório'),
})

export type LoginInput = z.infer<typeof loginSchema>

// Cadastro de nova loja (página de vendas do SaaS)
export const registerSchema = z.object({
  tenantName: z.string({ required_error: 'Informe o nome da loja' }).trim().min(2, 'Nome da loja muito curto').max(80),
  slug: z.string({ required_error: 'Informe o código da loja' }).trim().toLowerCase()
    .regex(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/, 'Código da loja: 3 a 40 letras minúsculas, números ou hífen'),
  planId: z.string().optional(),
  adminName: z.string({ required_error: 'Informe seu nome' }).trim().min(2, 'Informe seu nome').max(80),
  adminEmail: z.string({ required_error: 'Informe o e-mail' }).trim().toLowerCase().email('E-mail inválido'),
  adminPassword: z.string({ required_error: 'Informe a senha' }).min(8, 'A senha precisa ter pelo menos 8 caracteres').max(100),
  phone: z.string().trim().max(20).optional(),
})

export type RegisterInput = z.infer<typeof registerSchema>
