import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(1),
  brand: z.string().optional(),
  condition: z.string().min(1),
  price: z.number().positive(),
  oldPrice: z.number().positive().optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  inStock: z.boolean().default(true),
})

export const updateProductSchema = createProductSchema.partial()

export const productFiltersSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  inStock: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
