import type { ConceptoFijo, GastoHogar } from './types'

/**
 * "Los gastos fijos se autogeneran cada período sin que el usuario los
 * reintroduzca" (Bloque 3, ítem 7). Esta es la función pura (D-10: la lógica
 * de negocio no vive en el store) que decide QUÉ hay que generar — no
 * genera ids ni toca el repositorio, eso lo hace `store.ts` con el
 * resultado de acá.
 *
 * Regla: por cada ConceptoFijo activo, si no existe todavía ningún
 * GastoHogar con ese conceptoFijoId fechado en el mismo año-mes que `ahora`,
 * hay que generar uno. No importa si `ahora` ya pasó el `diaDelMes` o
 * no — el gasto se autogenera igual con la fecha correspondiente al
 * `diaDelMes` de ESTE mes (no la fecha de hoy), para que el historial quede
 * prolijo por período sin importar qué día del mes se abrió la app.
 */
export interface GastoFijoAGenerar {
  conceptoFijoId: string
  nombre: string
  monto: number
  fechaISO: string
}

/** diaDelMes puede ser mayor a los días que tiene el mes (ej. 31 en febrero) — se recorta al último día real de ese mes. */
export function fechaParaPeriodo(anio: number, mesIndiceCero: number, diaDelMes: number): Date {
  const ultimoDiaDelMes = new Date(anio, mesIndiceCero + 1, 0).getDate()
  const dia = Math.min(diaDelMes, ultimoDiaDelMes)
  return new Date(anio, mesIndiceCero, dia)
}

export function calcularGastosFijosPendientes(
  conceptos: ConceptoFijo[],
  gastosExistentes: GastoHogar[],
  ahora: Date,
): GastoFijoAGenerar[] {
  const anio = ahora.getFullYear()
  const mes = ahora.getMonth()

  const pendientes: GastoFijoAGenerar[] = []

  for (const concepto of conceptos) {
    if (!concepto.activo) continue

    const yaGeneradoEstePeriodo = gastosExistentes.some((g) => {
      if (g.conceptoFijoId !== concepto.id) return false
      const fecha = new Date(g.fechaISO)
      return fecha.getFullYear() === anio && fecha.getMonth() === mes
    })
    if (yaGeneradoEstePeriodo) continue

    pendientes.push({
      conceptoFijoId: concepto.id,
      nombre: concepto.nombre,
      monto: concepto.montoEsperado,
      fechaISO: fechaParaPeriodo(anio, mes, concepto.diaDelMes).toISOString(),
    })
  }

  return pendientes
}
