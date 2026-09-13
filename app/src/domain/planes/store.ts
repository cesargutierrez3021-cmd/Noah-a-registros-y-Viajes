import { create } from 'zustand'
import { listarPlanes, obtenerPlanActual } from './api'
import type { Plan } from './types'

interface EstadoPlanes {
  planes: Plan[]
  planActual: Plan | null
  cargando: boolean
  error: string | null
  cargar: (haySesion: boolean) => Promise<void>
}

export const usePlanes = create<EstadoPlanes>((set) => ({
  planes: [],
  planActual: null,
  cargando: false,
  error: null,

  /**
   * `haySesion` lo decide quien llama (features/planes/PlanesScreen.tsx, vía
   * `useAuth().autenticado()`) — este store no importa domain/auth para no
   * crear una dependencia cruzada entre dominios, mismo principio de D-10.
   */
  cargar: async (haySesion) => {
    set({ cargando: true, error: null })
    try {
      const planes = await listarPlanes()
      const planActual = haySesion ? await obtenerPlanActual() : null
      set({ planes, planActual, cargando: false })
    } catch (error) {
      set({ cargando: false, error: error instanceof Error ? error.message : 'Ocurrió un error inesperado.' })
    }
  },
}))
