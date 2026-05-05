import bcrypt from 'bcryptjs'
import { prisma } from '../../shared/utils/prisma'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../shared/utils/jwt'
import { AppError } from '../../shared/utils/errors'
import { addDays } from 'date-fns'

export async function login(email: string, password: string, slug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug } })
  if (!tenant) throw new AppError('Empresa não encontrada', 404)

  const user = await prisma.user.findUnique({
    where: { email_tenantId: { email, tenantId: tenant.id } },
  })
  if (!user) throw new AppError('Credenciais inválidas', 401)

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) throw new AppError('Credenciais inválidas', 401)

  const payload = { userId: user.id, tenantId: tenant.id, role: user.role, email: user.email }
  const accessToken = signAccessToken(payload)
  const refreshToken = signRefreshToken({ userId: user.id, tenantId: tenant.id })

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: addDays(new Date(), 7),
    },
  })

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantModules: tenant.modules,
    },
  }
}

export async function refresh(token: string) {
  const stored = await prisma.refreshToken.findUnique({ where: { token } })
  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError('Refresh token inválido', 401)
  }

  const { userId, tenantId } = verifyRefreshToken(token)
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new AppError('Usuário não encontrado', 404)

  const payload = { userId: user.id, tenantId, role: user.role, email: user.email }
  const newAccessToken = signAccessToken(payload)
  const newRefreshToken = signRefreshToken({ userId, tenantId })

  await prisma.refreshToken.update({
    where: { token },
    data: { token: newRefreshToken, expiresAt: addDays(new Date(), 7) },
  })

  return { accessToken: newAccessToken, refreshToken: newRefreshToken }
}

export async function logout(token: string) {
  await prisma.refreshToken.deleteMany({ where: { token } })
}
