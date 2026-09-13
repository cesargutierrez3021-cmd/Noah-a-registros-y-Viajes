import { haySesion } from '../../lib/api'
import { repositorioJornadas } from './repository'
import { subirJornada } from './api'

export interface ResultadoSincronizacion {
  intentados: number
  sincronizados: number
  primerError: string | null
}

/**
 * Mismo patrón que domain/viajes/sync.ts: en secuencia (no en paralelo, para
 * no saturar el rate limiter compartido de /sync/*, ver
 * server/src/modules/sync/routes.ts), best-effort, y no hace nada sin sesión.
 *
 * Una jornada puede subirse varias veces mientras está abierta (cada vez que
 * se le agrega un viaje) — eso es intencional, no un bug: el backend hace
 * upsert por id, así que cada subida solo actualiza la misma fila.
 */
export async function sincronizarJornadasPendientes(): Promise<ResultadoSincronizacion> {
  if (!haySesion()) {
    return { intentados: 0, sincronizados: 0, primerError: null }
  }

  const pendientes = await repositorioJornadas.pendientesDeSync()
  let sincronizados = 0
  let primerError: string | null = null

  for (const jornada of pendientes) {
    try {
      await subirJornada(jornada)
      await repositorioJornadas.marcarSincronizado(jornada.id)
      sincronizados += 1
    } catch (error) {
      if (!primerError) primerError = error instanceof Error ? error.message : 'Error al sincronizar'
    }
  }

  return { intentados: pendientes.length, sincronizados, primerError }
}
