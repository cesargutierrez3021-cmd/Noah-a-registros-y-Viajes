import { create } from 'zustand'
import type { Viaje, Plataforma, PuntoGPS } from './types'
import { repositorioViajes, crearViajeDesdeCiere } from './repository'
import { iniciarSeguimientoGPS, type SeguidorGPS } from './gps'

/**
 * Store del dominio de Viajes. A propósito, este store SOLO conoce viajes —
 * no gastos, no deudas, no jornada. Cada dominio nuevo tiene su propio store
 * siguiendo este mismo patrón, en su propia carpeta bajo domain/.
 *
 * Flujo real de un viaje: iniciarViaje -> (opcional) marcarRecogida -> finalizarViaje.
 * Mientras el viaje está en curso, el recorrido se va llenando solo, punto por
 * punto, desde el servicio de GPS (gps.ts) — la pantalla nunca toca el GPS directo.
 */

interface ViajeEnCurso {
  id: string
  plataforma: Plataforma
  inicioISO: string
  recorrido: PuntoGPS[]
  puntoDeRecogidaISO: string | null
}

interface EstadoViajes {
  viajes: Viaje[]
  viajeEnCurso: ViajeEnCurso | null
  cargando: boolean
  cargar: () => Promise<void>
  iniciarViaje: (plataforma: Plataforma) => Promise<void>
  marcarRecogida: () => void
  finalizarViaje: (params: {
    ingreso: number
    distanciaReportadaPlataforma: number | null
  }) => Promise<Viaje | null>
}

function generarId(): string {
  return crypto.randomUUID()
}

// Vive fuera del store porque no es "estado" para renderizar, es un recurso activo.
let seguidorActivo: SeguidorGPS | null = null

export const useViajes = create<EstadoViajes>((set, get) => ({
  viajes: [],
  viajeEnCurso: null,
  cargando: false,

  cargar: async () => {
    set({ cargando: true })
    const viajes = await repositorioViajes.listar()
    set({ viajes, cargando: false })
  },

  iniciarViaje: async (plataforma) => {
    if (get().viajeEnCurso) return // ya hay un viaje activo, no se abren dos a la vez

    const enCurso: ViajeEnCurso = {
      id: generarId(),
      plataforma,
      inicioISO: new Date().toISOString(),
      recorrido: [],
      puntoDeRecogidaISO: null,
    }
    set({ viajeEnCurso: enCurso })

    seguidorActivo = await iniciarSeguimientoGPS((punto) => {
      set((s) => {
        if (!s.viajeEnCurso) return s
        return { viajeEnCurso: { ...s.viajeEnCurso, recorrido: [...s.viajeEnCurso.recorrido, punto] } }
      })
    })
  },

  marcarRecogida: () => {
    set((s) => {
      if (!s.viajeEnCurso || s.viajeEnCurso.puntoDeRecogidaISO) return s
      return { viajeEnCurso: { ...s.viajeEnCurso, puntoDeRecogidaISO: new Date().toISOString() } }
    })
  },

  finalizarViaje: async ({ ingreso, distanciaReportadaPlataforma }) => {
    const enCurso = get().viajeEnCurso
    if (!enCurso) return null

    seguidorActivo?.detener()
    seguidorActivo = null

    const viaje = crearViajeDesdeCiere(enCurso.id, {
      plataforma: enCurso.plataforma,
      inicioISO: enCurso.inicioISO,
      finISO: new Date().toISOString(),
      recorrido: enCurso.recorrido,
      puntoDeRecogidaISO: enCurso.puntoDeRecogidaISO,
      distanciaReportadaPlataforma,
      ingreso,
    })

    await repositorioViajes.guardar(viaje)
    set({ viajes: [viaje, ...get().viajes], viajeEnCurso: null })
    return viaje
  },
}))
