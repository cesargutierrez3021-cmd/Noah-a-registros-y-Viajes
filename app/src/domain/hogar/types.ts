/**
 * Dominio: Hogar (Bloque 3, sección 3/4).
 *
 * Dos entidades, mismo motivo que Deuda/AbonoDeuda (domain/deudas):
 * - `ConceptoFijo` es la plantilla recurrente ("Arriendo $500.000 cada mes,
 *   día 5") — MUTABLE (el monto puede cambiar de un mes a otro, ej. sube el
 *   arriendo) y sincroniza por upsert, sin soporte de borrado (mismo motivo
 *   que Deuda: el diseño push-only+upsert, D-16, no propaga un borrado real).
 *   En vez de borrar, se desactiva (`activo=false`) — deja de autogenerar
 *   gastos nuevos pero conserva el historial ya generado.
 * - `GastoHogar` es el historial real (append-only, como Gasto) — tanto los
 *   gastos "únicos" que el usuario carga a mano como los que se autogeneran
 *   cada mes a partir de un `ConceptoFijo` activo (ver `calculos.ts`).
 *
 * `GastoHogar.conceptoFijoId` es un FK real hacia `ConceptoFijo` en el
 * backend (igual que `AbonoDeuda.deudaId` hacia `Deuda`) — por eso
 * `sync.ts` tiene que subir los conceptos fijos ANTES que los gastos que
 * generaron, mismo criterio que domain/deudas/sync.ts.
 */

export type TipoGastoHogar = 'unico' | 'fijo'

export interface ConceptoFijo {
  id: string
  nombre: string
  /** Lo que se espera pagar cada período — puede cambiar con el tiempo (ej. sube el arriendo), por eso es mutable y no un valor fijo para siempre. */
  montoEsperado: number
  /**
   * 1-31 — día "de referencia" del mes para mostrarle al conductor cuándo vence este concepto.
   * 2026-09-23: ya no bloquea la confirmación — se puede pagar antes de que llegue este día
   * (ver `calcularGastosFijosPendientesDeConfirmar`, calculos.ts).
   */
  diaDelMes: number
  /** Desactivar en vez de borrar — mismo motivo que Deuda no se puede borrar (D-16). Un concepto inactivo deja de autogenerar gastos nuevos; el historial ya generado no se toca. */
  activo: boolean
  creadoEnISO: string
  pendienteDeSync: boolean
}

/** Historial real de gastos del hogar. Nunca se edita ni se borra una vez creado (igual que Gasto/RegistroMantenimiento). */
export interface GastoHogar {
  id: string
  nombre: string
  monto: number
  tipo: TipoGastoHogar
  fechaISO: string
  /** null para gastos únicos. Para gastos autogenerados, apunta al ConceptoFijo que los originó. */
  conceptoFijoId: string | null
  pendienteDeSync: boolean
}
