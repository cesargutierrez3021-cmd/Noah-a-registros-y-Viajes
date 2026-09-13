import { postAutenticado } from '../../lib/api'
import type { ResultadoTurno, TurnoConversacion } from './types'

/**
 * Mismos shapes que `ContextoAnalisis`/`ContextoConversacion` del backend
 * (server/src/modules/ai/types.ts), duplicados a mano por la misma razón de
 * siempre (D-8: server no importa tipos de app/, ni al revés). Todo
 * opcional: si no se manda nada, el backend solo puede resolver por reglas
 * (Fase 8) o responder sin datos concretos (Fase 9).
 */
export interface ContextoResumenEnvio {
  kmTotales: number
  ingresos: number
  cantidadViajes: number
}

export interface ContextoMantenimientoItemEnvio {
  nombre: string
  vencido: boolean
  proximoAVencer: boolean
  kmFaltantes: number | null
  diasFaltantes: number | null
}

export interface ContextoPuntoPeriodoEnvio {
  clave: string
  resumen: ContextoResumenEnvio
}

export interface ContextoConversacionEnvio {
  hoy?: ContextoResumenEnvio
  semana?: ContextoResumenEnvio
  mantenimiento?: ContextoMantenimientoItemEnvio[]
  historial?: ContextoPuntoPeriodoEnvio[]
  turnosPrevios?: TurnoConversacion[]
}

/**
 * Llama a POST /ai/conversacion (Fase 10). El texto ya viene transcrito por
 * domain/conversacion/voz.ts — este archivo no sabe nada de micrófonos, solo
 * de la llamada HTTP. `contexto` lo arma la capa de orquestación
 * (app/src/features/conversacion/ConversacionScreen.tsx), cruzando datos de
 * domain/viajes y domain/mantenimiento, igual que D-10 ya establece para
 * cualquier coordinación entre dominios.
 */
export async function enviarTurnoConversacion(
  texto: string,
  contexto: ContextoConversacionEnvio | undefined,
  profundidad: 'normal' | 'profundo' = 'normal',
): Promise<ResultadoTurno> {
  return postAutenticado<ResultadoTurno>('/ai/conversacion', { texto, contexto, profundidad })
}
