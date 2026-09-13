/**
 * Fase 12 — Seguridad, pendiente #4: hasta ahora el rate limiter y los logins
 * fallidos se bloqueaban/rechazaban sin dejar ningún rastro — no había forma
 * de notar un ataque en curso (fuerza bruta, credential stuffing) mirando los
 * logs. Esta es la única puerta de salida para ese tipo de evento — nada más
 * en el backend debe hacer `console.warn` suelto para esto, todo pasa por acá.
 *
 * A propósito NO es una integración con un servicio de logging real
 * (Datadog, Sentry, etc.) — eso depende de dónde se despliegue el backend,
 * decisión que sigue pendiente (ver PLAN-MAESTRO "Qué falta decidir"). Hoy
 * esto solo imprime a stdout con una forma consistente, fácil de parsear
 * después si se conecta a algo real, o de grep-ear a mano mientras tanto.
 */

export type TipoEventoSeguridad =
  | 'rate_limit_bloqueado'
  | 'login_fallido'
  | 'registro_rechazado'
  | 'sync_conflicto_pertenencia'

export interface EventoSeguridad {
  tipo: TipoEventoSeguridad
  ip: string
  detalle?: string
}

export function logEventoSeguridad(evento: EventoSeguridad): void {
  const linea = {
    nivel: 'seguridad',
    timestampISO: new Date().toISOString(),
    ...evento,
  }
  // JSON en una sola línea a propósito: así es fácil de filtrar/parsear si esto
  // termina alimentando algo real más adelante, sin tener que cambiar el formato.
  console.warn(JSON.stringify(linea))
}
