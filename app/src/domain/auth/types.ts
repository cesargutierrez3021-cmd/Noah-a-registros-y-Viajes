/**
 * Dominio: Auth (Fase 7, lado cliente — hasta esta sesión solo existía del
 * lado del backend, ver PLAN-MAESTRO "Estado real de Fase 7", pendiente #4).
 * Sin repository.ts a propósito: la sesión no es un dato de dominio que se
 * sincronice como viajes/mantenimiento — es el token con el que se habla con
 * el backend, y ESE ya lo guarda `lib/api.ts` (localStorage). Este dominio
 * solo agrega el estado de "quién soy" (`Usuario`) encima de eso.
 */

export interface Usuario {
  id: string
  email: string
  creadoEnISO: string
}
