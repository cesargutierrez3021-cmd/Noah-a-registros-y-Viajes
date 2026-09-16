import { postAutenticado } from '../../lib/api'
import type { AbonoAhorro, MetaAhorro } from './types'

/** POST /sync/ahorro — ver server/src/modules/sync/routes.ts. */
export async function subirMetaAhorro(meta: MetaAhorro): Promise<void> {
  await postAutenticado<{ id: string; sincronizado: boolean }>('/sync/ahorro', {
    id: meta.id,
    nombre: meta.nombre,
    montoObjetivo: meta.montoObjetivo,
    saldoActual: meta.saldoActual,
    creadaEnISO: meta.creadaEnISO,
    aportePlaneado: meta.aportePlaneado,
  })
}

/** POST /sync/ahorro/abonos — ver server/src/modules/sync/routes.ts. */
export async function subirAbonoAhorro(abono: AbonoAhorro): Promise<void> {
  await postAutenticado<{ id: string; sincronizado: boolean }>('/sync/ahorro/abonos', {
    id: abono.id,
    metaId: abono.metaId,
    monto: abono.monto,
    fechaISO: abono.fechaISO,
  })
}
