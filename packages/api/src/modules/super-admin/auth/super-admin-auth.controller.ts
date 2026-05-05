import { Request, Response, NextFunction } from 'express'
import { superAdminLogin, superAdminRefresh, superAdminLogout } from './super-admin-auth.service'
import { prisma } from '../../../shared/utils/prisma'

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body
    const result = await superAdminLogin(email, password)
    return res.json(result)
  } catch (err) {
    return next(err)
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body
    const result = await superAdminRefresh(refreshToken)
    return res.json(result)
  } catch (err) {
    return next(err)
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body
    if (refreshToken) await superAdminLogout(refreshToken)
    return res.json({ success: true })
  } catch (err) {
    return next(err)
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const admin = await prisma.superAdmin.findUnique({
      where: { id: req.superAdmin!.superAdminId },
      select: { id: true, name: true, email: true, createdAt: true },
    })
    return res.json(admin)
  } catch (err) {
    return next(err)
  }
}
