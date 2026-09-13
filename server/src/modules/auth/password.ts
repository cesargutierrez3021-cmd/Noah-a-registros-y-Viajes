import bcrypt from 'bcryptjs'

const RONDAS_SAL = 12

export async function hashearContrasena(contrasena: string): Promise<string> {
  return bcrypt.hash(contrasena, RONDAS_SAL)
}

export async function verificarContrasena(contrasena: string, hash: string): Promise<boolean> {
  return bcrypt.compare(contrasena, hash)
}
