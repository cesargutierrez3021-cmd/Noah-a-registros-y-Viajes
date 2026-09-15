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

/** POST /auth/olvide-contrasena — paso 1 de "olvidé mi contraseña". Respuesta genérica siempre, el backend nunca revela si el email existe. */
export async function solicitarRecuperacion(email: string): Promise<{ mensaje: string }> {
  return post<{ mensaje: string }>('/auth/olvide-contrasena', { email })
}

/** POST /auth/restablecer-contrasena — paso 2: código de 6 dígitos recibido por email + contraseña nueva. */
export async function restablecerContrasena(email: string, codigo: string, contrasenaNueva: string): Promise<{ mensaje: string }> {
  return post<{ mensaje: string }>('/auth/restablecer-contrasena', { email, codigo, contrasenaNueva })
}
