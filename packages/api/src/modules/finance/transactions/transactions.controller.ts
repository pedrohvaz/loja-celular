import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as Service from './transactions.service'

const listSchema = z.object({
  search: z.string().optional(), type: z.string().optional(), categoryId: z.string().optional(),
  status: z.string().optional(), paymentMethod: z.string().optional(),
  dateFrom: z.string().optional(), dateTo: z.string().optional(),
  page: z.coerce.number().default(1), limit: z.coerce.number().default(20),
})
const createSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  categoryId: z.string(),
  description: z.string().min(1),
  amount: z.number().positive(),
  transactionDate: z.string(),
  dueDate: z.string().optional(),
  status: z.enum(['PENDING', 'PAID', 'CANCELLED']).default('PENDING'),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
})
const dashboardSchema = z.object({
  year: z.coerce.number().default(new Date().getFullYear()),
  month: z.coerce.number().default(new Date().getMonth() + 1),
})

export async function list(req: Request, res: Response, next: NextFunction) {
  try { return res.json(await Service.listTransactions(req.user.tenantId, listSchema.parse(req.query))) } catch (e) { return next(e) }
}
export async function dashboard(req: Request, res: Response, next: NextFunction) {
  try { const { year, month } = dashboardSchema.parse(req.query); return res.json(await Service.getDashboard(req.user.tenantId, year, month)) } catch (e) { return next(e) }
}
export async function getOne(req: Request, res: Response, next: NextFunction) {
  try { return res.json(await Service.getTransaction(req.user.tenantId, req.params.id)) } catch (e) { return next(e) }
}
export async function create(req: Request, res: Response, next: NextFunction) {
  try { return res.status(201).json(await Service.createTransaction(req.user.tenantId, createSchema.parse(req.body))) } catch (e) { return next(e) }
}
export async function update(req: Request, res: Response, next: NextFunction) {
  try { return res.json(await Service.updateTransaction(req.user.tenantId, req.params.id, createSchema.partial().parse(req.body))) } catch (e) { return next(e) }
}
export async function pay(req: Request, res: Response, next: NextFunction) {
  try { return res.json(await Service.payTransaction(req.user.tenantId, req.params.id, req.body.paymentMethod ?? 'dinheiro')) } catch (e) { return next(e) }
}
export async function remove(req: Request, res: Response, next: NextFunction) {
  try { await Service.deleteTransaction(req.user.tenantId, req.params.id); return res.status(204).send() } catch (e) { return next(e) }
}
