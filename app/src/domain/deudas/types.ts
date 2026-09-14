/**
 * Dominio: Deudas.
 *
 * Una deuda tiene un saldo que BAJA con cada abono (pago) — a diferencia de
 * Gasto/RegistroMantenimiento (append-only), acá la entidad principal es
 * MUTABLE. Mismo criterio que Jornada (domain/jornada): se sincroniza vía
 * upsert por id, actualizándose en el lugar en cada abono, nunca se borra.
 * No tiene `eliminarDeuda` a propósito — ver el comentario en `pendienteDeSync`
 * más abajo sobre por qué.
 */

export type FrecuenciaCuota = 'semanal' | 'quincenal' | 'mensual'

export interface CuotaProgramada {
  monto: number
  frecuencia: FrecuenciaCuota
}

export interface Deuda {
  id: string
  nombre: string
  saldoInicial: number
  /** Baja con cada abono (ver `store.ts`, función `abonar`). <= 0 = pagada. */
  saldoActual: number
  /** Cuota recurrente esperada (para mostrar "te toca pagar X cada Y"), opcional — no genera abonos solo, el usuario los carga a mano. */
  cuotaProgramada: CuotaProgramada | null
  creadaEnISO: string
  /**
   * Deuda es mutable (`saldoActual` cambia) pero deliberadamente no se puede
   * BORRAR desde el cliente — mismo problema que `ItemMantenimiento`
   * (domain/mantenimiento/types.ts): el diseño de sync push-only con upsert
   * (D-16) no tiene forma de propagar un borrado al backend. A diferencia de
   * un ítem de mantenimiento, sí conviene sincronizar la deuda en sí (no solo
   * su historial de abonos) porque el saldo actual es el dato que el usuario
   * más necesita ver actualizado — por eso, en vez de no sincronizarla, se
   * sincroniza pero SIN soporte de borrado. Si hace falta poder eliminar una
   * deuda cargada por error, hay que resolver antes ese diseño (igual que
   * con los ítems de mantenimiento) — no agregar `eliminarDeuda` sin eso.
   */
  pendienteDeSync: boolean
}

/** Registro histórico de un abono. Igual patrón que RegistroMantenimiento/Gasto: nunca se edita ni se borra una vez creado. */
export interface AbonoDeuda {
  id: string
  deudaId: string
  monto: number
  fechaISO: string
  pendienteDeSync: boolean
}
