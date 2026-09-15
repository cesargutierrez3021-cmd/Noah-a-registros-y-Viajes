/**
 * Dominio: Viajes
 *
 * Única fuente de verdad para todo lo relacionado a un viaje.
 * Ningún otro módulo debe declarar su propio tipo de "viaje" o recalcular
 * kilómetros/plataforma/estado por su cuenta — todo pasa por aquí.
 */

export type Plataforma = 'Uber' | 'DiDi' | 'inDrive' | 'Cabify' | 'Picap' | 'Rappi' | 'Particular'

export type EstadoViaje = 'en_curso' | 'finalizado'

/** Un punto de recorrido capturado por el plugin nativo de GPS. */
export interface PuntoGPS {
  lat: number
  lng: number
  timestampISO: string
}

/**
 * Distancia real medida por MIA, separada de lo que reporta la plataforma.
 * Ver PLAN-MAESTRO D-2 / Fase 2, requisito de "medición real del conductor".
 */
export interface DistanciaReal {
  /** Km recorridos para llegar a recoger al pasajero (antes de iniciar el viaje pago). */
  kmHastaRecoger: number
  /** Km recorridos con el pasajero a bordo. */
  kmConPasajero: number
  /** Suma de los dos anteriores. Se calcula, nunca se guarda a mano. */
  kmTotalesReales: number
}

export interface Viaje {
  /** UUID generado en el cliente. Es la clave de deduplicación al sincronizar (requisito offline #18). */
  id: string
  plataforma: Plataforma
  estado: EstadoViaje
  inicioISO: string
  finISO: string | null
  recorrido: PuntoGPS[]
  distancia: DistanciaReal
  /** Lo que la plataforma dice que pagó — puede diferir de la realidad medida. */
  distanciaReportadaPlataforma: number | null
  ingreso: number
  localidad: string | null
  zona: string | null
  /** Ubicación administrativa al iniciar y terminar el recorrido. */
  localidadInicio: string | null
  zonaInicio: string | null
  localidadFin: string | null
  zonaFin: string | null
  /**
   * 2026-09-16, corrección de un bug real reportado por el usuario: cuando
   * un viaje se termina desde la burbuja (sin abrir la app) no hay forma de
   * escribir el ingreso ahí mismo — `ingreso` queda en 0 y este campo en
   * `true` hasta que el conductor lo complete. Antes ese estado "pausado
   * esperando ingreso" vivía SOLO en `viajeEnCurso` (un único slot en el
   * store, ver store.ts) — si el conductor hacía un segundo viaje por la
   * burbuja antes de abrir la app, `iniciarViaje` lo ignoraba en silencio
   * (ya había "un viaje" ocupando el slot) y ese viaje se perdía por
   * completo. Ahora el viaje se guarda de una (como cualquier otro,
   * `estado: 'finalizado'`) apenas se toca "terminar" en la burbuja, y
   * `viajeEnCurso` queda libre de inmediato para el siguiente — puede haber
   * varios viajes con `ingresoPendiente: true` al mismo tiempo, cada uno se
   * completa por separado (ver `completarIngreso` en store.ts).
   */
  ingresoPendiente: boolean
  /** true mientras el viaje no se ha confirmado como sincronizado con el backend. */
  pendienteDeSync: boolean
}

/** Datos que entrega el plugin nativo al cerrar un viaje; el dominio los transforma en un Viaje completo. */
export interface CierreViajeInput {
  plataforma: Plataforma
  inicioISO: string
  finISO: string
  recorrido: PuntoGPS[]
  puntoDeRecogidaISO: string | null
  distanciaReportadaPlataforma: number | null
  ingreso: number
  /** Ver el comentario de `ingresoPendiente` en `Viaje` arriba. */
  ingresoPendiente: boolean
}

/**
 * Bloque 2, ítem 4 — "agregar viaje manual". Sin GPS no hay recorrido para
 * calcular distancia (ver distancia.ts) ni para detectar zona (ver
 * geofencing.ts) — el conductor escribe los km directamente, y localidad/zona
 * quedan en null salvo que él mismo las indique. Mismo `Viaje` de siempre
 * (D-18: no se crea un tipo de viaje "manual" aparte), solo cambia cómo se
 * construye (ver `crearViajeManual` en repository.ts).
 */
export interface ViajeManualInput {
  plataforma: Plataforma
  inicioISO: string
  finISO: string
  /** El conductor mide o estima los km totales del viaje completo — no se separa recogida/con pasajero sin GPS. */
  kmTotalesReales: number
  distanciaReportadaPlataforma: number | null
  ingreso: number
  localidad: string | null
  zona: string | null
}
