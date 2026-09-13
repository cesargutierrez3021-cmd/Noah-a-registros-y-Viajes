import type { NextFunction, Request, Response } from 'express'
import { verificarTokenAcceso } from './jwt.js'

// Extiende el tipo de Express Request — así cualquier ruta protegida
// tiene `req.usuarioId` con tipos, sin castear a `any` en cada handler.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuarioId?: string
    }
  }
}

/**
 * Único middleware que decide "¿quién es el usuario autenticado?". Ninguna
 * ruta debe leer o verificar el header Authorization por su cuenta.
 */
export function requiereAutenticacion(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Falta el token de acceso' })
    return
  }

  try {
    const carga = verificarTokenAcceso(header.slice('Bearer '.length))
    req.usuarioId = carga.sub
    next()
  } catch {
    res.status(401).json({ error: 'Token de acceso inválido o expirado' })
  }
}
