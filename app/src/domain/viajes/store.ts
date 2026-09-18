import { create } from 'zustand'
import type { Viaje, Plataforma, PuntoGPS, ViajeManualInput } from './types'
import { repositorioViajes, crearViajeDesdeCiere, crearViajeManual } from './repository'
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
  /** Bloque 1, ítem 1: antes un error de GPS al iniciar viaje quedaba en
   *  silencio (la promesa rechazada de iniciarSeguimientoGPS no se atrapaba
   *  en ningún lado). Ahora queda acá, visible, para que la pantalla lo
   *  muestre — se limpia solo al iniciar un viaje nuevo con éxito. */
  errorGPS: string | null
  cargar: () => Promise<void>
  iniciarViaje: (plataforma: Plataforma) => Promise<void>
  marcarRecogida: () => void
  finalizarViaje: (params: {
    ingreso: number
    distanciaReportadaPlataforma: number | null
  }) => Promise<Viaje | null>
  /**
   * Auditoría GPS (ver distancia.ts y GpsTrackingService.kt): el GPS a veces
   * captura 0 o muy pocos puntos (arranque en frío, viaje corto) y el km
   * calculado queda en 0 o muy bajo. Antes `distancia` "se calcula, nunca se
   * guarda a mano" (types.ts) — eso ya no es cierto: esto deja corregir el
   * km TOTAL a mano después de finalizar, para cuando el conductor sabe que
   * el número real es otro. `kmHastaRecoger` se resetea a 0 porque una
   * corrección manual no puede reconstruir el desglose recogida/con
   * pasajero que ya se perdió — mismo criterio que `crearViajeManual`
   * (repository.ts), que tampoco separa esos dos tramos.
   */
  corregirKmViaje: (id: string, kmCorregidos: number) => Promise<void>
  /** Bloque 2, ítem 4 — "agregar viaje manual". No toca `viajeEnCurso` ni el
   *  GPS para nada: es un camino totalmente aparte para cargar un viaje que
   *  ya pasó y no se registró en su momento. */
  agregarViajeManual: (input: ViajeManualInput) => Promise<Viaje>
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
  errorGPS: null,

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
    set({ viajeEnCurso: enCurso, errorGPS: null })

    // Bloque 1, ítem 1: iniciarSeguimientoGPS puede rechazar (permiso negado,
    // GPS desactivado, plugin nativo sin registrar, etc.) — antes ese rechazo
    // no lo atrapaba nadie, quedaba como una promesa rechazada silenciosa y
    // el viaje se veía "iniciado" en pantalla sin que el GPS estuviera
    // grabando nada de verdad. Ahora: si falla, se avisa (errorGPS) y el
    // viaje en curso se cancela — mejor que dejar al conductor pensando que
    // se está registrando un recorrido que en realidad está vacío.
    try {
      seguidorActivo = await iniciarSeguimientoGPS((punto) => {
        set((s) => {
          if (!s.viajeEnCurso) return s
          return { viajeEnCurso: { ...s.viajeEnCurso, recorrido: [...s.viajeEnCurso.recorrido, punto] } }
        })
      })
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo iniciar el GPS'
      set({ viajeEnCurso: null, errorGPS: mensaje })
    }
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

  agregarViajeManual: async (input) => {
    const viaje = crearViajeManual(generarId(), input)
    await repositorioViajes.guardar(viaje)
    set({ viajes: [viaje, ...get().viajes] })
    return viaje
  },

  corregirKmViaje: async (id, kmCorregidos) => {
    const viaje = get().viajes.find((v) => v.id === id)
    if (!viaje) return
    const corregido: Viaje = {
      ...viaje,
      distancia: { kmHastaRecoger: 0, kmConPasajero: kmCorregidos, kmTotalesReales: kmCorregidos },
      pendienteDeSync: true, // el backend tiene la versión vieja del km, hay que resubirlo
    }
    await repositorioViajes.guardar(corregido)
    set({ viajes: get().viajes.map((v) => (v.id === id ? corregido : v)) })
  },
}))
