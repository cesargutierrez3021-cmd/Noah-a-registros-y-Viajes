import { haySesion } from '../../lib/api'
import { repositorioBonos } from './repository'
import { subirBono } from './api'

export interface ResultadoSincronizacion {
  intentados: number
  sincronizados: number
  primerError: string | null
}

/** Mismo patrón que domain/gastos/sync.ts — registrado en App.tsx vía lib/autoSync.ts. */
export async function sincronizarBonosPendientes(): Promise<ResultadoSincronizacion> {
  if (!haySesion()) {
    return { intentados: 0, sincronizados: 0, primerError: null }
  }

  const pendientes = await repositorioBonos.pendientesDeSync()
  let sincronizados = 0
  let primerError: string | null = null

  for (const bono of pendientes) {
    try {
      await subirBono(bono)
      await repositorioBonos.marcarSincronizado(bono.id)
      sincronizados += 1
    } catch (error) {
      if (!primerError) primerError = error instanceof Error ? error.message : 'Error al sincronizar'
    }
  }

  return { intentados: pendientes.length, sincronizados, primerError }
}
