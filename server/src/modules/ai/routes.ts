import { Router } from 'express'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { resolverIntencion } from './router.js'
import { generarAnalisis } from './analisis.js'
import { procesarTurnoConversacion } from './conversacion.js'
import { requiereAutenticacion } from '../auth/middleware.js'
import { async } from '../../http/asyncHandler.js'
import { crearLimitadorDeTasa } from '../../http/rateLimit.js'

export const rutasAI = Router()

// Fase 12: /ai/analisis y /ai/conversacion pueden terminar llamando a un
// proveedor de IA de pago (Fase 9/10) — un límite más generoso que
// auth (es tráfico normal de uso, no login), pero sigue existiendo, porque
// sin él una cuenta comprometida o un bug en el cliente podría generar
// costo de IA sin límite. /ai/intent no lo necesita tanto (nunca toca un
// modelo pago hoy — Fase 8 son reglas + un clasificador que es un stub),
// pero comparte el mismo limitador por simplicidad: no vale la pena un
// tercer contador para una ruta que ya es barata.
const limitadorAI = crearLimitadorDeTasa(60 * 1000, 20, 'Demasiadas preguntas seguidas. Espera un momento.')

const esquemaContextoResumen = z.object({
  kmTotales: z.number(),
  ingresos: z.number(),
  cantidadViajes: z.number(),
})

const esquemaContextoMantenimientoItem = z.object({
  nombre: z.string(),
  vencido: z.boolean(),
  proximoAVencer: z.boolean(),
  kmFaltantes: z.number().nullable(),
  diasFaltantes: z.number().nullable(),
})

// 2026-09-15: mismo shape que ContextoDesgloseItem (server) / DesglosePor<T> (cliente) — para 'mejor_zona'/'mejor_horario'.
const esquemaContextoDesgloseItem = z.object({
  clave: z.string(),
  resumen: esquemaContextoResumen,
})

const esquemaContexto = z
  .object({
    hoy: esquemaContextoResumen.optional(),
    semana: esquemaContextoResumen.optional(),
    mantenimiento: z.array(esquemaContextoMantenimientoItem).optional(),
    porZona: z.array(esquemaContextoDesgloseItem).optional(),
    porFranja: z.array(esquemaContextoDesgloseItem).optional(),
  })
  .optional()

const esquemaPregunta = z.object({
  texto: z.string().min(1),
  /**
   * Opcional — el cliente ya calcula esto localmente (domain/estadisticas,
   * domain/mantenimiento). Si lo manda, `respuesta` en la salida trae datos reales
   * (punto 3 de Fase 8, ver PLAN-MAESTRO). Si no lo manda, el backend solo confirma la
   * intención detectada, como antes.
   */
  contexto: esquemaContexto,
})

/**
 * POST /ai/intent — reglas determinísticas primero, clasificador IA de respaldo si
 * ninguna matchea (stub por ahora, ver modules/ai/clasificadorIA.ts). No consulta la base
 * de datos ni guarda nada: es puro, toma lo que el cliente ya calculó (si lo manda) y arma
 * la respuesta con eso. Esta ruta sigue sin probarse en este entorno (sin red/Postgres,
 * pero aquí ni siquiera hace falta Postgres — es lógica pura, se puede probar con curl en
 * cuanto haya `npm install` corrido localmente).
 */
rutasAI.post(
  '/intent',
  requiereAutenticacion,
  limitadorAI,
  async(async (req: Request, res: Response) => {
    const { texto, contexto } = esquemaPregunta.parse(req.body)
    const resultado = await resolverIntencion(texto, contexto)
    res.json(resultado)
  }),
)

const esquemaContextoPuntoPeriodo = z.object({
  clave: z.string(),
  resumen: esquemaContextoResumen,
})

const esquemaContextoAnalisis = esquemaContexto.unwrap().extend({
  historial: z.array(esquemaContextoPuntoPeriodo).optional(),
}).optional()

const esquemaPreguntaAnalisis = z.object({
  pregunta: z.string().min(1),
  contexto: esquemaContextoAnalisis,
  /** 'normal' por defecto — 'profundo' manda todo el historial sin recortar (ver contextoCompacto.ts). */
  profundidad: z.enum(['normal', 'profundo']).default('normal'),
})

/**
 * POST /ai/analisis — proxy de IA con contexto compacto (Fase 9). Para preguntas que
 * necesitan que un modelo razone sobre los datos, no solo mapear a una intención fija
 * (eso es /ai/intent, Fase 8). Arma el contexto compacto + el prompt (modules/ai/analisis.ts,
 * modules/ai/contextoCompacto.ts) y se lo pasa al proveedor de IA — que hoy es un stub sin
 * implementar (modules/ai/proveedorIA.ts): responde 503 porque el proveedor de IA sigue sin
 * decidirse (ver PLAN-MAESTRO, "Qué falta decidir"), nunca inventa una respuesta.
 */
rutasAI.post(
  '/analisis',
  requiereAutenticacion,
  limitadorAI,
  async(async (req: Request, res: Response) => {
    const { pregunta, contexto, profundidad } = esquemaPreguntaAnalisis.parse(req.body)
    const resultado = await generarAnalisis(pregunta, contexto, profundidad)
    res.json(resultado)
  }),
)

const esquemaTurnoConversacion = z.object({
  pregunta: z.string().min(1),
  respuesta: z.string().min(1),
})

// Reutiliza el shape de ContextoAnalisis (Fase 9) y le agrega turnosPrevios (Fase 10).
// Límite de 20 turnos a propósito: es la conversación de UNA sesión de voz, no un
// historial completo — domain/conversacion (cliente) es quien decide cuándo empieza
// una conversación nueva y vacía turnosPrevios.
const esquemaContextoConversacion = esquemaContextoAnalisis
  .unwrap()
  .extend({ turnosPrevios: z.array(esquemaTurnoConversacion).max(20).optional() })
  .optional()

const esquemaPreguntaConversacion = z.object({
  texto: z.string().min(1),
  contexto: esquemaContextoConversacion,
  profundidad: z.enum(['normal', 'profundo']).default('normal'),
})

/**
 * POST /ai/conversacion — Fase 10. Punto de entrada único para una pregunta de voz: decide
 * internamente (modules/ai/conversacion.ts) si la resuelve el Intent Router (Fase 8, gratis
 * y sin modelo) o si hace falta el proxy de IA (Fase 9). El cliente (domain/conversacion,
 * app/src/features/conversacion) solo manda el texto ya transcrito por el reconocimiento de
 * voz, el contexto de datos que ya tenía para /ai/analisis, y los turnos previos de ESTA
 * conversación (no un historial permanente — eso sigue sin existir, ver D-11 en
 * PLAN-MAESTRO). Sin probarse en este entorno, mismo límite que el resto del módulo ai
 * (sin red para correr TypeScript real aquí).
 */
rutasAI.post(
  '/conversacion',
  requiereAutenticacion,
  limitadorAI,
  async(async (req: Request, res: Response) => {
    const { texto, contexto, profundidad } = esquemaPreguntaConversacion.parse(req.body)
    const resultado = await procesarTurnoConversacion(texto, contexto, profundidad)
    res.json(resultado)
  }),
)
