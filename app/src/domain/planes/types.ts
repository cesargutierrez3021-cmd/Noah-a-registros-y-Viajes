/**
 * Dominio: Planes (Fase 11, lado cliente). Sin repository.ts: el plan actual
 * lo decide el backend (es la fuente de verdad de qué pagó el usuario), no
 * tiene sentido cachearlo localmente como si fuera un dato propio del
 * conductor (viajes, mantenimiento).
 */
export interface Plan {
  clave: string
  nombre: string
  limiteConsultasIA: number | null
}
