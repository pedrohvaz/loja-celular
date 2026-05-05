import bcrypt from 'bcryptjs'
import { prisma } from '../../../shared/utils/prisma'
import {
  signSuperAdminAccessToken,
  signSuperAdminRefreshToken,
  verifySuperAdminRefreshToken,
} from '../../../shared/utils/jwt'
import { AppError } from '../../../shared/utils/errors'
import { addDays } from 'date-fns'

export async function superAdminLogin(email: string, password: string) {
  const admin = await prisma.superAdmin.findUnique({ where: { email } })
  if (!admin) throw new AppError('Credenciais inválidas', 401)

  const valid = await bcrypt.compare(password, admin.passwordHash)
  if (!valid) throw new AppError('Credenciais inválidas', 401)

  const accessToken = signSuperAdminAccessToken({ superAdminId: admin.id, email: admin.email })
  const refreshToken = signSuperAdminRefreshToken({ superAdminId: admin.id })

  await prisma.superAdminRefreshToken.create({
    data: { superAdminId: admin.id, token: refreshToken, expiresAt: addDays(new Date(), 7) },
  })

  return {
    accessToken,
    refreshToken,
    superAdmin: { id: admin.id, name: admin.name, email: admin.email },
  }
}

export async function superAdminRefresh(token: string) {
  const stored = await prisma.superAdminRefreshToken.findUnique({ where: { token } })
  if (!stored || stored.expiresAt < new Date()) throw new AppError('Refresh token inválido', 401)

  const { superAdminId } = verifySuperAdminRefreshToken(token)
  const admin = await prisma.superAdmin.findUnique({ where: { id: superAdminId } })
  if (!admin) throw new AppError('Super admin não encontrado', 404)

  const newAccessToken = signSuperAdminAccessToken({ superAdminId: admin.id, email: admin.email })
  const newRefreshToken = signSuperAdminRefreshToken({ superAdminId: admin.id })

  await prisma.superAdminRefreshToken.update({
    where: { token },
    data: { token: newRefreshToken, expiresAt: addDays(new Date(), 7) },
  })

  return { accessToken: newAccessToken, refreshToken: newRefreshToken }
}

export async function superAdminLogout(token: string) {
  await prisma.superAdminRefreshToken.deleteMany({ where: { token } })
}
