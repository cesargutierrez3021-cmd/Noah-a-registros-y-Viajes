import { postAutenticado } from '../../lib/api'
import type { RegistroMantenimiento } from './types'

/**
 * POST /sync/mantenimiento/registros — ver server/src/modules/sync/routes.ts.
 * Solo registros, nunca ítems (ver types.ts sobre por qué).
 */
export async function subirRegistroMantenimiento(registro: RegistroMantenimiento): Promise<void> {
  await postAutenticado<{ id: string; sincronizado: boolean }>('/sync/mantenimiento/registros', {
    id: registro.id,
    itemId: registro.itemId,
    fechaISO: registro.fechaISO,
    km: registro.km,
    costo: registro.costo,
    notas: registro.notas,
  })
}
