import jwt from 'jsonwebtoken'

export interface JwtPayload {
  userId: string
  tenantId: string
  role: string
  email: string
}

export interface SuperAdminJwtPayload {
  superAdminId: string
  email: string
  isSuperAdmin: true
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '15m') as jwt.SignOptions['expiresIn'],
  })
}

export function signRefreshToken(payload: Pick<JwtPayload, 'userId' | 'tenantId'>): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'],
  })
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
}

export function verifyRefreshToken(token: string): Pick<JwtPayload, 'userId' | 'tenantId'> {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as Pick<JwtPayload, 'userId' | 'tenantId'>
}

export function signSuperAdminAccessToken(payload: Omit<SuperAdminJwtPayload, 'isSuperAdmin'>): string {
  return jwt.sign({ ...payload, isSuperAdmin: true }, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '15m') as jwt.SignOptions['expiresIn'],
  })
}

export function signSuperAdminRefreshToken(payload: Pick<SuperAdminJwtPayload, 'superAdminId'>): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'],
  })
}

export function verifySuperAdminAccessToken(token: string): SuperAdminJwtPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as SuperAdminJwtPayload
}

export function verifySuperAdminRefreshToken(token: string): Pick<SuperAdminJwtPayload, 'superAdminId'> {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as Pick<SuperAdminJwtPayload, 'superAdminId'>
}
