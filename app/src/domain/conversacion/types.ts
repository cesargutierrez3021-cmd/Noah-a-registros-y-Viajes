/**
 * Dominio: Conversación (Fase 10 — Voz + conversación continua).
 *
 * A propósito NO tiene repository.ts: la conversación es de UNA sesión de
 * voz, no un dato que valga la pena persistir en disco todavía (D-11, ver
 * PLAN-MAESTRO). Si más adelante se decide guardar historial de preguntas al
 * asistente (por ejemplo para el formulario de Data Safety de Google Play,
 * Fase 14), ahí sí se le agrega repository.ts siguiendo el patrón de D-8 —
 * hoy sería construir algo que nadie pidió todavía.
 */

export interface TurnoConversacion {
  pregunta: string
  respuesta: string
}

export type EstadoConversacion =
  | 'inactiva' // no se está escuchando ni hablando
  | 'escuchando' // el micrófono está capturando lo que dice el conductor
  | 'procesando' // se mandó el texto al backend, esperando respuesta
  | 'hablando' // reproduciendo la respuesta en voz (texto a voz)
  | 'error'

/**
 * Resultado de un turno, tal cual lo devuelve POST /ai/conversacion (Fase 10,
 * server/src/modules/ai/types.ts → ResultadoConversacion). Duplicado a mano
 * del lado del cliente por la misma razón que el resto de los tipos
 * compartidos con el backend (D-8: server no depende de app/, ni al revés).
 */
export interface ResultadoTurno {
  intencion: string | null
  respuesta: string
  resueltaPorRegla: boolean
  generadaPorIA: boolean
}
