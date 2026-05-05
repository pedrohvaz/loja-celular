import { Request, Response, NextFunction } from 'express'
import { loginSchema } from './auth.schema'
import * as AuthService from './auth.service'
import { registerTenant, getTrialStatus } from './register.service'
import { prisma } from '../../shared/utils/prisma'

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, slug } = loginSchema.parse(req.body)
    const result = await AuthService.login(email, password, slug)
    return res.json(result)
  } catch (err) {
    return next(err)
  }
}

export async function refreshHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.body.refreshToken as string
    if (!token) return res.status(400).json({ error: 'Refresh token obrigatório' })
    const result = await AuthService.refresh(token)
    return res.json(result)
  } catch (err) {
    return next(err)
  }
}

export async function logoutHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.body.refreshToken as string
    if (token) await AuthService.logout(token)
    return res.json({ message: 'Logout realizado' })
  } catch (err) {
    return next(err)
  }
}

export async function meHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      select: { status: true, trialEndsAt: true, name: true, modules: true, settings: true, plan: { select: { name: true, slug: true, maxUsers: true } } },
    })
    const trial = tenant ? getTrialStatus(tenant.trialEndsAt, tenant.status) : null
    return res.json({
      ...req.user,
      tenantStatus: tenant?.status,
      tenantModules: tenant?.modules ?? [],
      tenantSettings: tenant?.settings ?? null,
      tenantPlan: tenant?.plan ?? null,
      trial,
    })
  } catch (err) {
    return next(err)
  }
}

export async function registerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await registerTenant(req.body)
    return res.status(201).json(result)
  } catch (err) {
    return next(err)
  }
}
