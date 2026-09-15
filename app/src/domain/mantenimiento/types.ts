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

/**
 * 2026-09-15, pedido explícito del usuario: las tarjetas ejecutivas de
 * mantenimiento (paquete "maintenance-executive-first-cards" que compartió)
 * — cada clave corresponde a una imagen en app/src/assets/mantenimiento/,
 * mapeada en features/trabajo/tarjetasMantenimiento.ts. `null` = ítem sin
 * imagen propia (ej. Batería/SOAT/Revisión técnico-mecánica, que no venían
 * en el paquete) — se muestra sin la tarjeta ejecutiva, con el estilo
 * genérico de siempre.
 */
export type ImagenMantenimiento =
  | 'cambio_de_aceite'
  | 'aceite_y_filtro'
  | 'cambio_de_llantas'
  | 'mantenimiento_general'
  | 'balanceo'
  | 'filtro_de_aire'
  | 'pastillas_de_freno'
  | 'liquido_de_frenos'
  | 'aceite_y_retenes_horquilla'
  | 'reglaje_de_valvulas'
  | 'rodamientos_de_direccion'
  | 'rodamientos_de_rueda'

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
  /** Ver el comentario de `ImagenMantenimiento` arriba. Opcional para no romper ítems ya guardados antes de este campo (quedan `undefined`, se tratan igual que `null`). */
  imagen?: ImagenMantenimiento | null
}

/**
 * Plantilla de catálogo — no tiene id ni "último" todavía, eso se genera al
 * agregarla. `intervaloKm`/`intervaloDias` acá son el valor SUGERIDO, no el
 * final — 2026-09-15, pedido explícito del usuario: "no todo el mundo tiene
 * la misma moto ni hace los mismos cambios al mismo tiempo" — el conductor
 * los edita antes de confirmar (ver features/trabajo/SeccionMantenimiento.tsx).
 */
export interface PlantillaItemMantenimiento {
  nombre: string
  criterio: CriterioIntervalo
  intervaloKm: number | null
  intervaloDias: number | null
  imagen?: ImagenMantenimiento | null
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
  /** null si el ítem no usa km. Negativo o cero = vencido por km. YA incluye el margen de seguridad (ver `MARGEN_SEGURIDAD_KM` en reglas.ts). */
  kmFaltantes: number | null
  /** null si el ítem no usa días. Negativo o cero = vencido por tiempo. */
  diasFaltantes: number | null
  vencido: boolean
  /** Vencido pronto (dentro del margen de aviso) pero todavía no vencido. */
  proximoAVencer: boolean
  /**
   * 0-100, pedido explícito del usuario ("la barra o el porcentaje que esté
   * según cómo esté la etiqueta"): cuánto se lleva consumido del intervalo,
   * usando el criterio más avanzado si el ítem es `km_o_dias` (mismo
   * criterio de "lo que pase primero" que ya usa `vencido`).
   */
  progresoPorcentaje: number
}
