import type { ReglaIntent } from './types.js'

/**
 * Reglas determinísticas. Cubren las intenciones para las que ya existe una fuente de
 * datos real del lado del cliente (domain/estadisticas, domain/mantenimiento) — así el
 * punto 3 de Fase 8 (conectar con datos reales, ver `respuestas.ts`) tiene con qué
 * responder de verdad y no solo confirmar la intención.
 *
 * IMPORTANTE — no se releyó el documento de requisitos original en este corte (instrucción
 * de la sesión: solo leer PLAN-MAESTRO.md). Las dos intenciones nuevas (`viajes_hoy`,
 * `resumen_semana`) se agregaron porque encajan directo en datos que ya existen
 * (`calcularResumen`, `agruparPorPeriodo` con unidad 'semana'), no porque se confirmara
 * que estaban en el documento original. Sigue pendiente el punto 1 de "Estado real de
 * Fase 8": revisar ese documento y confirmar qué otras intenciones faltan.
 */
export const REGLAS_INTENT: ReglaIntent[] = [
  { intencion: 'km_hoy', disparadores: ['cuantos km', 'cuantos kilometros', 'km de hoy', 'kilometros de hoy'] },
  { intencion: 'ingresos_hoy', disparadores: ['cuanto gane', 'cuanto he ganado', 'ingresos de hoy', 'cuanto llevo hoy'] },
  { intencion: 'viajes_hoy', disparadores: ['cuantos viajes', 'cuantas carreras', 'viajes de hoy', 'carreras de hoy'] },
  {
    intencion: 'resumen_semana',
    disparadores: ['como voy esta semana', 'como va la semana', 'resumen de la semana', 'resumen semanal'],
  },
  {
    intencion: 'mantenimientos_pendientes',
    disparadores: ['que mantenimiento', 'mantenimientos pendientes', 'algo pendiente de mantenimiento', 'me toca algo del carro'],
  },
  {
    // 2026-09-15, pedido explícito del usuario: "zona" se refiere a dónde RECOGE
    // (ver desglosePorZona en el cliente), no a dónde deja al pasajero.
    intencion: 'mejor_zona',
    disparadores: ['mejor zona', 'que zona me conviene', 'en que zona gano mas', 'donde me va mejor', 'donde recojo mas'],
  },
  {
    intencion: 'mejor_horario',
    disparadores: ['mejor horario', 'que horario me conviene', 'en que horario gano mas', 'mejor franja', 'a que hora me va mejor'],
  },
]

/** Quita tildes y pasa a minúsculas — así "cuántos" y "cuantos" matchean igual. */
export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}
