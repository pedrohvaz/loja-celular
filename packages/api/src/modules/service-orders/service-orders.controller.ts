import { Request, Response, NextFunction } from 'express'
import { createSOSchema, updateSOSchema, setStatusSchema } from './service-orders.schema'
import { z } from 'zod'
import * as Service from './service-orders.service'

const listSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  technician: z.string().optional(),
  period: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
})

export async function list(req: Request, res: Response, next: NextFunction) {
  try { return res.json(await Service.listServiceOrders(req.user.tenantId, listSchema.parse(req.query))) } catch (e) { return next(e) }
}
export async function getOne(req: Request, res: Response, next: NextFunction) {
  try { return res.json(await Service.getServiceOrder(req.user.tenantId, req.params.id)) } catch (e) { return next(e) }
}
export async function getPublic(req: Request, res: Response, next: NextFunction) {
  try {
    const slug = req.params.slug
    const tenant = await import('../../shared/utils/prisma').then(m => m.prisma.tenant.findUnique({ where: { slug } }))
    if (!tenant) return res.status(404).json({ error: 'Loja não encontrada' })
    return res.json(await Service.getPublicServiceOrder(tenant.id, req.params.query))
  } catch (e) { return next(e) }
}
export async function create(req: Request, res: Response, next: NextFunction) {
  try { return res.status(201).json(await Service.createServiceOrder(req.user.tenantId, createSOSchema.parse(req.body))) } catch (e) { return next(e) }
}
export async function update(req: Request, res: Response, next: NextFunction) {
  try { return res.json(await Service.updateServiceOrder(req.user.tenantId, req.params.id, updateSOSchema.parse(req.body))) } catch (e) { return next(e) }
}
export async function setStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, note } = setStatusSchema.parse(req.body)
    return res.json(await Service.setStatus(req.user.tenantId, req.params.id, status, note))
  } catch (e) { return next(e) }
}
export async function remove(req: Request, res: Response, next: NextFunction) {
  try { await Service.deleteServiceOrder(req.user.tenantId, req.params.id); return res.status(204).send() } catch (e) { return next(e) }
}
export async function stats(req: Request, res: Response, next: NextFunction) {
  try { return res.json(await Service.getStats(req.user.tenantId)) } catch (e) { return next(e) }
}
