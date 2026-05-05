import { Prisma } from '@prisma/client'
import { prisma } from '../../shared/utils/prisma'
import { AppError } from '../../shared/utils/errors'
import { CreateProductInput, UpdateProductInput } from './products.schema'

export async function listProducts(
  tenantId: string,
  filters: { search?: string; category?: string; inStock?: string; page: number; limit: number }
) {
  const where: Prisma.ProductWhereInput = { tenantId }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { brand: { contains: filters.search, mode: 'insensitive' } },
    ]
  }
  if (filters.category) where.category = filters.category
  if (filters.inStock !== undefined) where.inStock = filters.inStock === 'true'

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    }),
    prisma.product.count({ where }),
  ])

  return { data, total, page: filters.page, limit: filters.limit, pages: Math.ceil(total / filters.limit) }
}

export async function getProduct(tenantId: string, id: string) {
  const product = await prisma.product.findFirst({ where: { id, tenantId } })
  if (!product) throw new AppError('Produto não encontrado', 404)
  return product
}

export async function createProduct(tenantId: string, data: CreateProductInput) {
  return prisma.product.create({ data: { ...data, tenantId } })
}

export async function updateProduct(tenantId: string, id: string, data: UpdateProductInput) {
  await getProduct(tenantId, id)
  return prisma.product.update({ where: { id }, data })
}

export async function deleteProduct(tenantId: string, id: string) {
  await getProduct(tenantId, id)
  await prisma.product.delete({ where: { id } })
}

export async function getProductStats(tenantId: string) {
  const [total, inStock] = await Promise.all([
    prisma.product.count({ where: { tenantId } }),
    prisma.product.count({ where: { tenantId, inStock: true } }),
  ])
  const categories = await prisma.product.groupBy({
    by: ['category'],
    where: { tenantId },
    _count: true,
  })
  return { total, inStock, outOfStock: total - inStock, categories: categories.length }
}
