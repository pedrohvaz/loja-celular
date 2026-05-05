import { Request, Response, NextFunction } from 'express'
import { createProductSchema, updateProductSchema, productFiltersSchema } from './products.schema'
import * as ProductService from './products.service'

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = productFiltersSchema.parse(req.query)
    const result = await ProductService.listProducts(req.user.tenantId, filters)
    return res.json(result)
  } catch (err) { return next(err) }
}

export async function listPublic(req: Request, res: Response, next: NextFunction) {
  try {
    const slug = req.params.slug
    const tenant = await import('../../shared/utils/prisma').then(m =>
      m.prisma.tenant.findUnique({ where: { slug } })
    )
    if (!tenant) return res.status(404).json({ error: 'Loja não encontrada' })
    const filters = productFiltersSchema.parse({ ...req.query, inStock: 'true' })
    const result = await ProductService.listProducts(tenant.id, filters)
    return res.json(result)
  } catch (err) { return next(err) }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await ProductService.getProduct(req.user.tenantId, req.params.id)
    return res.json(product)
  } catch (err) { return next(err) }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createProductSchema.parse(req.body)
    const product = await ProductService.createProduct(req.user.tenantId, data)
    return res.status(201).json(product)
  } catch (err) { return next(err) }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateProductSchema.parse(req.body)
    const product = await ProductService.updateProduct(req.user.tenantId, req.params.id, data)
    return res.json(product)
  } catch (err) { return next(err) }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await ProductService.deleteProduct(req.user.tenantId, req.params.id)
    return res.status(204).send()
  } catch (err) { return next(err) }
}

export async function stats(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await ProductService.getProductStats(req.user.tenantId)
    return res.json(data)
  } catch (err) { return next(err) }
}
