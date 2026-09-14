import type { Viaje } from '../viajes/types'
import type { Gasto } from '../gastos/types'
import type { Deuda } from '../deudas/types'
import type { GastoHogar } from '../hogar/types'
import { calcularResumen } from '../estadisticas/calculos'

/**
 * Bloque 3, sección 4/4 (última del bloque) — "Balance general". Por diseño
 * (D-10, ver ítem 8 de la lista de Bloque 3 en PLAN-MAESTRO.md) esto NO es
 * un dominio nuevo con su propio store: es pura coordinación entre los 4
 * dominios que ya existen — viajes, gastos, deudas y hogar — cada uno
 * cargado por su propio store como siempre. Esta función solo recibe los
 * arrays ya cargados y cruza los números; no le pertenece ningún dato, no
 * decide cuándo cargar nada.
 *
 * Reutiliza `calcularResumen` de domain/estadisticas (D-18: el total de
 * ingresos de viajes finalizados ya existe ahí, no se vuelve a sumar acá).
 */
export interface BalanceGeneral {
  ingresosTotales: number
  /** domain/gastos — gasolina, aceite, llantas, mantenimiento, etc. (gastos del vehículo/trabajo). */
  gastosOperativos: number
  /** domain/hogar — únicos + fijos autogenerados (arriendo, servicios, etc.). */
  gastosDeHogar: number
  /**
   * Suma de `saldoActual` de todas las deudas (nunca negativo por deuda —
   * una deuda "pagada de más" no le resta al total, queda en 0).
   */
  deudaPendienteTotal: number
  /**
   * ingresosTotales - gastosOperativos - gastosDeHogar. A propósito NO
   * resta la deuda pendiente: el balance neto es sobre lo que entró y salió
   * de plata (flujo), la deuda es una obligación futura, no un gasto ya
   * hecho — se muestran por separado para no mezclar los dos conceptos.
   */
  balanceNeto: number
}

export function calcularBalanceGeneral(
  viajes: Viaje[],
  gastos: Gasto[],
  deudas: Deuda[],
  gastosDeHogar: GastoHogar[],
): BalanceGeneral {
  const ingresosTotales = calcularResumen(viajes).ingresos
  const gastosOperativos = gastos.reduce((acc, g) => acc + g.monto, 0)
  const totalGastosHogar = gastosDeHogar.reduce((acc, g) => acc + g.monto, 0)
  const deudaPendienteTotal = deudas.reduce((acc, d) => acc + Math.max(d.saldoActual, 0), 0)

  return {
    ingresosTotales,
    gastosOperativos,
    gastosDeHogar: totalGastosHogar,
    deudaPendienteTotal,
    balanceNeto: ingresosTotales - gastosOperativos - totalGastosHogar,
  }
}
