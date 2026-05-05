import { Request, Response, NextFunction } from 'express'

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message })
  }

  if (err.name === 'ZodError') {
    return res.status(422).json({ error: 'Dados inválidos', details: err.message })
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Token inválido' })
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expirado' })
  }

  console.error(err)
  return res.status(500).json({ error: 'Erro interno do servidor' })
}
