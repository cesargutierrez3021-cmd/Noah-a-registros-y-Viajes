import { REGLAS_INTENT, normalizarTexto } from './reglas.js'
import { armarRespuesta } from './respuestas.js'
import { clasificadorSinImplementar } from './clasificadorIA.js'
import type { ClasificadorIntentIA } from './clasificadorIA.js'
import type { ContextoIntent, ResultadoIntent } from './types.js'

/**
 * Único punto de entrada del Intent Router.
 *
 * 1. Prueba reglas determinísticas (rápido, gratis, sin red). Si una matchea, arma la
 *    respuesta con `contexto` si vino (punto 3 de Fase 8).
 * 2. Si ninguna regla matchea, cae al clasificador IA de respaldo (punto 2 de Fase 8) —
 *    por defecto es el stub `clasificadorSinImplementar` (ver clasificadorIA.ts) hasta que
 *    se decida el proveedor de IA.
 *
 * `clasificadorIA` es un parámetro (no un import fijo) a propósito: así se puede pasar una
 * implementación real más adelante, o una de prueba en tests, sin tocar esta función.
 */
export async function resolverIntencion(
  textoUsuario: string,
  contexto?: ContextoIntent,
  clasificadorIA: ClasificadorIntentIA = clasificadorSinImplementar,
): Promise<ResultadoIntent> {
  const normalizado = normalizarTexto(textoUsuario)

  for (const regla of REGLAS_INTENT) {
    const coincide = regla.disparadores.some((d) => normalizado.includes(d))
    if (coincide) {
      return {
        intencion: regla.intencion,
        resueltaPorRegla: true,
        confianza: 1,
        respuesta: armarRespuesta(regla.intencion, contexto),
      }
    }
  }

  return clasificadorIA(textoUsuario)
}
