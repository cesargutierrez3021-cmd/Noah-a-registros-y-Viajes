import type { ReglaIntent } from './types.js'

/**
 * Reglas determinísticas. Cubren las intenciones para las que ya existe una fuente de
 * datos real del lado del cliente (domain/estadisticas, domain/mantenimiento, domain/deudas,
 * domain/ahorro, domain/metaDiaria) — así el punto 3 de Fase 8 (conectar con datos reales, ver
 * `respuestas.ts`) tiene con qué responder de verdad y no solo confirmar la intención.
 *
 * 2026-09-23, pedido explícito del usuario ("que él tenga muchas formas de responderme...
 * como si fuera una IA, pero pues que no lo sea"): el bug reportado fue "cuánto voy hoy" sin
 * respuesta — esa frase no matcheaba ningún disparador de ningún intent, así que caía siempre
 * al proxy de IA de pago (sin configurar en este entorno). Esta ronda: (1) se agregan muchos
 * más sinónimos por intent existente, y (2) tres intents nuevos (`resumen_hoy`, `deudas_estado`,
 * `ahorro_estado`, `meta_diaria_estado`) para las preguntas de dinero/deudas/ahorro/meta que el
 * usuario pidió explícitamente. El ORDEN de este arreglo importa: `router.ts` recorre en orden
 * y usa el primer disparador que matchea como substring — por eso los disparadores de cada
 * intent evitan frases sueltas demasiado genéricas ("como voy" solo, "cuanto llevo" solo) que
 * podrían "comerse" preguntas de otro intent más específico.
 */
export const REGLAS_INTENT: ReglaIntent[] = [
  {
    intencion: 'km_hoy',
    disparadores: ['cuantos km', 'cuantos kilometros', 'km de hoy', 'kilometros de hoy', 'cuantos km llevo', 'cuantos kilometros llevo'],
  },
  {
    intencion: 'ingresos_hoy',
    disparadores: [
      'cuanto gane', 'cuanto he ganado', 'ingresos de hoy', 'cuanto llevo hoy', 'cuanto llevo ganado',
      'cuanto llevo de plata', 'cuanto llevo de dinero', 'cuanto voy en dinero', 'cuanto voy en plata',
      'cuanto dinero llevo', 'cuanto plata llevo', 'cuanto he hecho hoy', 'cuanto me he hecho hoy',
    ],
  },
  {
    intencion: 'viajes_hoy',
    disparadores: [
      'cuantos viajes', 'cuantas carreras', 'viajes de hoy', 'carreras de hoy', 'cuantos servicios',
      'cuantas vueltas', 'cuantos pasajeros', 'cuantas carreras llevo', 'cuantos viajes llevo',
    ],
  },
  {
    // Consulta general sin especificar qué dato — el ejemplo real del usuario: "cuánto voy
    // hoy" a secas. Frases completas a propósito (no "como voy" ni "cuanto voy" sueltos),
    // para no comerse preguntas más específicas de deudas/ahorro/meta que también empiezan
    // parecido — ver el comentario de arriba sobre el orden del arreglo.
    intencion: 'resumen_hoy',
    disparadores: [
      'cuanto voy hoy', 'como voy hoy', 'como me fue hoy', 'como va el dia', 'como voy en el dia',
      'que tal el dia', 'como estuvo el dia', 'resumen de hoy', 'como voy en general', 'dame un resumen',
    ],
  },
  {
    intencion: 'resumen_semana',
    disparadores: [
      'como voy esta semana', 'como va la semana', 'resumen de la semana', 'resumen semanal',
      'cuanto llevo esta semana', 'cuanto voy esta semana', 'como voy en la semana',
    ],
  },
  {
    intencion: 'mantenimientos_pendientes',
    disparadores: ['que mantenimiento', 'mantenimientos pendientes', 'algo pendiente de mantenimiento', 'me toca algo del carro'],
  },
  {
    // 2026-09-15, pedido explícito del usuario: "zona" se refiere a dónde RECOGE
    // (ver desglosePorZona en el cliente), no a dónde deja al pasajero.
    intencion: 'mejor_zona',
    disparadores: [
      'mejor zona', 'que zona me conviene', 'en que zona gano mas', 'donde me va mejor',
      'donde recojo mas', 'en que zona me va mejor', 'que zona me va mejor',
    ],
  },
  {
    intencion: 'mejor_horario',
    disparadores: [
      'mejor horario', 'que horario me conviene', 'en que horario gano mas', 'mejor franja',
      'a que hora me va mejor', 'en que horario me va mejor', 'que horario me va mejor',
    ],
  },
  {
    intencion: 'deudas_estado',
    disparadores: [
      'cuanto debo', 'cuanta deuda tengo', 'cual es el pago de este mes', 'cuando pago',
      'cuanto tengo que pagar', 'mis deudas', 'estado de mis deudas', 'proximo pago',
      'cuanto me falta pagar', 'que deudas tengo',
    ],
  },
  {
    intencion: 'ahorro_estado',
    disparadores: [
      'cuanto llevo de ahorro', 'cuanto tengo ahorrado', 'como va mi ahorro', 'cuanto he ahorrado',
      'mi ahorro', 'como voy con el ahorro', 'cuanto llevo ahorrado',
    ],
  },
  {
    intencion: 'meta_diaria_estado',
    disparadores: [
      'como voy con la meta', 'como voy con mi meta', 'cumplo la meta', 'meta de hoy',
      'cuanto me falta para la meta', 'voy bien o mal', 'cuanto me falta para completar',
      'cuanto me faltaria', 'como va mi meta diaria',
    ],
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
