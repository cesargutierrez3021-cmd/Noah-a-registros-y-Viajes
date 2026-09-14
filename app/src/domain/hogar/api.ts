import { postAutenticado } from '../../lib/api'
import type { ConceptoFijo, GastoHogar } from './types'

/** POST /sync/hogar/conceptos-fijos — ver server/src/modules/sync/routes.ts. */
export async function subirConceptoFijo(concepto: ConceptoFijo): Promise<void> {
  await postAutenticado<{ id: string; sincronizado: boolean }>('/sync/hogar/conceptos-fijos', {
    id: concepto.id,
    nombre: concepto.nombre,
    montoEsperado: concepto.montoEsperado,
    diaDelMes: concepto.diaDelMes,
    activo: concepto.activo,
    creadoEnISO: concepto.creadoEnISO,
  })
}

/** POST /sync/hogar/gastos — ver server/src/modules/sync/routes.ts. */
export async function subirGastoHogar(gasto: GastoHogar): Promise<void> {
  await postAutenticado<{ id: string; sincronizado: boolean }>('/sync/hogar/gastos', {
    id: gasto.id,
    nombre: gasto.nombre,
    monto: gasto.monto,
    tipo: gasto.tipo,
    fechaISO: gasto.fechaISO,
    conceptoFijoId: gasto.conceptoFijoId,
  })
}
