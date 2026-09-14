import { resolverIntencion } from './router.js'
import { generarAnalisis } from './analisis.js'
import { clasificadorSinImplementar } from './clasificadorIA.js'
import type { ClasificadorIntentIA } from './clasificadorIA.js'
import { proveedorSinImplementar } from './proveedorIA.js'
import type { ProveedorIA } from './proveedorIA.js'
import type { ContextoConversacion, ProfundidadAnalisis, ResultadoConversacion, TurnoConversacion } from './types.js'

/**
 * Punto de entrada de POST /ai/conversacion (Fase 10). Es la pieza que decide,
 * turno a turno, si alcanza con el Intent Router (Fase 8 — rápido, gratis, sin
 * modelo) o si hace falta el proxy de IA (Fase 9 — para razonar sobre los
 * datos). El cliente no elige esto: manda el texto tal cual salió del
 * reconocimiento de voz (domain/conversacion/voz.ts) y esta función decide el
 * camino, siguiendo el mismo principio que ya define la arquitectura
 * ("reglas determinísticas primero", docs/FASE2-ARQUITECTURA.md sección 6).
 *
 * 1. Prueba el Intent Router. Si resolvió una intención reconocida CON
 *    respuesta armada (regla o clasificador de respaldo), se devuelve eso —
 *    sin tocar el proxy de IA. Es el camino barato y es el que más se va a
 *    usar en la práctica según las intenciones que ya existen (Fase 8).
 *
 *    Bloque 1, ítem 2 (confirmado leyendo el código, no supuesto): cuando
 *    `resueltaPorRegla` es true, `resultadoIntent.respuesta` ahora NUNCA es
 *    null (fix real en `respuestas.ts`, no acá) — así que este `if` ya no
 *    puede fallar por error para una intención que la regla sí reconoció.
 *    Antes SÍ podía pasar: `armarRespuesta` devolvía null si faltaba un dato
 *    del contexto, y este `if` (que solo mira si `respuesta` es truthy)
 *    caía al proxy de IA de abajo — que es un stub sin proveedor
 *    configurado, de ahí el error "IA no configurada" que reportó el
 *    usuario incluso preguntando algo que el router sí reconocía.
 * 2. Si no (`no_reconocida`, o el clasificador de respaldo sin implementar
 *    devolvió sin respuesta), se pasa al proxy de IA (Fase 9), agregando los
 *    turnos previos de esta conversación a la pregunta para que el modelo
 *    pueda resolver referencias tipo "¿y ayer?" sin que el cliente repita todo.
 */
export async function procesarTurnoConversacion(
  texto: string,
  contexto: ContextoConversacion | undefined,
  profundidad: ProfundidadAnalisis = 'normal',
  clasificadorIA: ClasificadorIntentIA = clasificadorSinImplementar,
  proveedorIA: ProveedorIA = proveedorSinImplementar,
): Promise<ResultadoConversacion> {
  const resultadoIntent = await resolverIntencion(texto, contexto, clasificadorIA)

  if (resultadoIntent.intencion !== 'no_reconocida' && resultadoIntent.respuesta) {
    return {
      intencion: resultadoIntent.intencion,
      respuesta: resultadoIntent.respuesta,
      resueltaPorRegla: resultadoIntent.resueltaPorRegla,
      generadaPorIA: false,
    }
  }

  const preguntaConHistorial = armarPreguntaConTurnosPrevios(texto, contexto?.turnosPrevios)
  const resultadoAnalisis = await generarAnalisis(preguntaConHistorial, contexto, profundidad, proveedorIA)

  return {
    intencion: null,
    respuesta: resultadoAnalisis.respuesta,
    resueltaPorRegla: false,
    generadaPorIA: resultadoAnalisis.generadaPorIA,
  }
}

/**
 * `generarAnalisis` (Fase 9) arma su propio prompt a partir de
 * `contextoCompacto.ts` + la pregunta — no sabe nada de "turnos previos" de
 * una conversación de voz. En vez de tocar ese archivo (Fase 9 ya está
 * cerrada con salvedades, y `contextoCompacto.ts` es código compartido con
 * /ai/analisis, que no tiene turnos), esta función antepone un bloque de
 * texto con los últimos turnos a la pregunta. Es una solución simple a
 * propósito — conectar `turnosPrevios` directo en `contextoCompacto.ts`
 * (para que cuente como parte del "contexto compacto" real y no como texto
 * pegado a la pregunta) queda como mejora pendiente si en la práctica el
 * modelo no le da suficiente peso puesto así (ver "Estado real de Fase 10"
 * en PLAN-MAESTRO).
 */
function armarPreguntaConTurnosPrevios(texto: string, turnosPrevios?: TurnoConversacion[]): string {
  if (!turnosPrevios || turnosPrevios.length === 0) return texto

  const LIMITE_TURNOS = 6
  const turnos = turnosPrevios.slice(-LIMITE_TURNOS)
  const lineas = turnos.map((t) => `Conductor preguntó: "${t.pregunta}" → se le respondió: "${t.respuesta}"`)

  return [
    'Conversación previa con este conductor (más reciente al final):',
    lineas.join('\n'),
    '',
    `Pregunta actual del conductor: ${texto}`,
  ].join('\n')
}
