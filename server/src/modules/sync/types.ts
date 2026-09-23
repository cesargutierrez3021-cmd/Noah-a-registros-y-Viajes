/**
 * Fase 13 — Offline + sincronización. Cubre: viajes (primer corte de esta
 * fase), jornadas, registros de mantenimiento y gastos (Bloque 3). Deuda y
 * AbonoDeuda (Bloque 3, continuación) también — a diferencia de los demás,
 * `AbonoDeuda` tiene FK real a `Deuda` (ver schema.prisma), así que el
 * cliente tiene que subir la deuda ANTES que sus abonos (ver
 * app/src/domain/deudas/sync.ts sobre cómo se garantiza ese orden).
 * ConceptoFijo y GastoHogar (Bloque 3, sección 3) siguen el mismo patrón
 * exacto que Deuda/AbonoDeuda: `GastoHogar.conceptoFijoId` es FK real hacia
 * `ConceptoFijo`, mismo orden de subida requerido (ver
 * app/src/domain/hogar/sync.ts). Deliberadamente
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
  ingresoPendiente: boolean
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

/** Lo que el cliente manda por gasto (Bloque 3). */
export interface GastoSyncEntrada {
  id: string
  categoria: string
  monto: number
  fechaISO: string
  litros: number | null
  notas: string | null
}

/** 2026-09-17, pedido explícito del usuario: "bono" de plataforma — solo monto y fecha. */
export interface BonoSyncEntrada {
  id: string
  monto: number
  fechaISO: string
}

/** Lo que el cliente manda por deuda (Bloque 3). Se reenvía completa en cada abono (mismo criterio que Jornada). */
export interface DeudaSyncEntrada {
  id: string
  nombre: string
  saldoInicial: number
  saldoActual: number
  cuotaProgramada: {
    monto: number
    frecuencia: string
    diaDelMes?: number | null
    diasDelMes?: [number, number] | null
    diaDeLaSemana?: number | null
  } | null
  fechaLimiteISO: string | null
  creadaEnISO: string
}

/** Lo que el cliente manda por abono a una deuda (Bloque 3). */
export interface AbonoDeudaSyncEntrada {
  id: string
  deudaId: string
  monto: number
  fechaISO: string
}

/**
 * Lo que el cliente manda por meta de ahorro (2026-09-15). Mismo patrón que
 * DeudaSyncEntrada, invertido: `saldoActual` sube con cada abono en vez de bajar.
 */
export interface MetaAhorroSyncEntrada {
  id: string
  nombre: string
  montoObjetivo: number
  saldoActual: number
  creadaEnISO: string
  aportePlaneado: { monto: number; frecuencia: string } | null
  fechaLimiteISO: string | null
}

/** Lo que el cliente manda por abono a una meta de ahorro. Mismo patrón que AbonoDeudaSyncEntrada. */
export interface AbonoAhorroSyncEntrada {
  id: string
  metaId: string
  monto: number
  fechaISO: string
}

/** Lo que el cliente manda por concepto fijo de hogar (Bloque 3, sección 3). Se reenvía completo cada vez que cambia (monto o activo). */
export interface ConceptoFijoSyncEntrada {
  id: string
  nombre: string
  montoEsperado: number
  diaDelMes: number
  activo: boolean
  creadoEnISO: string
}

/** Lo que el cliente manda por gasto de hogar (Bloque 3, sección 3) — único o autogenerado desde un ConceptoFijo. */
export interface GastoHogarSyncEntrada {
  id: string
  nombre: string
  monto: number
  tipo: string
  fechaISO: string
  conceptoFijoId: string | null
}
