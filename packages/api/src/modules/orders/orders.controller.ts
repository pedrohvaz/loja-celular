import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { OrderStatus } from '@prisma/client'
import * as Service from './orders.service'

const listSchema = z.object({ search: z.string().optional(), status: z.string().optional(), page: z.coerce.number().default(1), limit: z.coerce.number().default(20) })
const createSchema = z.object({
  customer: z.record(z.unknown()),
  items: z.array(z.object({ id: z.string(), name: z.string(), price: z.number(), qty: z.number(), image: z.string().optional(), category: z.string() })),
  subtotal: z.number(),
  discount: z.number().default(0),
  shipping: z.object({ label: z.string(), price: z.number() }).optional(),
  total: z.number(),
  payment: z.string(),
  source: z.string().default('ecommerce'),
})
const statusSchema = z.object({ status: z.nativeEnum(OrderStatus) })

export async function list(req: Request, res: Response, next: NextFunction) {
  try { return res.json(await Service.listOrders(req.user.tenantId, listSchema.parse(req.query))) } catch (e) { return next(e) }
}
export async function getOne(req: Request, res: Response, next: NextFunction) {
  try { return res.json(await Service.getOrder(req.user.tenantId, req.params.id)) } catch (e) { return next(e) }
}
export async function create(req: Request, res: Response, next: NextFunction) {
  try { return res.status(201).json(await Service.createOrder(req.user.tenantId, createSchema.parse(req.body))) } catch (e) { return next(e) }
}
export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try { return res.json(await Service.updateOrderStatus(req.user.tenantId, req.params.id, statusSchema.parse(req.body).status)) } catch (e) { return next(e) }
}
export async function remove(req: Request, res: Response, next: NextFunction) {
  try { await Service.deleteOrder(req.user.tenantId, req.params.id); return res.status(204).send() } catch (e) { return next(e) }
}
