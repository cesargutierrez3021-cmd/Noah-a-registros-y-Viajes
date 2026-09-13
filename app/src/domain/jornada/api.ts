import { postAutenticado } from '../../lib/api'
import type { Jornada } from './types'

/**
 * POST /sync/jornadas — ver server/src/modules/sync/routes.ts. Mismo criterio
 * de siempre (D-8): se arma el payload a mano, sin mandar `pendienteDeSync`
 * (detalle de la cola local que al backend no le importa).
 */
export async function subirJornada(jornada: Jornada): Promise<void> {
  await postAutenticado<{ id: string; sincronizado: boolean }>('/sync/jornadas', {
    id: jornada.id,
    inicioISO: jornada.inicioISO,
    finISO: jornada.finISO,
    viajesIds: jornada.viajesIds,
  })
}
