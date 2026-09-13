/**
 * Dominio: Estadísticas.
 *
 * A propósito NO tiene repository.ts ni store.ts propio: no es dueño de
 * ningún dato, solo deriva números a partir de domain/viajes (única fuente
 * de verdad de km/ingreso/plataforma/zona — ver PLAN-MAESTRO). Si mañana
 * existe domain/gastos, este dominio se extiende para cruzarlo, pero hoy
 * gastos no está construido (Fase 6 solo cubrió mantenimiento + estadísticas
 * de viajes), así que "ganancia neta" no se calcula todavía a propósito, no
 * por olvido.
 */

export type UnidadPeriodo = 'dia' | 'semana' | 'mes'

export interface ResumenViajes {
  cantidadViajes: number
  kmTotales: number
  ingresos: number
  ingresoPromedioPorViaje: number
}

export interface PuntoPeriodo {
  /** Clave del periodo, ej. '2026-09-13' (día), '2026-W37' (semana ISO), '2026-09' (mes). */
  clave: string
  resumen: ResumenViajes
}

export interface DesglosePor<TClave extends string> {
  clave: TClave
  resumen: ResumenViajes
}
