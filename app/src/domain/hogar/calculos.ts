import type { ConceptoFijo, GastoHogar } from './types'

/**
 * "Los gastos fijos se autogeneran cada período sin que el usuario los
 * reintroduzca" (Bloque 3, ítem 7) — DISEÑO ORIGINAL, YA NO VIGENTE.
 *
 * 2026-09-17, corrección de un bug real reportado por el usuario ("si yo
 * ingreso 100 mil, pero hoy no hay ningún pago, no debería arrojar un
 * porcentaje de hogar... cuando llegue la fecha... si yo marco que se pagó,
 * ahí sí que vaya sumando"): antes, `cargar()` (store.ts) generaba y
 * GUARDABA de una el gasto fijo del mes completo apenas se abría la app,
 * sin importar si `diaDelMes` ya había llegado o no — un arriendo con
 * vencimiento el 25 ya contaba en Balance desde el día 1. Ahora esta
 * función solo CALCULA cuáles conceptos están pendientes de CONFIRMAR (no
 * los crea, no toca el repositorio — D-10, eso sigue siendo trabajo de
 * `store.ts`). El usuario confirma con un botón (`confirmarGastoFijo` en
 * store.ts) — recién ahí se crea el `GastoHogar` de verdad, fechado al
 * momento de la confirmación (no al `diaDelMes` teórico: el dato real es
 * "cuándo se pagó de verdad", no "cuándo tocaba").
 *
 * 2026-09-23, corrección de un bug real reportado por el usuario ("el botón
 * de pagar siempre tiene que estar ahí, por si quiero pagar antes"): antes,
 * un concepto solo entraba a la lista cuando su `diaDelMes` de este mes ya
 * había llegado o pasado — no se podía confirmar/pagar por adelantado. Ese
 * gate se sacó: el único guard real contra pagar dos veces el mismo período
 * es `yaGeneradoEstePeriodo` (abajo), que no depende para nada de la fecha
 * teórica — ya alcanza solo.
 */
export interface GastoFijoPendienteConfirmar {
  conceptoFijoId: string
  nombre: string
  monto: number
}

export function calcularGastosFijosPendientesDeConfirmar(
  conceptos: ConceptoFijo[],
  gastosExistentes: GastoHogar[],
  ahora: Date,
): GastoFijoPendienteConfirmar[] {
  const anio = ahora.getFullYear()
  const mes = ahora.getMonth()

  const pendientes: GastoFijoPendienteConfirmar[] = []

  for (const concepto of conceptos) {
    if (!concepto.activo) continue

    const yaGeneradoEstePeriodo = gastosExistentes.some((g) => {
      if (g.conceptoFijoId !== concepto.id) return false
      const fecha = new Date(g.fechaISO)
      return fecha.getFullYear() === anio && fecha.getMonth() === mes
    })
    if (yaGeneradoEstePeriodo) continue

    pendientes.push({ conceptoFijoId: concepto.id, nombre: concepto.nombre, monto: concepto.montoEsperado })
  }

  return pendientes
}
