/**
 * Dominio: Gastos (de jornada/operación del vehículo).
 *
 * Distinto de domain/mantenimiento (ver PLAN-MAESTRO, sección "Por qué
 * Mantenimiento y Gastos siguen siendo DOS cosas distintas"): mantenimiento
 * es un recordatorio determinístico ("cada 6.000 km toca"), esto es un
 * registro de plata gastada de verdad, que cambia cada período y sirve para
 * calcular costo por km. 'mantenimiento' existe como CATEGORÍA acá (plata
 * gastada en un mantenimiento real) sin que este dominio sepa nada de
 * `ItemMantenimiento` ni lo toque — son datos independientes que solo
 * comparten pantalla, nunca cálculo ni dominio.
 */

export type CategoriaGasto = 'gasolina' | 'aceite' | 'llantas' | 'mantenimiento' | 'otro'

export interface Gasto {
  id: string
  categoria: CategoriaGasto
  monto: number
  fechaISO: string
  /**
   * Litros cargados — solo tiene sentido para categoría 'gasolina' (permite
   * calcular rendimiento km/litro además de costo por km). `null` para
   * cualquier otra categoría; nunca 0 como "no aplica" para no confundir con
   * "cargó 0 litros".
   */
  litros: number | null
  notas: string | null
  /**
   * Igual que RegistroMantenimiento (domain/mantenimiento/types.ts): un
   * gasto nunca se edita ni se borra una vez creado — si se cargó mal, se
   * carga un gasto nuevo (a favor o en contra) en vez de tocar el original.
   * Es la misma razón por la que el diseño push-only de sync (D-16) puede
   * cubrirlo sin el problema de los `ItemMantenimiento` (que sí se editan y
   * borran, y por eso no se sincronizan). Si más adelante hace falta poder
   * corregir un gasto cargado mal, hay que resolver primero cómo se
   * propagaría ese borrado/edición al backend — no agregarlo sin ese diseño.
   */
  pendienteDeSync: boolean
}
