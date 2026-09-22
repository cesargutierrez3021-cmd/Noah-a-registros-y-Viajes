import type { Gasto } from './types'

/**
 * 2026-09-22 (limpieza de auditoría, D-18): esta suma estaba reimplementada
 * por separado en `gastos/store.ts` (`totalEnRango`) y en
 * `estadisticas/calculos.ts` (`calcularCostoPorKm`) — ahora ambos reusan esta
 * única función pura.
 */
export function totalGastosEnRango(gastos: Gasto[], desdeISO: string, hastaISO: string): number {
  return gastos
    .filter((g) => g.fechaISO >= desdeISO && g.fechaISO < hastaISO)
    .reduce((suma, g) => suma + g.monto, 0)
}
