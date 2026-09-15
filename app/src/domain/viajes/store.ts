import { create } from 'zustand'
import type { Viaje, Plataforma, PuntoGPS, ViajeManualInput } from './types'
import { repositorioViajes, crearViajeDesdeCiere, crearViajeManual } from './repository'
import { calcularDistanciaReal } from './distancia'
import { iniciarSeguimientoGPS, type SeguidorGPS } from './gps'
import { Capacitor } from '@capacitor/core'
import { obtenerTrazaPersistida, limpiarTrazaPersistida } from './gpsBackground'
import { mostrarBurbuja, actualizarBurbuja, ocultarBurbuja } from './burbuja'

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
  /**
   * 2026-09-16 (corrección de un bug real, ver el comentario de
   * `ingresoPendiente` en types.ts): detiene el GPS y GUARDA el viaje de
   * una vez, con `ingreso: 0` e `ingresoPendiente: true` — ya no se queda
   * "atascado" en `viajeEnCurso` esperando a que se abra la app. Por eso
   * `viajeEnCurso` queda en `null` apenas termina esta función, igual que
   * `finalizarViaje` — así la burbuja puede arrancar el siguiente viaje de
   * inmediato, sin importar cuántos viajes queden pendientes de ingreso.
   * Lo dispara la burbuja flotante al tocarla para terminar un viaje.
   */
  pausarParaIngreso: () => Promise<void>
  finalizarViaje: (params: {
    ingreso: number
    distanciaReportadaPlataforma: number | null
  }) => Promise<Viaje | null>
  /**
   * 2026-09-16 — completa el ingreso de un viaje que quedó pendiente (ver
   * `pausarParaIngreso`). Puede haber varios al mismo tiempo; cada uno se
   * resuelve por separado, en cualquier orden — no hay un solo "el viaje
   * pendiente", son todos los que tengan `ingresoPendiente: true`.
   */
  completarIngreso: (viajeId: string, ingreso: number) => Promise<void>
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
const CLAVE_ACTIVO = 'mia:viaje-en-curso'
function calcularKmLocal(puntos: PuntoGPS[]): number { return calcularDistanciaReal({ plataforma:'Particular', inicioISO:'', finISO:'', recorrido:puntos, puntoDeRecogidaISO:null, distanciaReportadaPlataforma:null, ingreso:0, ingresoPendiente:false }).kmTotalesReales }
function guardarActivo(v: ViajeEnCurso | null){ if(v) localStorage.setItem(CLAVE_ACTIVO, JSON.stringify(v)); else localStorage.removeItem(CLAVE_ACTIVO) }

export const useViajes = create<EstadoViajes>((set, get) => ({
  viajes: [],
  viajeEnCurso: null,
  cargando: false,
  errorGPS: null,

  cargar: async () => {
    set({ cargando: true })
    const viajes = await repositorioViajes.listar()
    let viajeEnCurso: ViajeEnCurso | null = null
    try {
      const guardado = localStorage.getItem(CLAVE_ACTIVO)
      if (guardado) viajeEnCurso = JSON.parse(guardado) as ViajeEnCurso
      if (viajeEnCurso && Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
        const puntos = await obtenerTrazaPersistida()
        if (puntos.length) viajeEnCurso = { ...viajeEnCurso, recorrido: puntos.map(p => ({ lat:p.lat, lng:p.lng, timestampISO:new Date(p.timestampMs).toISOString() })) }
      }
    } catch { /* recuperación best-effort */ }
    set({ viajes, viajeEnCurso, cargando: false })
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
    guardarActivo(enCurso)

    // Bloque 1, ítem 1: iniciarSeguimientoGPS puede rechazar (permiso negado,
    // GPS desactivado, plugin nativo sin registrar, etc.) — antes ese rechazo
    // no lo atrapaba nadie, quedaba como una promesa rechazada silenciosa y
    // el viaje se veía "iniciado" en pantalla sin que el GPS estuviera
    // grabando nada de verdad. Ahora: si falla, se avisa (errorGPS) y el
    // viaje en curso se cancela — mejor que dejar al conductor pensando que
    // se está registrando un recorrido que en realidad está vacío.
    try {
      void mostrarBurbuja('0.0', '0m', true, get().viajes.length + 1)
      seguidorActivo = await iniciarSeguimientoGPS((punto) => {
        set((s) => {
          if (!s.viajeEnCurso) return s
          const actualizado = { ...s.viajeEnCurso, recorrido: [...s.viajeEnCurso.recorrido, punto] }
          guardarActivo(actualizado)
          const mins = Math.max(0, Math.round((Date.now() - Date.parse(actualizado.inicioISO))/60000))
          void actualizarBurbuja((calcularKmLocal(actualizado.recorrido)).toFixed(1), `${mins}m`, true, get().viajes.length + 1)
          return { viajeEnCurso: actualizado }
        })
      })
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo iniciar el GPS'
      set({ viajeEnCurso: null, errorGPS: mensaje })
      void ocultarBurbuja()
      guardarActivo(null)
    }
  },

  marcarRecogida: () => {
    set((s) => {
      if (!s.viajeEnCurso || s.viajeEnCurso.puntoDeRecogidaISO) return s
      const actualizado = { ...s.viajeEnCurso, puntoDeRecogidaISO: new Date().toISOString() }
      guardarActivo(actualizado)
      return { viajeEnCurso: actualizado }
    })
  },

  /**
   * Ver el comentario de esta función en la interfaz `EstadoViajes` de
   * arriba — usado por la burbuja al terminar un viaje sin abrir la app.
   * Guarda el viaje YA (con `ingresoPendiente: true`) y libera
   * `viajeEnCurso`, para que la burbuja pueda arrancar el siguiente viaje
   * sin esperar a que el conductor abra la app.
   */
  pausarParaIngreso: async () => {
    const enCurso = get().viajeEnCurso
    if (!enCurso) return
    seguidorActivo?.detener()
    seguidorActivo = null

    const viaje = crearViajeDesdeCiere(enCurso.id, {
      plataforma: enCurso.plataforma,
      inicioISO: enCurso.inicioISO,
      finISO: new Date().toISOString(),
      recorrido: enCurso.recorrido,
      puntoDeRecogidaISO: enCurso.puntoDeRecogidaISO,
      distanciaReportadaPlataforma: null,
      ingreso: 0,
      ingresoPendiente: true,
    })

    await repositorioViajes.guardar(viaje)
    set({ viajes: [viaje, ...get().viajes], viajeEnCurso: null })
    // A diferencia de finalizarViaje, acá NO se oculta la burbuja — el
    // conductor sigue trabajando sin haber abierto la app, así que se
    // resetea a "lista para el próximo viaje" en vez de desaparecer.
    void actualizarBurbuja('0.0', '0m', false, get().viajes.length)
    guardarActivo(null)
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') void limpiarTrazaPersistida()
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
      ingresoPendiente: false,
    })

    await repositorioViajes.guardar(viaje)
    set({ viajes: [viaje, ...get().viajes], viajeEnCurso: null })
    void actualizarBurbuja(viaje.distancia.kmTotalesReales.toFixed(1), `${Math.round((Date.parse(viaje.finISO!) - Date.parse(viaje.inicioISO))/60000)}m`, false, get().viajes.length)
    void ocultarBurbuja()
    guardarActivo(null)
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') void limpiarTrazaPersistida()
    return viaje
  },

  completarIngreso: async (viajeId, ingreso) => {
    const viaje = get().viajes.find((v) => v.id === viajeId)
    if (!viaje) return
    const actualizado: Viaje = { ...viaje, ingreso, ingresoPendiente: false, pendienteDeSync: true }
    await repositorioViajes.guardar(actualizado)
    set({ viajes: get().viajes.map((v) => (v.id === viajeId ? actualizado : v)) })
  },

  agregarViajeManual: async (input) => {
    const viaje = crearViajeManual(generarId(), input)
    await repositorioViajes.guardar(viaje)
    set({ viajes: [viaje, ...get().viajes] })
    return viaje
  },
}))
