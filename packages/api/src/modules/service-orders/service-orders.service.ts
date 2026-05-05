import { Prisma, ServiceOrderStatus } from '@prisma/client'
import { prisma } from '../../shared/utils/prisma'
import { AppError } from '../../shared/utils/errors'
import { CreateSOInput, UpdateSOInput } from './service-orders.schema'

type StatusHistoryEntry = { status: string; date: string; note?: string }

async function generateNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `OS-${year}-`

  const last = await prisma.serviceOrder.findFirst({
    where: { tenantId, number: { startsWith: prefix } },
    orderBy: { number: 'desc' },
  })

  const seq = last ? parseInt(last.number.replace(prefix, '')) + 1 : 1
  return `${prefix}${String(seq).padStart(4, '0')}`
}

export async function listServiceOrders(
  tenantId: string,
  filters: { search?: string; status?: string; technician?: string; period?: string; page: number; limit: number }
) {
  const where: Prisma.ServiceOrderWhereInput = { tenantId }

  if (filters.search) {
    where.OR = [
      { number: { contains: filters.search, mode: 'insensitive' } },
      { clientName: { contains: filters.search, mode: 'insensitive' } },
      { deviceImei: { contains: filters.search } },
      { deviceBrand: { contains: filters.search, mode: 'insensitive' } },
      { deviceModel: { contains: filters.search, mode: 'insensitive' } },
    ]
  }
  if (filters.status) where.status = filters.status as ServiceOrderStatus
  if (filters.technician) where.technician = { contains: filters.technician, mode: 'insensitive' }

  if (filters.period) {
    const now = new Date()
    if (filters.period === 'today') {
      const start = new Date(now.setHours(0, 0, 0, 0))
      where.createdAt = { gte: start }
    } else if (filters.period === 'week') {
      const start = new Date(); start.setDate(start.getDate() - 7)
      where.createdAt = { gte: start }
    } else if (filters.period === 'month') {
      const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0)
      where.createdAt = { gte: start }
    }
  }

  const [data, total] = await Promise.all([
    prisma.serviceOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    }),
    prisma.serviceOrder.count({ where }),
  ])

  const now = new Date()
  const enriched = data.map(so => ({
    ...so,
    isOverdue: so.estimatedDelivery ? so.estimatedDelivery < now && so.status !== 'DELIVERED' && so.status !== 'CANCELLED' : false,
  }))

  return { data: enriched, total, page: filters.page, pages: Math.ceil(total / filters.limit) }
}

export async function getServiceOrder(tenantId: string, id: string) {
  const so = await prisma.serviceOrder.findFirst({ where: { id, tenantId } })
  if (!so) throw new AppError('Ordem de serviço não encontrada', 404)
  return so
}

export async function getPublicServiceOrder(tenantId: string, query: string) {
  const so = await prisma.serviceOrder.findFirst({
    where: {
      tenantId,
      OR: [
        { number: { equals: query, mode: 'insensitive' } },
        { clientCpf: { contains: query } },
        { deviceImei: { contains: query } },
      ],
    },
    select: {
      id: true, number: true, status: true, paymentStatus: true, priority: true,
      clientName: true, deviceBrand: true, deviceModel: true, deviceColor: true,
      reportedProblem: true, technicalReport: true, estimatedDelivery: true,
      completedAt: true, deliveredAt: true, statusHistory: true, createdAt: true,
    },
  })
  if (!so) throw new AppError('Ordem de serviço não encontrada', 404)
  return so
}

export async function createServiceOrder(tenantId: string, data: CreateSOInput) {
  const number = await generateNumber(tenantId)
  const history: StatusHistoryEntry[] = [{ status: 'AWAITING_DIAGNOSIS', date: new Date().toISOString(), note: 'OS aberta' }]

  const so = await prisma.serviceOrder.create({
    data: {
      tenantId,
      number,
      ...data,
      estimatedDelivery: data.estimatedDelivery ? new Date(data.estimatedDelivery) : undefined,
      statusHistory: history as unknown as Prisma.InputJsonValue,
    },
  })

  await createTransactionFromSO(tenantId, so)
  return so
}

export async function updateServiceOrder(tenantId: string, id: string, data: UpdateSOInput) {
  await getServiceOrder(tenantId, id)

  const updateData: Prisma.ServiceOrderUpdateInput = { ...data }
  if (data.estimatedDelivery) updateData.estimatedDelivery = new Date(data.estimatedDelivery)

  if (data.servicesPerformed !== undefined || data.partsUsed !== undefined || data.discount !== undefined) {
    const current = await prisma.serviceOrder.findUnique({ where: { id } })
    if (current) {
      const services = (data.servicesPerformed ?? (current.servicesPerformed as unknown as { value: number }[])) as { value: number }[]
      const parts = (data.partsUsed ?? (current.partsUsed as unknown as { quantity: number; unitValue: number }[])) as { quantity: number; unitValue: number }[]
      const serviceValue = data.serviceValue ?? services.reduce((s, x) => s + (x.value ?? 0), 0)
      const partsValue = data.partsValue ?? parts.reduce((s, x) => s + (x.quantity ?? 0) * (x.unitValue ?? 0), 0)
      const discount = data.discount ?? Number(current.discount)
      updateData.serviceValue = serviceValue
      updateData.partsValue = partsValue
      updateData.totalValue = Math.max(0, serviceValue + partsValue - discount)
    }
  }

  const updated = await prisma.serviceOrder.update({ where: { id }, data: updateData })
  await syncTransactionFromSO(tenantId, updated)
  return updated
}

export async function setStatus(tenantId: string, id: string, status: ServiceOrderStatus, note?: string) {
  const so = await getServiceOrder(tenantId, id)
  const history = so.statusHistory as unknown as StatusHistoryEntry[]
  history.push({ status, date: new Date().toISOString(), note })

  const extra: Prisma.ServiceOrderUpdateInput = {}
  if (status === 'COMPLETED') extra.completedAt = new Date()
  if (status === 'DELIVERED') extra.deliveredAt = new Date()

  return prisma.serviceOrder.update({
    where: { id },
    data: { status, statusHistory: history as unknown as Prisma.InputJsonValue, ...extra },
  })
}

export async function deleteServiceOrder(tenantId: string, id: string) {
  await getServiceOrder(tenantId, id)
  await prisma.serviceOrder.delete({ where: { id } })
}

export async function getStats(tenantId: string) {
  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0)
  const now = new Date()

  const all = await prisma.serviceOrder.findMany({ where: { tenantId } })

  const stats = {
    total: all.length,
    open: all.filter(s => !['DELIVERED', 'CANCELLED'].includes(s.status)).length,
    inRepair: all.filter(s => s.status === 'IN_REPAIR').length,
    awaitingPart: all.filter(s => s.status === 'AWAITING_PART').length,
    awaitingApproval: all.filter(s => s.status === 'AWAITING_APPROVAL').length,
    completed: all.filter(s => s.status === 'COMPLETED').length,
    delivered: all.filter(s => s.status === 'DELIVERED').length,
    cancelled: all.filter(s => s.status === 'CANCELLED').length,
    overdue: all.filter(s => s.estimatedDelivery && s.estimatedDelivery < now && !['DELIVERED', 'CANCELLED'].includes(s.status)).length,
    revenueThisMonth: all
      .filter(s => s.completedAt && s.completedAt >= startOfMonth && s.paymentStatus === 'PAID')
      .reduce((sum, s) => sum + Number(s.totalValue), 0),
  }

  const technicians = [...new Set(all.map(s => s.technician).filter(Boolean))]
  return { ...stats, technicians }
}

// Internal helpers
async function createTransactionFromSO(tenantId: string, so: { id: string; number: string; clientName: string; deviceBrand: string; deviceModel: string; estimatedValue: Prisma.Decimal }) {
  const category = await prisma.financeCategory.findFirst({ where: { tenantId, name: 'Serviços de manutenção' } })
  if (!category) return

  const existing = await prisma.transaction.findFirst({ where: { tenantId, sourceId: so.id } })
  if (existing) return

  const txNumber = await generateTxNumber(tenantId)
  await prisma.transaction.create({
    data: {
      tenantId,
      number: txNumber,
      type: 'INCOME',
      categoryId: category.id,
      description: `${so.number} — ${so.deviceBrand} ${so.deviceModel}`,
      amount: so.estimatedValue,
      transactionDate: new Date(),
      status: 'PENDING',
      source: 'os',
      sourceId: so.id,
      notes: `Cliente: ${so.clientName}`,
    },
  })
}

async function syncTransactionFromSO(tenantId: string, so: { id: string; totalValue: Prisma.Decimal; paymentStatus: string; paymentMethod: string | null }) {
  const tx = await prisma.transaction.findFirst({ where: { tenantId, sourceId: so.id } })
  if (!tx) return
  await prisma.transaction.update({
    where: { id: tx.id },
    data: {
      amount: so.totalValue,
      status: so.paymentStatus === 'PAID' ? 'PAID' : 'PENDING',
      paymentMethod: so.paymentMethod,
    },
  })
}

async function generateTxNumber(tenantId: string): Promise<string> {
  const count = await prisma.transaction.count({ where: { tenantId } })
  return `TX-${String(count + 1).padStart(6, '0')}`
}
