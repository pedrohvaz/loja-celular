import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken, JwtPayload } from '../utils/jwt'

declare global {
  namespace Express {
    interface Request {
      user: JwtPayload
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }

  try {
    const token = authHeader.slice(7)
    req.user = verifyAccessToken(token)
    return next()
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' })
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito a administradores' })
  }
  return next()
}
