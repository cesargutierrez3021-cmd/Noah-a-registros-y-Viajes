/**
 * Fase 13 — Offline + sincronización. Cubre: viajes (primer corte de esta
 * fase), jornadas y registros de mantenimiento (continuación). Deliberadamente
 * NO cubre `ItemMantenimiento` (la configuración de qué mantenimientos existen)
 * porque se puede editar y borrar desde el cliente, y el diseño push-only con
 * upsert por id (D-16) no tiene forma de propagar un borrado — ver el
 * comentario del modelo `RegistroMantenimiento` en schema.prisma para el
 * razonamiento completo. Sincronizar ítems de mantenimiento necesita un
 * diseño de borrado (tombstones o similar) que no se decidió todavía.
 *
 * Diseño: push-only (el cliente sube, el backend no empuja cambios de vuelta
 * todavía). Alcanza para un solo dispositivo por usuario, que es el caso de
 * uso real de un conductor. Sincronización multi-dispositivo (bajar cambios
 * hechos en otro teléfono) queda fuera de alcance — no hay ningún requisito
 * de "varios dispositivos" en el documento original de MIA.
 */

/** Mismo shape que PuntoGPS del cliente (app/src/domain/viajes/types.ts), declarado
 *  independiente a propósito — D-8: server/ no importa tipos de app/. */
export interface PuntoGPSSync {
  lat: number
  lng: number
  timestampISO: string
}

/**
 * Lo que el cliente manda por viaje. A propósito NO incluye `pendienteDeSync`
 * (es un detalle de la cola local del cliente, sin sentido en el backend) ni
 * ningún id de usuario (ese sale del JWT, nunca del body — mismo criterio
 * auditado en Fase 12, D-15).
 */
export interface ViajeSyncEntrada {
  id: string
  plataforma: string
  estado: string
  inicioISO: string
  finISO: string | null
  recorrido: PuntoGPSSync[]
  kmHastaRecoger: number
  kmConPasajero: number
  kmTotalesReales: number
  distanciaReportadaPlataforma: number | null
  ingreso: number
  localidad: string | null
  zona: string | null
}

/**
 * Lo que el cliente manda por jornada. Igual que con viajes, sin
 * `pendienteDeSync` ni id de usuario (sale del JWT). `viajesIds` no se valida
 * contra la tabla de viajes real — puede incluir ids de viajes que todavía no
 * se sincronizaron (o que nunca se sincronicen, ej. sin sesión iniciada en su
 * momento); el backend los guarda tal cual, sin asumir que existen.
 */
export interface JornadaSyncEntrada {
  id: string
  inicioISO: string
  finISO: string | null
  viajesIds: string[]
}

/** Lo que el cliente manda por registro de mantenimiento realizado. */
export interface RegistroMantenimientoSyncEntrada {
  id: string
  itemId: string
  fechaISO: string
  km: number
  costo: number | null
  notas: string | null
}
