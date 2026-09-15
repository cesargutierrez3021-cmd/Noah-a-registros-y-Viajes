/**
 * Dominio: Jornada.
 *
 * Una jornada agrupa los viajes de un turno de trabajo (normalmente un día).
 * Este dominio SOLO sabe agrupar — nunca calcula km ni ingresos, eso vive en
 * domain/viajes. Aquí solo se guarda la relación "estos viajes pertenecen a esta jornada".
 */
export interface Jornada {
  id: string
  inicioISO: string
  finISO: string | null
  viajesIds: string[]
  /**
   * 2026-09-15, pedido explícito del usuario: "toca pausar jornada y reanudar
   * jornada" — `null` = no está pausada ahora mismo. Con fecha = desde
   * cuándo está pausada AHORA (la pausa sigue abierta). Son SOLO estos dos
   * campos, sin sincronizar al backend (ver domain/jornada/api.ts — el
   * servidor nunca calcula duración, solo guarda inicio/fin/viajes como
   * respaldo; mismo criterio que `viajeEnCurso`, que tampoco se sincroniza,
   * D-16). `calcularTiempoJornada` (domain/estadisticas/calculos.ts) los usa
   * para restar el tiempo pausado del tiempo total de la jornada.
   */
  pausadaDesdeISO: string | null
  /** Suma de pausas YA cerradas (reanudadas), en ms. La pausa EN CURSO (si `pausadaDesdeISO` no es null) se cuenta aparte, en vivo. */
  msPausadosAcumulados: number
  /**
   * Fase 13 (continuación): a diferencia de un viaje, una jornada se marca
   * pendiente de nuevo cada vez que cambia (se le agrega un viaje, o se
   * cierra) — no es "se sube una vez y listo", el registro sigue vivo
   * mientras la jornada está abierta.
   */
  pendienteDeSync: boolean
}
