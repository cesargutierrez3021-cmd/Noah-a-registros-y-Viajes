/**
 * Intent Router (Fase 8) + Proxy de IA con contexto compacto (Fase 9).
 * Arquitectura (docs/FASE2-ARQUITECTURA.md, sección 6):
 * "reglas determinísticas primero — la mayoría de preguntas se resuelven sin IA".
 *
 * Fase 8 (ver PLAN-MAESTRO "Estado real de Fase 8"): reglas + clasificador de respaldo +
 * contexto opcional del cliente — HECHA con salvedades.
 * Fase 9 (ver PLAN-MAESTRO "Estado real de Fase 9"): proxy de IA + contexto compacto —
 * HECHA con salvedades, mismo patrón: el proveedor de IA sigue sin decidirse, el proxy
 * es una interfaz inyectable con un stub por defecto.
 */

export type Intencion =
  | 'km_hoy'
  | 'ingresos_hoy'
  | 'viajes_hoy'
  | 'resumen_semana'
  | 'mantenimientos_pendientes'
  | 'no_reconocida' // ninguna regla matcheó Y el clasificador IA tampoco resolvió (o es el stub)

export interface ResultadoIntent {
  intencion: Intencion
  /** true = una regla determinística la resolvió, sin tocar ningún modelo de IA. */
  resueltaPorRegla: boolean
  confianza: number // 0 a 1. Las reglas siempre devuelven 1.
  /**
   * Texto de respuesta ya armado. Si `resueltaPorRegla` es true, esto NUNCA es null
   * (Bloque 1, ítem 2 — ver respuestas.ts): si falta el dato, se devuelve un aviso
   * ("todavía no tengo tus datos de hoy...") en vez de null, justamente para que
   * conversacion.ts nunca tenga que caer al proxy de IA por una intención que la
   * regla ya reconoció. Solo puede ser null cuando viene del clasificador IA de
   * respaldo (stub, ver clasificadorIA.ts) y ese stub no armó nada.
   */
  respuesta: string | null
}

export interface ReglaIntent {
  intencion: Exclude<Intencion, 'no_reconocida'>
  /** Frases/palabras clave en minúscula y sin tildes que disparan esta intención. */
  disparadores: string[]
}

/**
 * Mismo shape que `EstadoAlerta` del cliente (app/src/domain/mantenimiento/types.ts),
 * declarado de forma independiente a propósito: server/ no importa tipos de app/ (D-8,
 * cliente y backend son proyectos separados). Si `EstadoAlerta` cambia del lado del
 * cliente, esto no se actualiza solo — hay que sincronizarlos a mano por ahora.
 */
export interface ContextoMantenimientoItem {
  nombre: string
  vencido: boolean
  proximoAVencer: boolean
  kmFaltantes: number | null
  diasFaltantes: number | null
}

/** Mismo shape que `ResumenViajes` del cliente (app/src/domain/estadisticas/types.ts). */
export interface ContextoResumen {
  kmTotales: number
  ingresos: number
  cantidadViajes: number
}

/**
 * Contexto opcional que el cliente puede mandar junto a la pregunta, ya calculado
 * localmente (domain/estadisticas/calculos.ts, domain/mantenimiento/reglas.ts). Permite
 * responder con datos reales sin esperar a que exista sync con el backend (Fase 13 sigue
 * pendiente) — ver PLAN-MAESTRO, "Estado real de Fase 8", punto 3.
 *
 * Todo opcional a propósito: si el cliente no manda nada, el backend solo confirma la
 * intención detectada, igual que en la versión anterior de esta ruta.
 */
export interface ContextoIntent {
  hoy?: ContextoResumen
  semana?: ContextoResumen
  mantenimiento?: ContextoMantenimientoItem[]
}

/**
 * Fase 9 — proxy de IA con contexto compacto, para "análisis" y "análisis
 * profundo" (docs/FASE2-ARQUITECTURA.md sección 6, punto 5). Distinto del
 * Intent Router de Fase 8: el Intent Router resuelve preguntas puntuales con
 * una respuesta ya sabida (reglas); esto es para cuando la pregunta necesita
 * que un modelo razone sobre los datos (ej. "¿cómo puedo mejorar mis
 * ingresos este mes?"), no solo mapearla a una intención fija.
 */
export type ProfundidadAnalisis = 'normal' | 'profundo'

/**
 * Mismo shape que `PuntoPeriodo` del cliente (app/src/domain/estadisticas/types.ts),
 * duplicado a mano por la misma razón que `ContextoResumen` (D-8, server no
 * importa tipos de app/). Opcional: solo hace falta para preguntas que
 * comparan períodos ("¿cómo voy este mes comparado con el anterior?").
 */
export interface ContextoPuntoPeriodo {
  clave: string
  resumen: ContextoResumen
}

/**
 * Contexto para el proxy de IA (Fase 9). Extiende `ContextoIntent` (Fase 8)
 * con historial por período — el resto (hoy/semana/mantenimiento) se
 * reutiliza tal cual, mismo principio: el cliente manda datos ya calculados,
 * nunca decide qué prompt se arma con ellos (ver docs/FASE2-ARQUITECTURA.md
 * sección 3, fila "Historial de IA / contexto" — "el backend arma el
 * contexto compacto antes de cada llamada, el cliente nunca decide qué
 * mandarle al modelo": el cliente aporta los NÚMEROS, `contextoCompacto.ts`
 * decide cómo y cuánto de eso entra en el prompt).
 */
export interface ContextoAnalisis extends ContextoIntent {
  historial?: ContextoPuntoPeriodo[]
}

export interface ResultadoAnalisis {
  respuesta: string
  /** true si respondió un proveedor de IA real; false si fue el stub (ver PLAN-MAESTRO, Fase 9 — proveedor sin decidir todavía). */
  generadaPorIA: boolean
}

/**
 * Fase 10 — Voz + conversación continua (docs/FASE2-ARQUITECTURA.md sección 6,
 * punto 6: "al final, porque depende de que el Intent Router y el proxy de IA
 * ya funcionen bien por texto"). Un turno es una pregunta ya resuelta dentro
 * de la MISMA conversación de voz — no confundir con `ContextoPuntoPeriodo`
 * (eso es historial de estadísticas por período, esto es historial de la
 * charla). La conversación vive en el cliente (domain/conversacion, Fase 10 —
 * D-11), el backend no la persiste todavía: cada request a /ai/conversacion
 * manda los turnos previos que hagan falta, igual que ya se hace con
 * `hoy`/`semana`/`mantenimiento` desde Fase 8 (D-8: server no es dueño del
 * dato, solo lo recibe ya calculado).
 */
export interface TurnoConversacion {
  pregunta: string
  respuesta: string
}

/**
 * Contexto para /ai/conversacion. Mismo `ContextoAnalisis` de Fase 9 más los
 * turnos previos de esta conversación — así preguntas de seguimiento como
 * "¿y ayer?" o "¿cuánto más que la semana pasada?" se pueden resolver sin que
 * el cliente arme la pregunta completa cada vez.
 */
export interface ContextoConversacion extends ContextoAnalisis {
  turnosPrevios?: TurnoConversacion[]
}

export interface ResultadoConversacion {
  /** La intención que resolvió el Intent Router (Fase 8), o null si tocó pasar por el proxy de IA (Fase 9). */
  intencion: Intencion | null
  respuesta: string
  /** true si una regla determinística del Intent Router resolvió esto, sin tocar ningún modelo. */
  resueltaPorRegla: boolean
  /** true si la respuesta vino de un proveedor de IA real (proxy de Fase 9). */
  generadaPorIA: boolean
}
