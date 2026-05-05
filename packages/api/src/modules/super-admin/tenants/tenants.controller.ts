import { Request, Response, NextFunction } from 'express'
import * as service from './tenants.service'

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, status, page, limit } = req.query
    const result = await service.listTenants(
      search as string,
      status as string,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    )
    return res.json(result)
  } catch (err) { return next(err) }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant = await service.getTenant(req.params.id)
    return res.json(tenant)
  } catch (err) { return next(err) }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant = await service.createTenantWithAdmin(req.body)
    return res.status(201).json(tenant)
  } catch (err) { return next(err) }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant = await service.updateTenant(req.params.id, req.body)
    return res.json(tenant)
  } catch (err) { return next(err) }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteTenant(req.params.id)
    return res.status(204).send()
  } catch (err) { return next(err) }
}

export async function stats(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getGlobalStats()
    return res.json(data)
  } catch (err) { return next(err) }
}
