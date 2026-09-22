import type { ResultadoSincronizacion } from '../../lib/autoSync'
import { haySesion } from '../../lib/api'
import { repositorioDeudas } from './repository'
import { subirAbonoDeuda, subirDeuda } from './api'

/**
 * A diferencia de gastos/mantenimiento (una sola cola), acá hay DOS: deudas
 * (mutable, upsert) y abonos (append-only, con FK real a `Deuda` en el
 * backend — ver schema.prisma). Por eso el orden importa acá de una forma
 * que no importaba en los demás dominios: si una deuda nueva todavía no
 * llegó al backend, sus abonos NO se intentan subir en esta pasada (el FK
 * los rechazaría) — quedan pendientes para el próximo reintento con backoff
 * (`lib/autoSync.ts`), que vuelve a intentar la deuda primero. No hace falta
 * marcarlos como error: al no contarlos como "intentados" en absoluto, el
 * backoff igual se dispara por el fallo real (el de la deuda), y el abono se
 * reintenta solo cuando corresponda.
 */
export async function sincronizarDeudasPendientes(): Promise<ResultadoSincronizacion> {
  if (!haySesion()) {
    return { intentados: 0, sincronizados: 0, primerError: null }
  }

  let intentados = 0
  let sincronizados = 0
  let primerError: string | null = null

  const deudasPendientes = await repositorioDeudas.deudasPendientesDeSync()
  for (const deuda of deudasPendientes) {
    intentados += 1
    try {
      await subirDeuda(deuda)
      await repositorioDeudas.marcarDeudaSincronizada(deuda.id)
      sincronizados += 1
    } catch (error) {
      if (!primerError) primerError = error instanceof Error ? error.message : 'Error al sincronizar'
    }
  }

  // Recalcular después del loop de arriba: una deuda que acaba de
  // sincronizarse bien ya no aparece acá, una que falló sigue apareciendo.
  const idsDeudasTodaviaPendientes = new Set((await repositorioDeudas.deudasPendientesDeSync()).map((d) => d.id))

  const abonosPendientes = await repositorioDeudas.abonosPendientesDeSync()
  for (const abono of abonosPendientes) {
    if (idsDeudasTodaviaPendientes.has(abono.deudaId)) continue // se reintenta en la próxima pasada, ver comentario arriba

    intentados += 1
    try {
      await subirAbonoDeuda(abono)
      await repositorioDeudas.marcarAbonoSincronizado(abono.id)
      sincronizados += 1
    } catch (error) {
      if (!primerError) primerError = error instanceof Error ? error.message : 'Error al sincronizar'
    }
  }

  return { intentados, sincronizados, primerError }
}
