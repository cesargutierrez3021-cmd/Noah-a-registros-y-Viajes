import { post } from '../../lib/api'
import type { Usuario } from './types'

interface RespuestaTokens {
  tokenAcceso: string
  tokenRefresco: string
}

interface RespuestaAuth extends RespuestaTokens {
  usuario: Usuario
}

/** POST /auth/registro (server/src/modules/auth/routes.ts). */
export async function registrarse(email: string, contrasena: string): Promise<RespuestaAuth> {
  return post<RespuestaAuth>('/auth/registro', { email, contrasena })
}

/** POST /auth/login. Mismo shape de respuesta que registro. */
export async function iniciarSesion(email: string, contrasena: string): Promise<RespuestaAuth> {
  return post<RespuestaAuth>('/auth/login', { email, contrasena })
}

/** POST /auth/refrescar. El backend rota el token de refresco (uno nuevo por llamada) — hay que guardar los dos otra vez. */
export async function refrescarSesion(tokenRefresco: string): Promise<RespuestaTokens> {
  return post<RespuestaTokens>('/auth/refrescar', { tokenRefresco })
}
