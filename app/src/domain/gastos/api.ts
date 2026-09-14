import { postAutenticado } from '../../lib/api'
import type { Gasto } from './types'

/** POST /sync/gastos — ver server/src/modules/sync/routes.ts. */
export async function subirGasto(gasto: Gasto): Promise<void> {
  await postAutenticado<{ id: string; sincronizado: boolean }>('/sync/gastos', {
    id: gasto.id,
    categoria: gasto.categoria,
    monto: gasto.monto,
    fechaISO: gasto.fechaISO,
    litros: gasto.litros,
    notas: gasto.notas,
  })
}
