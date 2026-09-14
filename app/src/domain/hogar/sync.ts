import { haySesion } from '../../lib/api'
import { repositorioHogar } from './repository'
import { subirConceptoFijo, subirGastoHogar } from './api'

export interface ResultadoSincronizacion {
  intentados: number
  sincronizados: number
  primerError: string | null
}

/**
 * Mismo patrón exacto que domain/deudas/sync.ts (Deuda/AbonoDeuda): dos
 * colas, y `GastoHogar.conceptoFijoId` es un FK real hacia `ConceptoFijo` en
 * el backend (ver schema.prisma) para los gastos autogenerados (tipo
 * 'fijo') — así que un ConceptoFijo pendiente bloquea, en esta pasada, la
 * subida de los gastos que generó. Los gastos únicos (conceptoFijoId=null)
 * no tienen esta restricción y se suben siempre.
 */
export async function sincronizarHogarPendiente(): Promise<ResultadoSincronizacion> {
  if (!haySesion()) {
    return { intentados: 0, sincronizados: 0, primerError: null }
  }

  let intentados = 0
  let sincronizados = 0
  let primerError: string | null = null

  const conceptosPendientes = await repositorioHogar.conceptosPendientesDeSync()
  for (const concepto of conceptosPendientes) {
    intentados += 1
    try {
      await subirConceptoFijo(concepto)
      await repositorioHogar.marcarConceptoSincronizado(concepto.id)
      sincronizados += 1
    } catch (error) {
      if (!primerError) primerError = error instanceof Error ? error.message : 'Error al sincronizar'
    }
  }

  const idsConceptosTodaviaPendientes = new Set((await repositorioHogar.conceptosPendientesDeSync()).map((c) => c.id))

  const gastosPendientes = await repositorioHogar.gastosPendientesDeSync()
  for (const gasto of gastosPendientes) {
    if (gasto.conceptoFijoId && idsConceptosTodaviaPendientes.has(gasto.conceptoFijoId)) continue // se reintenta en la próxima pasada, ver comentario arriba

    intentados += 1
    try {
      await subirGastoHogar(gasto)
      await repositorioHogar.marcarGastoSincronizado(gasto.id)
      sincronizados += 1
    } catch (error) {
      if (!primerError) primerError = error instanceof Error ? error.message : 'Error al sincronizar'
    }
  }

  return { intentados, sincronizados, primerError }
}
