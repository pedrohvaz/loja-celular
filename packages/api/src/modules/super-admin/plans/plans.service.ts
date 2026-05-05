import { Prisma } from '@prisma/client'
import { prisma } from '../../../shared/utils/prisma'
import { AppError } from '../../../shared/utils/errors'

export async function listPlans() {
  return prisma.plan.findMany({ orderBy: { price: 'asc' } })
}

export async function getPlan(id: string) {
  const plan = await prisma.plan.findUnique({
    where: { id },
    include: { _count: { select: { tenants: true } } },
  })
  if (!plan) throw new AppError('Plano não encontrado', 404)
  return plan
}

export async function createPlan(data: {
  name: string
  slug: string
  description?: string
  price: number
  maxUsers: number
  modules: string[]
  features?: Record<string, unknown>
}) {
  const existing = await prisma.plan.findUnique({ where: { slug: data.slug } })
  if (existing) throw new AppError('Slug já está em uso', 409)
  return prisma.plan.create({
    data: {
      ...data,
      price: data.price,
      features: data.features as Prisma.InputJsonValue ?? Prisma.JsonNull,
    },
  })
}

export async function updatePlan(id: string, data: {
  name?: string
  description?: string
  price?: number
  maxUsers?: number
  modules?: string[]
  features?: Record<string, unknown>
  isActive?: boolean
}) {
  const plan = await prisma.plan.findUnique({ where: { id } })
  if (!plan) throw new AppError('Plano não encontrado', 404)
  return prisma.plan.update({
    where: { id },
    data: {
      ...data,
      features: data.features !== undefined
        ? (data.features as Prisma.InputJsonValue ?? Prisma.JsonNull)
        : undefined,
    },
  })
}

export async function deletePlan(id: string) {
  const plan = await prisma.plan.findUnique({ where: { id }, include: { _count: { select: { tenants: true } } } })
  if (!plan) throw new AppError('Plano não encontrado', 404)
  if (plan._count.tenants > 0) throw new AppError('Não é possível excluir um plano com tenants associados', 400)
  await prisma.plan.delete({ where: { id } })
}
