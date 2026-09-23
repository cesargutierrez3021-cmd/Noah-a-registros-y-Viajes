import type { Viaje } from '../viajes/types'
import type { Gasto } from '../gastos/types'
import type { Deuda } from '../deudas/types'
import type { GastoHogar } from '../hogar/types'
import type { MetaAhorro } from '../ahorro/types'
import type { Bono } from '../bonos/types'
import type { RegistroMantenimiento } from '../mantenimiento/types'
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
  /**
   * domain/gastos (gasolina, aceite, llantas, mantenimiento cargado a mano, etc.) MÁS el costo
   * real de cada `RegistroMantenimiento` con `costo` cargado (mantenimiento marcado "realizado"
   * desde la sección de Mantenimiento, no desde "Gastos de jornada") — gastos del vehículo/trabajo,
   * sin importar por cuál de las dos pantallas entraron. 2026-09-23, corrección de un bug real
   * reportado por el usuario: antes esto SOLO sumaba `gastos` — un mantenimiento marcado
   * "realizado" con su costo real no aparecía acá, ni en `balanceNeto`, ni en el acordeón "Gastos
   * de la moto" ni en "Lectura del día" (que reutilizan este número o el mismo criterio).
   */
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
  /**
   * 2026-09-15, pedido explícito del usuario: suma de `saldoActual` de todas
   * las metas de domain/ahorro. Mismo criterio que deudaPendienteTotal — se
   * muestra aparte, NO se resta de balanceNeto (es plata que sigue siendo
   * del conductor, solo que ya la apartó, no es un gasto).
   */
  ahorroTotal: number
}

export function calcularBalanceGeneral(
  viajes: Viaje[],
  gastos: Gasto[],
  deudas: Deuda[],
  gastosDeHogar: GastoHogar[],
  metasAhorro: MetaAhorro[] = [],
  bonos: Bono[] = [],
  registrosMantenimiento: RegistroMantenimiento[] = [],
): BalanceGeneral {
  const ingresosTotales = calcularResumen(viajes, bonos).ingresos
  const costoMantenimientoRealizado = registrosMantenimiento.reduce((acc, r) => acc + (r.costo ?? 0), 0)
  const gastosOperativos = gastos.reduce((acc, g) => acc + g.monto, 0) + costoMantenimientoRealizado
  const totalGastosHogar = gastosDeHogar.reduce((acc, g) => acc + g.monto, 0)
  const deudaPendienteTotal = deudas.reduce((acc, d) => acc + Math.max(d.saldoActual, 0), 0)
  const ahorroTotal = metasAhorro.reduce((acc, m) => acc + Math.max(m.saldoActual, 0), 0)

  return {
    ingresosTotales,
    gastosOperativos,
    gastosDeHogar: totalGastosHogar,
    deudaPendienteTotal,
    balanceNeto: ingresosTotales - gastosOperativos - totalGastosHogar,
    ahorroTotal,
  }
}
