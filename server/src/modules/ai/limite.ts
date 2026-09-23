import { prisma } from '../../lib/prisma.js'
import { repositorioPlanes } from '../plans/repository.js'
import { CLAVE_PLAN_GRATIS } from '../plans/types.js'

export class ErrorLimiteIA extends Error {
  codigoHttp = 429
}

/**
 * 2026-09-22, corrección de un bug real encontrado en auditoría: `Plan.limiteConsultasIA` se
 * mostraba en el catálogo de planes pero no aplicaba a nada — cualquier usuario podía
 * consultar a la IA sin tope. Esto cubre `/ai/analisis` y `/ai/conversacion` (las dos rutas
 * que de verdad tocan el proveedor de IA pago), no `/ai/intent` (reglas locales, sin costo).
 *
 * El registro no auto-asigna un `PlanDeUsuario` al registrarse (confirmado en auth/service.ts)
 * — sin fila activa, el usuario está en el plan gratis implícito, así que el límite efectivo
 * cae de vuelta al de 'gratis' del catálogo (`PLANES_BASE`) cuando no hay plan activo.
 * `limiteConsultasIA === null` = sin tope (nunca bloquea).
 */
async function limiteEfectivoDelUsuario(usuarioId: string): Promise<number | null> {
  const activo = await repositorioPlanes.obtenerPlanActivoDeUsuario(usuarioId)
  if (activo) return activo.plan.limiteConsultasIA
  const gratis = await repositorioPlanes.buscarPlanPorClave(CLAVE_PLAN_GRATIS)
  return gratis?.limiteConsultasIA ?? null
}

function inicioDelMesActual(): Date {
  const ahora = new Date()
  return new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1))
}

/**
 * Verifica el límite del mes ANTES de gastar la llamada al proveedor de IA, y solo registra
 * la consulta después de que la ruta responda con éxito (ver routes.ts) — un intento que
 * termina en error (ej. el proveedor de IA no configurado) no debería gastarle cupo al usuario.
 */
export async function verificarLimiteConsultasIA(usuarioId: string): Promise<void> {
  const limite = await limiteEfectivoDelUsuario(usuarioId)
  if (limite === null) return
  const usadas = await prisma.consultaIA.count({ where: { usuarioId, fechaISO: { gte: inicioDelMesActual() } } })
  if (usadas >= limite) {
    throw new ErrorLimiteIA(`Llegaste al límite de ${limite} consultas a MIA de este mes. Volvé a intentar el próximo mes, o mejorá tu plan.`)
  }
}

export async function registrarConsultaIA(usuarioId: string): Promise<void> {
  await prisma.consultaIA.create({ data: { usuarioId } })
}
