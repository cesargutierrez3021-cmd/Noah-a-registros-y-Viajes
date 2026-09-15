import { haySesion } from '../../lib/api'
import { repositorioAhorro } from './repository'
import { subirAbonoAhorro, subirMetaAhorro } from './api'

export interface ResultadoSincronizacion {
  intentados: number
  sincronizados: number
  primerError: string | null
}

/**
 * Mismo patrón exacto que sincronizarDeudasPendientes (domain/deudas/sync.ts):
 * dos colas (metas mutables por upsert, abonos append-only con FK real a
 * MetaAhorro), así que una meta nueva se sube antes que sus abonos — un abono
 * cuya meta todavía está pendiente se salta esta pasada y se reintenta en la
 * próxima (lib/autoSync.ts).
 */
export async function sincronizarAhorroPendiente(): Promise<ResultadoSincronizacion> {
  if (!haySesion()) {
    return { intentados: 0, sincronizados: 0, primerError: null }
  }

  let intentados = 0
  let sincronizados = 0
  let primerError: string | null = null

  const metasPendientes = await repositorioAhorro.metasPendientesDeSync()
  for (const meta of metasPendientes) {
    intentados += 1
    try {
      await subirMetaAhorro(meta)
      await repositorioAhorro.marcarMetaSincronizada(meta.id)
      sincronizados += 1
    } catch (error) {
      if (!primerError) primerError = error instanceof Error ? error.message : 'Error al sincronizar'
    }
  }

  const idsMetasTodaviaPendientes = new Set((await repositorioAhorro.metasPendientesDeSync()).map((m) => m.id))

  const abonosPendientes = await repositorioAhorro.abonosPendientesDeSync()
  for (const abono of abonosPendientes) {
    if (idsMetasTodaviaPendientes.has(abono.metaId)) continue // se reintenta en la próxima pasada, ver comentario arriba

    intentados += 1
    try {
      await subirAbonoAhorro(abono)
      await repositorioAhorro.marcarAbonoSincronizado(abono.id)
      sincronizados += 1
    } catch (error) {
      if (!primerError) primerError = error instanceof Error ? error.message : 'Error al sincronizar'
    }
  }

  return { intentados, sincronizados, primerError }
}
