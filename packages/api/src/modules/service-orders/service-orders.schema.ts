import { z } from 'zod'

const serviceItemSchema = z.object({ description: z.string(), value: z.number().min(0) })
const partItemSchema = z.object({ description: z.string(), quantity: z.number().int().positive(), unitValue: z.number().min(0) })

export const createSOSchema = z.object({
  priority: z.enum(['NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  clientName: z.string().min(2),
  clientCpf: z.string().optional(),
  clientPhone: z.string().optional(),
  clientEmail: z.string().email().optional().or(z.literal('')),
  clientAddress: z.string().optional(),
  deviceBrand: z.string().min(1),
  deviceModel: z.string().min(1),
  deviceImei: z.string().optional(),
  deviceColor: z.string().optional(),
  devicePassword: z.string().optional(),
  accessories: z.array(z.string()).default([]),
  visualConditions: z.string().optional(),
  technician: z.string().optional(),
  reportedProblem: z.string().min(5),
  estimatedValue: z.number().min(0).default(0),
  estimatedDelivery: z.string().optional(),
  internalNotes: z.string().optional(),
})

export const updateSOSchema = z.object({
  priority: z.enum(['NORMAL', 'HIGH', 'URGENT']).optional(),
  clientName: z.string().min(2).optional(),
  clientCpf: z.string().optional(),
  clientPhone: z.string().optional(),
  clientEmail: z.string().email().optional().or(z.literal('')),
  clientAddress: z.string().optional(),
  deviceBrand: z.string().optional(),
  deviceModel: z.string().optional(),
  deviceImei: z.string().optional(),
  deviceColor: z.string().optional(),
  devicePassword: z.string().optional(),
  accessories: z.array(z.string()).optional(),
  visualConditions: z.string().optional(),
  technician: z.string().optional(),
  reportedProblem: z.string().optional(),
  technicalReport: z.string().optional(),
  servicesPerformed: z.array(serviceItemSchema).optional(),
  partsUsed: z.array(partItemSchema).optional(),
  serviceValue: z.number().min(0).optional(),
  partsValue: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  estimatedValue: z.number().min(0).optional(),
  paymentMethod: z.string().optional(),
  paymentStatus: z.enum(['PENDING', 'PAID', 'CANCELLED']).optional(),
  estimatedDelivery: z.string().optional(),
  internalNotes: z.string().optional(),
})

export const setStatusSchema = z.object({
  status: z.enum(['AWAITING_DIAGNOSIS', 'IN_REPAIR', 'AWAITING_PART', 'AWAITING_APPROVAL', 'COMPLETED', 'DELIVERED', 'CANCELLED']),
  note: z.string().optional(),
})

export type CreateSOInput = z.infer<typeof createSOSchema>
export type UpdateSOInput = z.infer<typeof updateSOSchema>
