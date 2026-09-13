import { haySesion } from '../../lib/api'
import { repositorioMantenimiento } from './repository'
import { subirRegistroMantenimiento } from './api'

export interface ResultadoSincronizacion {
  intentados: number
  sincronizados: number
  primerError: string | null
}

/**
 * Mismo patrón que domain/viajes/sync.ts y domain/jornada/sync.ts. Solo
 * registros históricos — los ítems de mantenimiento no se sincronizan en
 * este corte (ver types.ts).
 */
export async function sincronizarRegistrosMantenimientoPendientes(): Promise<ResultadoSincronizacion> {
  if (!haySesion()) {
    return { intentados: 0, sincronizados: 0, primerError: null }
  }

  const pendientes = await repositorioMantenimiento.registrosPendientesDeSync()
  let sincronizados = 0
  let primerError: string | null = null

  for (const registro of pendientes) {
    try {
      await subirRegistroMantenimiento(registro)
      await repositorioMantenimiento.marcarRegistroSincronizado(registro.id)
      sincronizados += 1
    } catch (error) {
      if (!primerError) primerError = error instanceof Error ? error.message : 'Error al sincronizar'
    }
  }

  return { intentados: pendientes.length, sincronizados, primerError }
}
