import { create } from 'zustand'
import { guardarTokens, borrarTokens, haySesion } from '../../lib/api'
import { registrarse, iniciarSesion } from './api'
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
}

export const useAuth = create<EstadoAuth>((set, get) => ({
  usuario: null,
  cargando: false,
  error: null,

  autenticado: () => haySesion(),

  registrarse: async (email, contrasena) => {
    set({ cargando: true, error: null })
    try {
      const { usuario, tokenAcceso, tokenRefresco } = await registrarse(email, contrasena)
      guardarTokens(tokenAcceso, tokenRefresco)
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
}))

function mensajeDeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.'
}
