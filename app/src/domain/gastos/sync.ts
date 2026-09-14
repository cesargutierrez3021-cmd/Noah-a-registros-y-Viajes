import { haySesion } from '../../lib/api'
import { repositorioGastos } from './repository'
import { subirGasto } from './api'

export interface ResultadoSincronizacion {
  intentados: number
  sincronizados: number
  primerError: string | null
}

/** Mismo patrón que domain/mantenimiento/sync.ts — registrado en App.tsx vía lib/autoSync.ts. */
export async function sincronizarGastosPendientes(): Promise<ResultadoSincronizacion> {
  if (!haySesion()) {
    return { intentados: 0, sincronizados: 0, primerError: null }
  }

  const pendientes = await repositorioGastos.pendientesDeSync()
  let sincronizados = 0
  let primerError: string | null = null

  for (const gasto of pendientes) {
    try {
      await subirGasto(gasto)
      await repositorioGastos.marcarSincronizado(gasto.id)
      sincronizados += 1
    } catch (error) {
      if (!primerError) primerError = error instanceof Error ? error.message : 'Error al sincronizar'
    }
  }

  return { intentados: pendientes.length, sincronizados, primerError }
}
