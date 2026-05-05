import { Request, Response, NextFunction } from 'express'
import { createCustomerSchema, updateCustomerSchema } from './customers.schema'
import { z } from 'zod'
import * as Service from './customers.service'

const listSchema = z.object({ search: z.string().optional(), city: z.string().optional(), page: z.coerce.number().default(1), limit: z.coerce.number().default(20) })

export async function list(req: Request, res: Response, next: NextFunction) {
  try { return res.json(await Service.listCustomers(req.user.tenantId, listSchema.parse(req.query))) } catch (e) { return next(e) }
}
export async function getOne(req: Request, res: Response, next: NextFunction) {
  try { return res.json(await Service.getCustomer(req.user.tenantId, req.params.id)) } catch (e) { return next(e) }
}
export async function create(req: Request, res: Response, next: NextFunction) {
  try { return res.status(201).json(await Service.createCustomer(req.user.tenantId, createCustomerSchema.parse(req.body))) } catch (e) { return next(e) }
}
export async function update(req: Request, res: Response, next: NextFunction) {
  try { return res.json(await Service.updateCustomer(req.user.tenantId, req.params.id, updateCustomerSchema.parse(req.body))) } catch (e) { return next(e) }
}
export async function remove(req: Request, res: Response, next: NextFunction) {
  try { await Service.deleteCustomer(req.user.tenantId, req.params.id); return res.status(204).send() } catch (e) { return next(e) }
}
export async function importFromOrders(req: Request, res: Response, next: NextFunction) {
  try { return res.json(await Service.importFromOrders(req.user.tenantId)) } catch (e) { return next(e) }
}
export async function stats(req: Request, res: Response, next: NextFunction) {
  try { return res.json(await Service.getCustomerStats(req.user.tenantId)) } catch (e) { return next(e) }
}
