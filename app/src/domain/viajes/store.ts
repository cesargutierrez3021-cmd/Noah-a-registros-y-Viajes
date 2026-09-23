import { create } from 'zustand'
import type { Viaje, Plataforma, PuntoGPS, ViajeManualInput } from './types'
import { PLATAFORMAS_DISPONIBLES } from './types'
import { repositorioViajes, crearViajeDesdeCiere, crearViajeManual } from './repository'
import { calcularDistanciaReal } from './distancia'
import { iniciarSeguimientoGPS, obtenerUbicacionActual, filtrarRecorridoValido, type SeguidorGPS } from './gps'
import { obtenerLocalidad, obtenerZonaCustom } from './geofencing'
import { Capacitor } from '@capacitor/core'
import { obtenerTrazaPersistida, limpiarTrazaPersistida, type PuntoGpsCrudo } from './gpsBackground'
import { mostrarBurbuja, actualizarBurbuja, ocultarBurbuja, obtenerViajesPendientesNativos, limpiarViajesPendientesNativos } from './burbuja'

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
  /**
   * 2026-09-15, pedido explícito del usuario: "yo escucho la burbuja... queda
   * registrado como particular... hay que poner botón de preferencia... para
   * que si yo siempre hago viajes en Uber, siempre aparezca con Uber". `null`
   * = sin preferencia elegida todavía (se sigue usando 'Particular' como
   * hasta ahora). Se elige en Ajustes (ver AjustesScreen.tsx) y la usa
   * `burbujaOrquestacion.ts` al iniciar un viaje desde la burbuja — sigue
   * siendo editable a mano en cada viaje (acá y en el picker normal), esto
   * solo cambia el valor de ARRANQUE cuando no hay forma de elegir con un
   * solo toque.
   */
  plataformaPreferida: Plataforma | null
  elegirPlataformaPreferida: (plataforma: Plataforma) => void
  cargar: () => Promise<void>
  /** Bloque 1, ítem 1: antes un error de GPS al iniciar viaje quedaba en
   *  silencio (la promesa rechazada de iniciarSeguimientoGPS no se atrapaba
   *  en ningún lado). Ahora queda acá, visible, para que la pantalla lo
   *  muestre — se limpia solo al iniciar un viaje nuevo con éxito. */
  errorGPS: string | null
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
    /**
     * 2026-09-22, pedido explícito del usuario ("cuando yo vaya a poner el
     * dinero... también me editar los kilómetros por si hay algún error"):
     * si viene con valor, reemplaza el km medido por GPS — para corregir a
     * mano un recorrido que el GPS midió mal. `undefined`/`null` = usar el
     * km real medido, sin tocarlo (caso normal).
     */
    kmManual?: number | null
  }) => Promise<Viaje | null>
  /**
   * 2026-09-16 — completa el ingreso de un viaje que quedó pendiente (ver
   * `pausarParaIngreso`). Puede haber varios al mismo tiempo; cada uno se
   * resuelve por separado, en cualquier orden — no hay un solo "el viaje
   * pendiente", son todos los que tengan `ingresoPendiente: true`.
   */
  completarIngreso: (viajeId: string, ingreso: number, plataforma: Plataforma, kmManual?: number | null) => Promise<void>
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
export function calcularKmLocal(puntos: PuntoGPS[]): number { return calcularDistanciaReal({ plataforma:'Particular', inicioISO:'', finISO:'', recorrido:puntos, puntoDeRecogidaISO:null, distanciaReportadaPlataforma:null, ingreso:0, ingresoPendiente:false }).kmTotalesReales }
function guardarActivo(v: ViajeEnCurso | null){ if(v) localStorage.setItem(CLAVE_ACTIVO, JSON.stringify(v)); else localStorage.removeItem(CLAVE_ACTIVO) }

/**
 * 2026-09-15, pedido explícito del usuario (bug real, tercera vez reportado):
 * "la mayoría de los viajes queda siempre en cero". Antes de esto revisé de
 * nuevo el umbral de movimiento de `puntoValido()` (gps.ts) con la teoría de
 * que estaba descartando movimiento real a velocidad de tráfico urbano — una
 * simulación completa de un viaje real demostró que esa teoría estaba MAL
 * (el filtro viejo da 101-159% de la distancia real; aflojarlo sobrecontaba
 * hasta 326%), así que ese umbral quedó IGUAL — ver el comentario largo en
 * gps.ts. La causa real es otra: `GpsTrackingService.kt` (nativo) guarda
 * CADA punto en `SharedPreferences` pase lo que pase, pero solo se lo
 * reenvía al lado JS (`viajeEnCurso.recorrido`, acá en el store) si el
 * WebView/Activity sigue viva en ese momento — Android la puede matar por
 * presión de memoria mientras el conductor pasa horas con la app minimizada
 * (mismo mecanismo ya documentado en BurbujaService.kt, ronda anterior), y en
 * varios fabricantes (Xiaomi/Samsung/Huawei/Oppo) el sistema además puede
 * parar la captura de GPS en segundo plano en silencio si la app no está
 * excluida de la optimización de batería (ver GpsTrackingPlugin.kt,
 * solicitarIgnorarOptimizacionBateria()). Si algo de eso pasa a mitad de un
 * viaje, `viajeEnCurso.recorrido` en el store de JS se queda corto — le
 * faltan los puntos capturados mientras el WebView estaba caída — y el viaje
 * se guarda con menos kilómetros de los reales, a veces con recorrido casi
 * vacío si la caída duró la mayor parte del viaje.
 *
 * Acá, al CERRAR un viaje, se compara el recorrido que alcanzó a llegar en
 * vivo contra la traza completa que el nativo persistió sola — si la
 * persistida tiene más puntos (señal de que al JS le faltaron capturas), se
 * usa esa en su lugar, filtrada con el mismo criterio de siempre
 * (`filtrarRecorridoValido`, gps.ts — la traza persistida es CRUDA, sin
 * filtrar, así que no se puede usar tal cual sin pasarla por el mismo
 * filtro que ya usa la captura en vivo). Es una simple lectura de
 * `SharedPreferences` vía el plugin (no un GPS nuevo, no hay que esperar un
 * fix) — no reintroduce el riesgo de bloquear el siguiente viaje de la
 * burbuja que se corrigió en la ronda del bug de zona.
 */
async function recorridoDefinitivo(recorridoEnVivo: PuntoGPS[]): Promise<PuntoGPS[]> {
  if (!(Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android')) return recorridoEnVivo
  try {
    const crudos = await obtenerTrazaPersistida()
    if (crudos.length === 0) return recorridoEnVivo
    const filtrados = filtrarRecorridoValido(crudos)
    return filtrados.length >= recorridoEnVivo.length ? filtrados : recorridoEnVivo
  } catch {
    return recorridoEnVivo
  }
}

/**
 * 2026-09-23, pedido explícito del usuario (bug real reportado): "hice 5 o 6 viajes con la
 * burbuja sin abrir la app... cuando entré me acumuló todos en un solo viaje de 63 km". La
 * causa completa está documentada en `BurbujaService.kt` (`encolarViajePendiente`) — en
 * resumen, cada viaje que la burbuja cierra sola (sin que la app esté abierta para que
 * `burbujaOrquestacion.ts` reaccione en vivo) ahora queda en una cola nativa en vez de
 * perderse/mezclarse. Esta función procesa esa cola ENTERA cada vez que se abre la app: un
 * `Viaje` real por cada entrada, con su propio recorrido (recortado nativamente al rango de
 * tiempo de ESE viaje) y su propio `puntoDeRecogidaISO` — mismo camino (`crearViajeDesdeCiere`)
 * que ya usa `pausarParaIngreso` para un viaje cerrado con la app abierta, D-18: no se inventa
 * una segunda forma de construir un Viaje.
 */
/**
 * 2026-09-24, pedido explícito del usuario, dos partes en el mismo hilo ("por qué me marcó los
 * seis viajes con el mismo kilometraje... antes de hacer algo"):
 *
 * 1. Acá se descartaba el km que la burbuja YA calculó bien en vivo (`ViajePendienteNativo.km`,
 *    `kmAcumulados` en BurbujaService.kt — se resetea a 0 en cada "iniciar viaje" y solo suma
 *    con el GPS real de ESE viaje, el mismo número que el usuario confirmó que se veía bien en
 *    la burbuja) y en su lugar se recalculaba la distancia DE CERO acá, a partir de
 *    `puntosJson` — una traza de puntos GPS crudos separada, recortada por rango de fecha/hora
 *    del lado nativo contra una sola bolsa de puntos que NO se limpia entre viajes de la
 *    burbuja (ver el comentario en `BurbujaService.encolarViajePendiente`, Kotlin). Ese segundo
 *    cálculo, redundante, fue el que terminó dándole a los 6 viajes el mismo total. Ahora se usa
 *    directo el km nativo (`conKmManual`, mismo camino que ya existía para la corrección manual
 *    del conductor, D-18) — `puntosJson` se sigue usando solo para resolver la zona de
 *    recogida/destino, no para el total de kilómetros.
 * 2. Cada viaje recuperado se expone vía `alRecuperarViajesPendientes` (abajo) — este store NO
 *    conoce `domain/jornada` (ver el comentario de la interfaz más arriba: "SOLO conoce viajes"),
 *    así que la vinculación real con la jornada abierta vive en
 *    `domain/viajes/burbujaOrquestacion.ts`, que sí puede cruzar dominios (D-10).
 */
type CallbackViajesRecuperados = (viajes: Viaje[]) => void
let alRecuperarViajesPendientes: CallbackViajesRecuperados | null = null
export function registrarAlRecuperarViajesPendientes(callback: CallbackViajesRecuperados): void {
  alRecuperarViajesPendientes = callback
}

async function recuperarViajesPendientesDeBurbuja(): Promise<Viaje[]> {
  if (!(Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android')) return []
  try {
    const pendientes = await obtenerViajesPendientesNativos()
    if (pendientes.length === 0) return []

    const viajesCreados: Viaje[] = []
    for (const p of pendientes) {
      let crudos: PuntoGpsCrudo[] = []
      try { crudos = JSON.parse(p.puntosJson) as PuntoGpsCrudo[] } catch { crudos = [] }
      const recorrido = filtrarRecorridoValido(crudos)

      const viajeConGps = crearViajeDesdeCiere(generarId(), {
        plataforma: useViajes.getState().plataformaPreferida ?? 'Particular',
        inicioISO: new Date(p.inicioMs).toISOString(),
        finISO: new Date(p.finMs).toISOString(),
        recorrido,
        puntoDeRecogidaISO: p.recogidaMs > 0 ? new Date(p.recogidaMs).toISOString() : null,
        distanciaReportadaPlataforma: null,
        ingreso: 0,
        ingresoPendiente: true,
      })
      const viaje = conKmManual(viajeConGps, p.km)
      await repositorioViajes.guardar(viaje)
      viajesCreados.push(viaje)
    }

    await limpiarViajesPendientesNativos()
    alRecuperarViajesPendientes?.(viajesCreados)
    return viajesCreados
  } catch {
    return []
  }
}

/**
 * 2026-09-22, pedido explícito del usuario: corrección manual de km al
 * completar el ingreso — mismo criterio de `crearViajeManual` (repository.ts,
 * D-18: no se reparte a mano entre "hasta recoger"/"con pasajero", todo va a
 * kmConPasajero) para no inventar una lógica de reparto que no se puede
 * reconstruir después de que el GPS ya midió mal.
 */
function conKmManual(viaje: Viaje, kmManual: number | null | undefined): Viaje {
  if (kmManual == null || !Number.isFinite(kmManual) || kmManual < 0) return viaje
  return { ...viaje, distancia: { kmHastaRecoger: 0, kmConPasajero: kmManual, kmTotalesReales: kmManual } }
}

const CLAVE_PLATAFORMA_PREFERIDA = 'mia:plataformaPreferida'
function leerPlataformaPreferida(): Plataforma | null {
  const crudo = localStorage.getItem(CLAVE_PLATAFORMA_PREFERIDA)
  return (PLATAFORMAS_DISPONIBLES as string[]).includes(crudo ?? '') ? (crudo as Plataforma) : null
}

/**
 * 2026-09-24, corrección de un bug real reportado por el usuario ("modifiqué el kilometraje y el
 * precio en uno solo, le di guardar a ese solo, y se guardaron automáticamente todos los seis con
 * los mismos kilómetros y el mismo precio"): media docena de pantallas llaman a
 * `useViajes().cargar()` cada una por su lado al montarse (`TarjetaViajesPendientes.tsx`,
 * `SeccionViajesYJornada.tsx`, `SeccionMantenimiento.tsx`, `AvisoBanner.tsx`, etc.) — si dos o
 * más quedan en vuelo al mismo tiempo (perfectamente normal: todas se montan juntas al abrir el
 * panel de Trabajo), cada una lee la cola nativa de viajes pendientes (`viajes_pendientes`, ver
 * `recuperarViajesPendientesDeBurbuja`), la convierte en `Viaje`s NUEVOS con ids nuevos y la
 * limpia — sin ninguna protección contra que dos llamadas hagan esto A LA VEZ. La que termine de
 * ÚLTIMA sobrescribe por completo el estado `viajes` con SU PROPIA lectura (hecha con datos de
 * antes de que la primera llamada guardara nada) — así, una llamada tardía puede reemplazar el
 * viaje recién editado y guardado por el usuario con una copia repetida y sin editar, todo del
 * MISMO conjunto de viajes de la burbuja, dando la sensación de "se guardó lo mismo en los seis".
 * Acá se garantiza que solo hay UNA ejecución real de `cargar()` en vuelo a la vez — las llamadas
 * que llegan mientras la primera sigue corriendo esperan esa MISMA promesa en vez de arrancar la
 * suya propia.
 */
let cargaViajesEnCurso: Promise<void> | null = null
function cargarConDeduplicacion(set: (parcial: Partial<EstadoViajes>) => void): Promise<void> {
  if (cargaViajesEnCurso) return cargaViajesEnCurso
  cargaViajesEnCurso = (async () => {
    set({ cargando: true })
    const viajes = await repositorioViajes.listar()
    const viajesRecuperados = await recuperarViajesPendientesDeBurbuja()

    let viajeEnCurso: ViajeEnCurso | null = null
    try {
      const guardado = localStorage.getItem(CLAVE_ACTIVO)
      if (guardado) viajeEnCurso = JSON.parse(guardado) as ViajeEnCurso
      if (viajeEnCurso && Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
        // 2026-09-23, pedido explícito del usuario (bug real, ver el comentario largo en
        // `recuperarViajesPendientesDeBurbuja`): si la cola de arriba trajo viajes que la
        // burbuja ya cerró del todo mientras la app estaba cerrada, este `viajeEnCurso`
        // guardado quedó obsoleto — representa el PRIMERO de esa cadena (el único que el
        // lado JS alcanzó a registrar antes de que Android matara el WebView), no "el viaje
        // de ahora". Pegarle encima la traza GPS completa (como se hacía antes) mezclaba
        // todos los viajes recuperados arriba con este en uno solo — se descarta en su lugar.
        if (viajesRecuperados.length > 0) {
          viajeEnCurso = null
          guardarActivo(null)
        } else {
          const puntos = await obtenerTrazaPersistida()
          if (puntos.length) viajeEnCurso = { ...viajeEnCurso, recorrido: puntos.map(p => ({ lat:p.lat, lng:p.lng, timestampISO:new Date(p.timestampMs).toISOString() })) }
        }
      }
    } catch { /* recuperación best-effort */ }
    set({ viajes: [...viajesRecuperados.slice().reverse(), ...viajes], viajeEnCurso, cargando: false })
  })()
  return cargaViajesEnCurso.finally(() => {
    cargaViajesEnCurso = null
  })
}

export const useViajes = create<EstadoViajes>((set, get) => ({
  viajes: [],
  viajeEnCurso: null,
  cargando: false,
  errorGPS: null,
  plataformaPreferida: leerPlataformaPreferida(),
  elegirPlataformaPreferida: (plataforma) => {
    localStorage.setItem(CLAVE_PLATAFORMA_PREFERIDA, plataforma)
    set({ plataformaPreferida: plataforma })
  },

  cargar: () => cargarConDeduplicacion(set),

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

    // Lectura rápida de SharedPreferences vía el plugin (no un GPS nuevo, no
    // hay que esperar un fix) — ver el comentario largo en
    // `recorridoDefinitivo` más arriba sobre por qué hace falta.
    const recorrido = await recorridoDefinitivo(enCurso.recorrido)
    const viaje = crearViajeDesdeCiere(enCurso.id, {
      plataforma: enCurso.plataforma,
      inicioISO: enCurso.inicioISO,
      finISO: new Date().toISOString(),
      recorrido,
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
    // No se espera (`void`, no `await`) — el próximo viaje por la burbuja
    // no puede quedar bloqueado por esto (ver comentario en
    // `resolverZonaSiHizoFalta` más abajo, y el bug de viajes perdidos de
    // una ronda anterior que este mismo criterio evita repetir).
    void resolverZonaSiHizoFalta(viaje.id, recorrido)
  },

  finalizarViaje: async ({ ingreso, distanciaReportadaPlataforma, kmManual }) => {
    const enCurso = get().viajeEnCurso
    if (!enCurso) return null

    seguidorActivo?.detener()
    seguidorActivo = null

    const recorrido = await recorridoDefinitivo(enCurso.recorrido)
    const viaje = conKmManual(crearViajeDesdeCiere(enCurso.id, {
      plataforma: enCurso.plataforma,
      inicioISO: enCurso.inicioISO,
      finISO: new Date().toISOString(),
      recorrido,
      puntoDeRecogidaISO: enCurso.puntoDeRecogidaISO,
      distanciaReportadaPlataforma,
      ingreso,
      ingresoPendiente: false,
    }), kmManual)

    await repositorioViajes.guardar(viaje)
    set({ viajes: [viaje, ...get().viajes], viajeEnCurso: null })
    void actualizarBurbuja(viaje.distancia.kmTotalesReales.toFixed(1), `${Math.round((Date.parse(viaje.finISO!) - Date.parse(viaje.inicioISO))/60000)}m`, false, get().viajes.length)
    void ocultarBurbuja()
    guardarActivo(null)
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') void limpiarTrazaPersistida()
    void resolverZonaSiHizoFalta(viaje.id, recorrido)
    return viaje
  },

  completarIngreso: async (viajeId, ingreso, plataforma, kmManual) => {
    const viaje = get().viajes.find((v) => v.id === viajeId)
    if (!viaje) return
    // 2026-09-15, pedido explícito del usuario: la burbuja arranca el viaje
    // con la plataforma preferida (o 'Particular' si no hay ninguna elegida)
    // porque no hay forma de preguntarla con un solo toque — acá, al
    // completar el ingreso con la app abierta, sí se puede corregir si ese
    // viaje puntual fue de otra plataforma.
    const actualizado: Viaje = conKmManual({ ...viaje, ingreso, plataforma, ingresoPendiente: false, pendienteDeSync: true }, kmManual)
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

/**
 * 2026-09-15, pedido explícito del usuario (bug real reportado): un viaje muy
 * corto (ej. 50 metros por la burbuja) puede cerrarse antes de que llegue el
 * primer punto del `watch` de GPS en curso, dejando `recorrido` vacío — sin
 * ningún punto, `crearViajeDesdeCiere` (repository.ts) no tiene contra qué
 * resolver la zona, ni de inicio ni de fin, aunque el viaje sí haya pasado en
 * un lugar real (el mismo de un viaje anterior que sí la resolvió bien).
 *
 * A propósito NO se espera (`await`) antes de guardar/liberar `viajeEnCurso`
 * en `pausarParaIngreso`/`finalizarViaje` — `obtenerUbicacionActual` puede
 * tardar hasta 8s, y bloquear ahí reabriría el mismo bug de "viajes perdidos"
 * que se corrigió en una ronda anterior de esta sesión (la burbuja tiene que
 * poder arrancar el siguiente viaje de inmediato). En cambio, esto corre en
 * segundo plano y, si consigue una posición, PARCHA el viaje ya guardado con
 * la zona resuelta — el conductor puede alcanzar a ver "Zona no detectada"
 * por un instante y que se corrija sola un momento después.
 */
async function resolverZonaSiHizoFalta(viajeId: string, recorridoOriginal: PuntoGPS[]): Promise<void> {
  if (recorridoOriginal.length > 0) return
  const punto = await obtenerUbicacionActual()
  if (!punto) return

  const localidad = obtenerLocalidad(punto)
  const zona = obtenerZonaCustom(punto)
  if (!localidad && !zona) return

  const viaje = useViajes.getState().viajes.find((v) => v.id === viajeId)
  if (!viaje) return

  const actualizado: Viaje = {
    ...viaje,
    localidad: localidad ?? viaje.localidad,
    zona: zona ?? viaje.zona,
    localidadInicio: localidad ?? viaje.localidadInicio,
    zonaInicio: zona ?? viaje.zonaInicio,
    localidadFin: localidad ?? viaje.localidadFin,
    zonaFin: zona ?? viaje.zonaFin,
    pendienteDeSync: true,
  }
  await repositorioViajes.guardar(actualizado)
  useViajes.setState({ viajes: useViajes.getState().viajes.map((v) => (v.id === viajeId ? actualizado : v)) })
}
