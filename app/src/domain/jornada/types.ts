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
}
