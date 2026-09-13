import { armarContextoCompacto } from './contextoCompacto'
import { proveedorSinImplementar } from './proveedorIA'
import type { ProveedorIA } from './proveedorIA'
import type { ContextoAnalisis, ProfundidadAnalisis, ResultadoAnalisis } from './types'

const INSTRUCCION_SISTEMA = [
  'Eres el analista de MIA, una app para conductores de plataformas (Uber, DiDi, inDrive, etc.) en Colombia.',
  'Responde en español, corto y directo, usando SOLO los datos del contexto — nunca inventes cifras que no estén ahí.',
  'Si el contexto no trae el dato que hace falta para responder algo puntual, dilo en vez de adivinar.',
].join(' ')

/**
 * Punto de entrada del proxy de IA (Fase 9). Arma el contexto compacto,
 * arma el prompt completo, y se lo pasa al proveedor de IA inyectado (por
 * defecto el stub `proveedorSinImplementar`, que lanza `ErrorProveedorIANoConfigurado`
 * — ver proveedorIA.ts).
 */
export async function generarAnalisis(
  pregunta: string,
  contexto: ContextoAnalisis | undefined,
  profundidad: ProfundidadAnalisis,
  proveedorIA: ProveedorIA = proveedorSinImplementar,
): Promise<ResultadoAnalisis> {
  const contextoCompacto = armarContextoCompacto(contexto, profundidad)

  const prompt = [
    INSTRUCCION_SISTEMA,
    '',
    `Datos del conductor:\n${contextoCompacto}`,
    '',
    `Pregunta del conductor: ${pregunta}`,
  ].join('\n')

  const respuesta = await proveedorIA(prompt)
  return { respuesta, generadaPorIA: true }
}
