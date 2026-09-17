import { create } from 'zustand'
import { guardarTokens, borrarTokens, haySesion, URL_BASE } from '../../lib/api'
import { registrarse, iniciarSesion, solicitarRecuperacion, restablecerContrasena } from './api'
import { restaurarTodoDesdeServidor } from '../restauracion/restaurar'
import type { Usuario } from './types'

/**
 * Store de sesión. `usuario` solo se conoce en memoria mientras la app está
 * abierta (viene de la respuesta de /auth/registro o /auth/login) — no se
 * persiste por separado, porque lo único que hace falta para saber "sigo
 * logueado" al reabrir la app es que exista un token de acceso guardado
 * (`haySesion()`, en lib/api.ts). Si el token expiró, la primera llamada
 * autenticada que falle es quien se entera (ver nota en lib/api.ts sobre
 * por qué no hay refresco automático todavía).
 */

interface EstadoAuth {
  usuario: Usuario | null
  cargando: boolean
  error: string | null
  autenticado: () => boolean
  registrarse: (email: string, contrasena: string) => Promise<boolean>
  iniciarSesion: (email: string, contrasena: string) => Promise<boolean>
  cerrarSesion: () => void
  solicitarRecuperacion: (email: string) => Promise<boolean>
  restablecerContrasena: (email: string, codigo: string, contrasenaNueva: string) => Promise<boolean>
}

export const useAuth = create<EstadoAuth>((set) => ({
  usuario: null,
  cargando: false,
  error: null,

  autenticado: () => haySesion(),

  registrarse: async (email, contrasena) => {
    set({ cargando: true, error: null })
    try {
      const { usuario, tokenAcceso, tokenRefresco } = await registrarse(email, contrasena)
      guardarTokens(tokenAcceso, tokenRefresco)
      // Cuenta recién creada — normalmente no hay nada que restaurar, pero si
      // el usuario ya se había registrado antes en otro teléfono con este
      // mismo email (ver el comentario largo de restaurarTodoDesdeServidor),
      // esto lo trae de vuelta igual. Best-effort: un fallo acá no debe
      // impedir que el registro/login en sí cuente como exitoso — los
      // tokens ya quedaron guardados, la próxima sesión puede reintentarlo.
      await restaurarTodoDesdeServidor().catch(() => undefined)
      set({ usuario, cargando: false })
      return true
    } catch (error) {
      set({ cargando: false, error: mensajeDeError(error) })
      return false
    }
  },

  iniciarSesion: async (email, contrasena) => {
    set({ cargando: true, error: null })
    try {
      const { usuario, tokenAcceso, tokenRefresco } = await iniciarSesion(email, contrasena)
      guardarTokens(tokenAcceso, tokenRefresco)
      // 2026-09-17, pedido explícito del usuario ("cada vez que instalo la
      // aplicación se borran todos los datos... supuestamente estamos
      // conectados... para guardar la base de datos"): acá es donde se
      // restaura de verdad — iniciar sesión después de reinstalar es
      // exactamente el caso que reportó. Ver domain/restauracion/restaurar.ts.
      await restaurarTodoDesdeServidor().catch(() => undefined)
      set({ usuario, cargando: false })
      return true
    } catch (error) {
      set({ cargando: false, error: mensajeDeError(error) })
      return false
    }
  },

  cerrarSesion: () => {
    borrarTokens()
    set({ usuario: null })
  },

  solicitarRecuperacion: async (email) => {
    set({ cargando: true, error: null })
    try {
      await solicitarRecuperacion(email)
      set({ cargando: false })
      return true
    } catch (error) {
      set({ cargando: false, error: mensajeDeError(error) })
      return false
    }
  },

  restablecerContrasena: async (email, codigo, contrasenaNueva) => {
    set({ cargando: true, error: null })
    try {
      await restablecerContrasena(email, codigo, contrasenaNueva)
      set({ cargando: false })
      return true
    } catch (error) {
      set({ cargando: false, error: mensajeDeError(error) })
      return false
    }
  },
}))

// TEMPORAL — diagnóstico en pantalla del bug "Failed to fetch" (ver
// PLAN-MAESTRO): sin forma de conectar el teléfono a una PC para leer la
// consola real, se muestra acá mismo la URL a la que intentó conectarse y
// si el teléfono tenía internet en ese momento. Sacar este detalle extra
// (volver a la versión simple de una sola línea) en cuanto el bug esté
// confirmado y resuelto.
function mensajeDeError(error: unknown): string {
  const online = typeof navigator !== 'undefined' ? navigator.onLine : 'desconocido'
  if (error instanceof Error) {
    return `${error.name}: ${error.message} | intentó conectar a: ${URL_BASE} | teléfono con internet: ${online}`
  }
  return `Ocurrió un error inesperado. | intentó conectar a: ${URL_BASE} | teléfono con internet: ${online}`
}
