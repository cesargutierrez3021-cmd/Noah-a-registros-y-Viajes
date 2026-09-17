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
 * `store.ts`), y un concepto entra a la lista solo cuando su `diaDelMes` de
 * ESTE mes calendario ya llegó o pasó. El usuario confirma con un botón
 * (`confirmarGastoFijo` en store.ts) — recién ahí se crea el `GastoHogar`
 * de verdad, fechado al momento de la confirmación (no al `diaDelMes`
 * teórico: el dato real es "cuándo se pagó de verdad", no "cuándo tocaba").
 */
export interface GastoFijoPendienteConfirmar {
  conceptoFijoId: string
  nombre: string
  monto: number
}

/** diaDelMes puede ser mayor a los días que tiene el mes (ej. 31 en febrero) — se recorta al último día real de ese mes. */
export function fechaParaPeriodo(anio: number, mesIndiceCero: number, diaDelMes: number): Date {
  const ultimoDiaDelMes = new Date(anio, mesIndiceCero + 1, 0).getDate()
  const dia = Math.min(diaDelMes, ultimoDiaDelMes)
  return new Date(anio, mesIndiceCero, dia)
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

    // Todavía no llega la fecha programada de este mes — no se muestra como
    // pendiente hasta entonces (mismo pedido: "cuando llegue la fecha").
    if (ahora.getTime() < fechaParaPeriodo(anio, mes, concepto.diaDelMes).getTime()) continue

    pendientes.push({ conceptoFijoId: concepto.id, nombre: concepto.nombre, monto: concepto.montoEsperado })
  }

  return pendientes
}
