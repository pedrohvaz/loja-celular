import { Router } from 'express'
import { authenticate } from '../../shared/middleware/auth'
import { prisma } from '../../shared/utils/prisma'
import { z } from 'zod'

const router = Router()

const schema = z.object({ name: z.string().min(1), slug: z.string().min(1) })

const ACCENTS: Record<string, string> = {
  á: 'a', à: 'a', ã: 'a', â: 'a', ä: 'a',
  é: 'e', è: 'e', ê: 'e', ë: 'e',
  í: 'i', ì: 'i', î: 'i', ï: 'i',
  ó: 'o', ò: 'o', õ: 'o', ô: 'o', ö: 'o',
  ú: 'u', ù: 'u', û: 'u', ü: 'u',
  ç: 'c', ñ: 'n',
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .split('').map(ch => ACCENTS[ch] ?? ch).join('')
    .replace(/[^a-z0-9]+/g, '')
}

router.get('/public/:slug', async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: req.params.slug } })
    if (!tenant) return res.status(404).json({ error: 'Loja nao encontrada' })
    const data = await prisma.productCategory.findMany({ where: { tenantId: tenant.id }, orderBy: { name: 'asc' } })
    return res.json(data)
  } catch (e) { return next(e) }
})

router.use(authenticate)

router.get('/', async (req, res, next) => {
  try {
    const data = await prisma.productCategory.findMany({ where: { tenantId: req.user.tenantId }, orderBy: { name: 'asc' } })
    return res.json(data)
  } catch (e) { return next(e) }
})

router.post('/', async (req, res, next) => {
  try {
    const body = schema.partial({ slug: true }).parse(req.body)
    const slug = body.slug ? slugify(body.slug) : slugify(body.name)
    return res.status(201).json(await prisma.productCategory.create({ data: { name: body.name, slug, tenantId: req.user.tenantId } }))
  } catch (e) { return next(e) }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.productCategory.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } })
    if (!existing) return res.status(404).json({ error: 'Categoria não encontrada' })
    const body = schema.partial().parse(req.body)
    const data: { name?: string; slug?: string } = {}
    if (body.name !== undefined) data.name = body.name
    if (body.slug !== undefined) data.slug = slugify(body.slug)
    return res.json(await prisma.productCategory.update({ where: { id: req.params.id }, data }))
  } catch (e) { return next(e) }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.productCategory.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } })
    if (!existing) return res.status(404).json({ error: 'Categoria não encontrada' })
    await prisma.productCategory.delete({ where: { id: req.params.id } })
    return res.status(204).send()
  } catch (e) { return next(e) }
})

export default router
