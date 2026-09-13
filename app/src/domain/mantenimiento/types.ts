/**
 * Dominio: Mantenimiento
 *
 * Única fuente de verdad para "qué mantenimientos existen y cuándo tocan".
 * Este dominio NO recalcula kilómetros — los recibe como dato de entrada
 * (siempre viene de domain/viajes, ver PLAN-MAESTRO tabla "única fuente de
 * verdad"). Tampoco decide si el usuario puede usar esta función: eso es de
 * planes/permisos (Fase 11/12), fuera de alcance aquí.
 */

export type OrigenItemMantenimiento = 'predefinido' | 'personalizado'

/**
 * Cómo se dispara la alerta de un ítem:
 * - 'km'         → solo por kilometraje.
 * - 'dias'       → solo por tiempo.
 * - 'km_o_dias'  → lo que pase primero (patrón típico: aceite, llantas).
 */
export type CriterioIntervalo = 'km' | 'dias' | 'km_o_dias'

export interface ItemMantenimiento {
  id: string
  nombre: string
  origen: OrigenItemMantenimiento
  criterio: CriterioIntervalo
  /** Cada cuántos km toca, o null si el criterio no usa km. */
  intervaloKm: number | null
  /** Cada cuántos días toca, o null si el criterio no usa días. */
  intervaloDias: number | null
  /** Km del vehículo (según domain/viajes) en el último mantenimiento realizado, o al crear el ítem si nunca se ha hecho. */
  ultimoKm: number
  /** Fecha del último mantenimiento realizado, o de creación del ítem si nunca se ha hecho. */
  ultimaFechaISO: string
}

/** Plantilla de catálogo — no tiene id ni "último" todavía, eso se genera al agregarla. */
export interface PlantillaItemMantenimiento {
  nombre: string
  criterio: CriterioIntervalo
  intervaloKm: number | null
  intervaloDias: number | null
}

/** Registro histórico de una vez que se realizó un mantenimiento. */
export interface RegistroMantenimiento {
  id: string
  itemId: string
  fechaISO: string
  km: number
  costo: number | null
  notas: string | null
  /**
   * Fase 13 (continuación): solo los registros se sincronizan, no
   * `ItemMantenimiento` — un registro nunca se edita ni se borra una vez
   * creado (a diferencia de un ítem), así que encaja sin problema en el
   * diseño push-only con upsert por id (D-16). Ver el comentario del modelo
   * `RegistroMantenimiento` en server/prisma/schema.prisma para el porqué
   * completo de por qué los ítems quedan afuera.
   */
  pendienteDeSync: boolean
}

export interface EstadoAlerta {
  item: ItemMantenimiento
  /** null si el ítem no usa km. Negativo o cero = vencido por km. */
  kmFaltantes: number | null
  /** null si el ítem no usa días. Negativo o cero = vencido por tiempo. */
  diasFaltantes: number | null
  vencido: boolean
  /** Vencido pronto (dentro del margen de aviso) pero todavía no vencido. */
  proximoAVencer: boolean
}
