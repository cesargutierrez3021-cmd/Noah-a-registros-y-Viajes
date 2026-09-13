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
   * Fase 13 (continuación): a diferencia de un viaje, una jornada se marca
   * pendiente de nuevo cada vez que cambia (se le agrega un viaje, o se
   * cierra) — no es "se sube una vez y listo", el registro sigue vivo
   * mientras la jornada está abierta.
   */
  pendienteDeSync: boolean
}
