import { postAutenticado } from '../../lib/api'
import type { Bono } from './types'

/** POST /sync/bonos — ver server/src/modules/sync/routes.ts. */
export async function subirBono(bono: Bono): Promise<void> {
  await postAutenticado<{ id: string; sincronizado: boolean }>('/sync/bonos', {
    id: bono.id,
    monto: bono.monto,
    fechaISO: bono.fechaISO,
  })
}
