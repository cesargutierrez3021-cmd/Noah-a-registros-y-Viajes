import type { ResultadoSincronizacion } from '../../lib/autoSync'
import { haySesion } from '../../lib/api'
import { repositorioViajes } from './repository'
import { subirViaje } from './api'

/**
 * Sincroniza todos los viajes pendientes, uno a la vez y en orden (no en
 * paralelo — evita saturar el rate limiter de /sync/viajes, ver
 * server/src/modules/sync/routes.ts, y hace más simple razonar sobre qué
 * falló si algo falla a mitad de camino).
 *
 * Best-effort: si un viaje falla, se sigue con los demás (uno malo no debe
 * bloquear el resto de la cola). Si NO hay sesión iniciada, no hace nada —
 * la app funciona 100% local sin cuenta (D-13), sincronizar es un beneficio
 * extra de tener sesión, no un requisito para poder usar la app.
 */
export async function sincronizarViajesPendientes(): Promise<ResultadoSincronizacion> {
  if (!haySesion()) {
    return { intentados: 0, sincronizados: 0, primerError: null }
  }

  const pendientes = await repositorioViajes.pendientesDeSync()
  let sincronizados = 0
  let primerError: string | null = null

  for (const viaje of pendientes) {
    try {
      await subirViaje(viaje)
      await repositorioViajes.marcarSincronizado(viaje.id)
      sincronizados += 1
    } catch (error) {
      // No se relanza: un viaje con error (ej. 403 de pertenencia, o sin
      // internet a mitad de la cola) no debe frenar los que sí pueden subir.
      if (!primerError) primerError = error instanceof Error ? error.message : 'Error al sincronizar'
    }
  }

  return { intentados: pendientes.length, sincronizados, primerError }
}
