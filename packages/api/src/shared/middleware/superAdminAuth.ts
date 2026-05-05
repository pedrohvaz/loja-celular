import { Request, Response, NextFunction } from 'express'
import { verifySuperAdminAccessToken, SuperAdminJwtPayload } from '../utils/jwt'

declare global {
  namespace Express {
    interface Request {
      superAdmin?: SuperAdminJwtPayload
    }
  }
}

export function authenticateSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }

  try {
    const token = authHeader.slice(7)
    const payload = verifySuperAdminAccessToken(token)
    if (!payload.isSuperAdmin) {
      return res.status(403).json({ error: 'Acesso restrito ao super admin' })
    }
    req.superAdmin = payload
    return next()
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' })
  }
}
