import { randomBytes, createHash } from 'node:crypto'

/**
 * El refresh token NO es un JWT — es un secreto aleatorio opaco. Se guarda en
 * la base de datos como hash (nunca en texto plano, igual que una contraseña),
 * así se puede revocar por fila sin depender de que expire un JWT firmado.
 */
export function generarTokenRefrescoCrudo(): string {
  return randomBytes(48).toString('hex')
}

export function hashearTokenRefresco(tokenCrudo: string): string {
  return createHash('sha256').update(tokenCrudo).digest('hex')
}
