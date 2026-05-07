import { Prisma, OrderStatus } from '@prisma/client'
import { prisma } from '../../shared/utils/prisma'
import { AppError } from '../../shared/utils/errors'

export interface CreateOrderInput {
  customer: Record<string, unknown>
  items: Array<{ id: string; name: string; price: number; qty: number; image?: string; category: string }>
  subtotal: number
  discount?: number
  shipping?: { label: string; price: number }
  total: number
  payment: string
  source?: string
}

export async function listOrders(
  tenantId: string,
  filters: { search?: string; status?: string; page: number; limit: number }
) {
  const where: Prisma.OrderWhereInput = { tenantId }
  if (filters.status) where.status = filters.status as OrderStatus
  const [data, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (filters.page - 1) * filters.limit, take: filters.limit }),
    prisma.order.count({ where }),
  ])
  return { data, total, page: filters.page, pages: Math.ceil(total / filters.limit) }
}

export async function getOrder(tenantId: string, id: string) {
  const o = await prisma.order.findFirst({ where: { id, tenantId } })
  if (!o) throw new AppError('Pedido não encontrado', 404)
  return o
}

export async function createOrder(tenantId: string, data: CreateOrderInput) {
  const order = await prisma.order.create({
    data: {
      ...data,
      customer: data.customer as import('@prisma/client').Prisma.InputJsonValue,
      items: data.items as unknown as import('@prisma/client').Prisma.InputJsonValue,
      discount: data.discount ?? 0,
      tenantId,
    },
  })
  await createTransactionFromOrder(tenantId, order)
  return order
}

export async function updateOrderStatus(tenantId: string, id: string, status: OrderStatus) {
  await getOrder(tenantId, id)
  return prisma.order.update({ where: { id }, data: { status } })
}

export async function deleteOrder(tenantId: string, id: string) {
  await getOrder(tenantId, id)
  await prisma.order.delete({ where: { id } })
}

async function createTransactionFromOrder(tenantId: string, order: { id: string; total: Prisma.Decimal; payment: string }) {
  // Tenta categorias de venda em ordem de prioridade
  const category = await prisma.financeCategory.findFirst({
    where: {
      tenantId,
      type: 'INCOME',
      name: { in: ['Venda de produtos', 'Venda de acessórios', 'Outros (receita)'] },
    },
    orderBy: { name: 'asc' },
  })

  // Se não houver nenhuma categoria de receita, cria uma padrão
  const categoryId = category?.id ?? (await prisma.financeCategory.create({
    data: { tenantId, name: 'Venda de produtos', type: 'INCOME', icon: 'smartphone', isDefault: true },
  })).id

  // Número único baseado em timestamp para evitar duplicatas
  const number = `TX-${Date.now().toString(36).toUpperCase()}`

  await prisma.transaction.create({
    data: {
      tenantId,
      number,
      type: 'INCOME',
      categoryId,
      description: `Venda PDV #${order.id.slice(-6).toUpperCase()}`,
      amount: order.total,
      transactionDate: new Date(),
      status: 'PAID',
      paymentMethod: order.payment,
      source: 'sale',
      sourceId: order.id,
    },
  })
}
