import { Prisma, TransactionStatus, TransactionType } from '@prisma/client'
import { prisma } from '../../../shared/utils/prisma'
import { AppError } from '../../../shared/utils/errors'

export interface CreateTransactionInput {
  type: TransactionType
  categoryId: string
  description: string
  amount: number
  transactionDate: string
  dueDate?: string
  status?: TransactionStatus
  paymentMethod?: string
  notes?: string
}

async function nextNumber(tenantId: string) {
  const count = await prisma.transaction.count({ where: { tenantId } })
  return `TX-${String(count + 1).padStart(6, '0')}`
}

export async function listTransactions(tenantId: string, filters: {
  search?: string; type?: string; categoryId?: string; status?: string;
  paymentMethod?: string; dateFrom?: string; dateTo?: string; page: number; limit: number
}) {
  const where: Prisma.TransactionWhereInput = { tenantId }
  if (filters.search) where.OR = [{ description: { contains: filters.search, mode: 'insensitive' } }, { notes: { contains: filters.search, mode: 'insensitive' } }]
  if (filters.type) where.type = filters.type as TransactionType
  if (filters.categoryId) where.categoryId = filters.categoryId
  if (filters.status) where.status = filters.status as TransactionStatus
  if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod
  if (filters.dateFrom || filters.dateTo) {
    where.transactionDate = {}
    if (filters.dateFrom) where.transactionDate.gte = new Date(filters.dateFrom)
    if (filters.dateTo) where.transactionDate.lte = new Date(filters.dateTo)
  }

  const [data, total] = await Promise.all([
    prisma.transaction.findMany({ where, include: { category: true }, orderBy: { transactionDate: 'desc' }, skip: (filters.page - 1) * filters.limit, take: filters.limit }),
    prisma.transaction.count({ where }),
  ])

  const income = data.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0)
  const expense = data.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0)

  return { data, total, page: filters.page, pages: Math.ceil(total / filters.limit), summary: { income, expense, balance: income - expense } }
}

export async function getTransaction(tenantId: string, id: string) {
  const t = await prisma.transaction.findFirst({ where: { id, tenantId }, include: { category: true } })
  if (!t) throw new AppError('Transação não encontrada', 404)
  return t
}

export async function createTransaction(tenantId: string, data: CreateTransactionInput) {
  const number = await nextNumber(tenantId)
  return prisma.transaction.create({
    data: {
      tenantId, number, ...data,
      transactionDate: new Date(data.transactionDate),
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    },
    include: { category: true },
  })
}

export async function updateTransaction(tenantId: string, id: string, data: Partial<CreateTransactionInput>) {
  await getTransaction(tenantId, id)
  return prisma.transaction.update({
    where: { id },
    data: {
      ...data,
      transactionDate: data.transactionDate ? new Date(data.transactionDate) : undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    },
    include: { category: true },
  })
}

export async function payTransaction(tenantId: string, id: string, paymentMethod: string) {
  await getTransaction(tenantId, id)
  return prisma.transaction.update({
    where: { id },
    data: { status: 'PAID', paymentMethod },
    include: { category: true },
  })
}

export async function deleteTransaction(tenantId: string, id: string) {
  await getTransaction(tenantId, id)
  await prisma.transaction.delete({ where: { id } })
}

export async function getDashboard(tenantId: string, year: number, month: number) {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59)

  const txs = await prisma.transaction.findMany({
    where: { tenantId, transactionDate: { gte: start, lte: end } },
    include: { category: true },
  })

  const paid = txs.filter(t => t.status === 'PAID')
  const totalIncome = paid.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = paid.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0)

  const all = await prisma.transaction.findMany({ where: { tenantId } })
  const toReceive = all.filter(t => t.type === 'INCOME' && t.status === 'PENDING').reduce((s, t) => s + Number(t.amount), 0)
  const toPay = all.filter(t => t.type === 'EXPENSE' && t.status === 'PENDING').reduce((s, t) => s + Number(t.amount), 0)

  const incomeByCategory = Object.entries(
    paid.filter(t => t.type === 'INCOME').reduce((acc, t) => {
      const name = t.category.name
      acc[name] = (acc[name] ?? 0) + Number(t.amount)
      return acc
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }))

  const expenseByCategory = Object.entries(
    paid.filter(t => t.type === 'EXPENSE').reduce((acc, t) => {
      const name = t.category.name
      acc[name] = (acc[name] ?? 0) + Number(t.amount)
      return acc
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }))

  const last6: Array<{ month: string; income: number; expense: number }> = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1)
    const s = new Date(d.getFullYear(), d.getMonth(), 1)
    const e = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
    const slice = await prisma.transaction.findMany({ where: { tenantId, status: 'PAID', transactionDate: { gte: s, lte: e } } })
    last6.push({
      month: d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }),
      income: slice.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0),
      expense: slice.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0),
    })
  }

  const recent = await prisma.transaction.findMany({ where: { tenantId }, include: { category: true }, orderBy: { createdAt: 'desc' }, take: 5 })

  const overdueDate = new Date(); overdueDate.setHours(0, 0, 0, 0)
  const upcoming = await prisma.transaction.findMany({
    where: { tenantId, status: 'PENDING', dueDate: { gte: overdueDate, lte: new Date(Date.now() + 7 * 86400000) } },
    include: { category: true },
    orderBy: { dueDate: 'asc' },
    take: 10,
  })

  return {
    summary: { totalIncome, totalExpense, profit: totalIncome - totalExpense, balance: totalIncome - totalExpense, toReceive, toPay },
    incomeByCategory, expenseByCategory, last6, recent, upcoming,
  }
}
