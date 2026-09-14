import { postAutenticado } from '../../lib/api'
import type { AbonoDeuda, Deuda } from './types'

/** POST /sync/deudas — ver server/src/modules/sync/routes.ts. */
export async function subirDeuda(deuda: Deuda): Promise<void> {
  await postAutenticado<{ id: string; sincronizado: boolean }>('/sync/deudas', {
    id: deuda.id,
    nombre: deuda.nombre,
    saldoInicial: deuda.saldoInicial,
    saldoActual: deuda.saldoActual,
    cuotaProgramada: deuda.cuotaProgramada,
    creadaEnISO: deuda.creadaEnISO,
  })
}

/** POST /sync/deudas/abonos — ver server/src/modules/sync/routes.ts. */
export async function subirAbonoDeuda(abono: AbonoDeuda): Promise<void> {
  await postAutenticado<{ id: string; sincronizado: boolean }>('/sync/deudas/abonos', {
    id: abono.id,
    deudaId: abono.deudaId,
    monto: abono.monto,
    fechaISO: abono.fechaISO,
  })
}
