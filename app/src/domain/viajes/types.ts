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
}
