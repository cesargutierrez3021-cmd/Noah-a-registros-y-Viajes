import jwt from 'jsonwebtoken'
import { env } from '../../config/env'
import type { CargaTokenAcceso } from './types'

export function firmarTokenAcceso(carga: CargaTokenAcceso): string {
  return jwt.sign(carga, env.jwtSecretoAcceso, { expiresIn: `${env.jwtExpiracionAccesoMin}m` })
}

/** Lanza si el token es inválido o expiró — quien llame decide cómo responder (401). */
export function verificarTokenAcceso(token: string): CargaTokenAcceso {
  return jwt.verify(token, env.jwtSecretoAcceso) as CargaTokenAcceso
}
