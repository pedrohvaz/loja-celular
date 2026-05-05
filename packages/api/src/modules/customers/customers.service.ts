import { Prisma } from '@prisma/client'
import { prisma } from '../../shared/utils/prisma'
import { AppError } from '../../shared/utils/errors'
import { CreateCustomerInput, UpdateCustomerInput } from './customers.schema'

export async function listCustomers(
  tenantId: string,
  filters: { search?: string; city?: string; page: number; limit: number }
) {
  const where: Prisma.CustomerWhereInput = { tenantId }
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { phone: { contains: filters.search } },
      { email: { contains: filters.search, mode: 'insensitive' } },
      { cpf: { contains: filters.search } },
    ]
  }
  if (filters.city) where.city = { contains: filters.city, mode: 'insensitive' }

  const [data, total] = await Promise.all([
    prisma.customer.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (filters.page - 1) * filters.limit, take: filters.limit }),
    prisma.customer.count({ where }),
  ])
  return { data, total, page: filters.page, pages: Math.ceil(total / filters.limit) }
}

export async function getCustomer(tenantId: string, id: string) {
  const c = await prisma.customer.findFirst({ where: { id, tenantId } })
  if (!c) throw new AppError('Cliente não encontrado', 404)
  return c
}

export async function findOrCreateCustomer(tenantId: string, data: CreateCustomerInput) {
  if (data.cpf) {
    const existing = await prisma.customer.findFirst({ where: { tenantId, cpf: data.cpf } })
    if (existing) return existing
  } else if (data.phone) {
    const existing = await prisma.customer.findFirst({ where: { tenantId, phone: data.phone } })
    if (existing) return existing
  }
  return prisma.customer.create({ data: { ...data, tenantId } })
}

export async function createCustomer(tenantId: string, data: CreateCustomerInput) {
  return prisma.customer.create({ data: { ...data, tenantId } })
}

export async function updateCustomer(tenantId: string, id: string, data: UpdateCustomerInput) {
  await getCustomer(tenantId, id)
  return prisma.customer.update({ where: { id }, data })
}

export async function deleteCustomer(tenantId: string, id: string) {
  await getCustomer(tenantId, id)
  await prisma.customer.delete({ where: { id } })
}

export async function importFromOrders(tenantId: string) {
  const orders = await prisma.order.findMany({ where: { tenantId } })
  let imported = 0

  for (const order of orders) {
    const customer = order.customer as { nome?: string; name?: string; tel?: string; phone?: string; email?: string }
    const name = customer.nome ?? customer.name
    const phone = customer.tel ?? customer.phone
    const email = customer.email

    if (!name) continue

    const exists = await prisma.customer.findFirst({
      where: { tenantId, OR: [{ phone: phone ?? undefined }, { email: email ?? undefined }] },
    })
    if (!exists) {
      await prisma.customer.create({ data: { tenantId, name, phone: phone ?? undefined, email: email ?? undefined } })
      imported++
    }
  }
  return { imported }
}

export async function getCustomerStats(tenantId: string) {
  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0)
  const [total, newThisMonth] = await Promise.all([
    prisma.customer.count({ where: { tenantId } }),
    prisma.customer.count({ where: { tenantId, createdAt: { gte: startOfMonth } } }),
  ])
  return { total, newThisMonth }
}
