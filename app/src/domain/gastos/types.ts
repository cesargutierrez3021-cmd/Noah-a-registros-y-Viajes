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
 *
 * 2026-09-15, pedido explícito del usuario: agregar categorías más
 * específicas inspiradas en el catálogo de Mantenimiento ("si en
 * mantenimiento el catálogo tiene balanceo, frenos... necesito que en
 * gastos también existan esas categorías"). No se tocan las 5 categorías
 * viejas (`gasolina`/`aceite`/`llantas`/`mantenimiento`/`otro`) — ya hay
 * gastos reales guardados con esos valores, y agregar categorías nunca
 * puede romper ni desordenar lo que ya existe (D-16, push-only).
 */

export type CategoriaGasto =
  | 'gasolina'
  | 'aceite'
  | 'llantas'
  | 'mantenimiento'
  | 'otro'
  | 'balanceo'
  | 'pastillas_freno'
  | 'liquido_frenos'
  | 'lavado'
  | 'comida'
  | 'pinchazo'
  | 'grua'
  | 'multa'
  | 'soat'
  | 'tecnomecanica'

/**
 * `vehiculo` sigue el mismo criterio que `PlantillaItemMantenimiento.vehiculo`
 * (domain/mantenimiento/reglas.ts): 'moto' o 'carro' para una categoría
 * específica de ese vehículo, 'ambos' para una que aplica a cualquiera de
 * los dos (gasolina, comida, multa, SOAT... — la mayoría). SeccionGastos.tsx
 * filtra esta lista contra `useVehiculo().tipoVehiculo` igual que
 * SeccionMantenimiento.tsx filtra su catálogo: si el conductor eligió
 * 'moto', no debe ver categorías de 'carro' y viceversa; si eligió 'ambos',
 * ve las tres.
 */
export const CATEGORIAS_GASTO: { valor: CategoriaGasto; etiqueta: string; vehiculo: 'moto' | 'carro' | 'ambos' }[] = [
  { valor: 'gasolina', etiqueta: 'Gasolina', vehiculo: 'ambos' },
  { valor: 'aceite', etiqueta: 'Cambio de aceite', vehiculo: 'ambos' },
  { valor: 'llantas', etiqueta: 'Llantas', vehiculo: 'ambos' },
  { valor: 'balanceo', etiqueta: 'Balanceo', vehiculo: 'moto' },
  { valor: 'pastillas_freno', etiqueta: 'Cambio de pastillas de freno', vehiculo: 'ambos' },
  { valor: 'liquido_frenos', etiqueta: 'Líquido de frenos', vehiculo: 'ambos' },
  { valor: 'pinchazo', etiqueta: 'Pinchazo / desvare', vehiculo: 'ambos' },
  { valor: 'lavado', etiqueta: 'Lavado', vehiculo: 'ambos' },
  { valor: 'grua', etiqueta: 'Grúa', vehiculo: 'ambos' },
  { valor: 'multa', etiqueta: 'Multa', vehiculo: 'ambos' },
  { valor: 'soat', etiqueta: 'SOAT', vehiculo: 'ambos' },
  { valor: 'tecnomecanica', etiqueta: 'Tecnomecánica', vehiculo: 'ambos' },
  { valor: 'comida', etiqueta: 'Comida', vehiculo: 'ambos' },
  { valor: 'mantenimiento', etiqueta: 'Mantenimiento (otro)', vehiculo: 'ambos' },
  { valor: 'otro', etiqueta: 'Otro', vehiculo: 'ambos' },
]

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
