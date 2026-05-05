import { Request, Response, NextFunction } from 'express'
import { prisma } from '../utils/prisma'

export async function checkTenantActive(req: Request, res: Response, next: NextFunction) {
  // Rotas públicas (sem JWT) passam direto
  if (!req.user?.tenantId) return next()

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      select: { status: true, trialEndsAt: true },
    })

    if (!tenant) return res.status(403).json({ error: 'Empresa não encontrada', code: 'TENANT_NOT_FOUND' })

    if (tenant.status === 'CANCELLED') {
      return res.status(403).json({ error: 'Conta cancelada. Entre em contato com o suporte.', code: 'TENANT_CANCELLED' })
    }

    if (tenant.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Conta suspensa. Entre em contato com o suporte.', code: 'TENANT_SUSPENDED' })
    }

    if (tenant.status === 'TRIAL' && tenant.trialEndsAt && tenant.trialEndsAt < new Date()) {
      return res.status(403).json({ error: 'Período de trial encerrado. Contate o suporte para ativar seu plano.', code: 'TRIAL_EXPIRED' })
    }

    return next()
  } catch {
    return next()
  }
}

export function requireModule(moduleName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.tenantId) return next()
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: req.user.tenantId },
        select: { modules: true },
      })

      if (!tenant?.modules.includes(moduleName)) {
        return res.status(403).json({
          error: `Módulo "${moduleName}" não está disponível no seu plano.`,
          code: 'MODULE_NOT_AVAILABLE',
        })
      }

      return next()
    } catch {
      return next()
    }
  }
}
