/**
 * Dominio: Meta diaria (2026-09-16, pedido explícito del usuario).
 *
 * "Necesito que haya una barrita que me muestre el porcentaje de lo que
 * llevo de mi meta diaria — la meta se tiene que definir automáticamente
 * sobre los gastos del hogar, las deudas, el ahorro y los gastos de
 * mantenimiento... y si un día no se cubre, al otro día ese faltante se
 * tiene que ir reajustando." Este dominio NO tiene su propia entidad
 * persistida grande — es puro cálculo (`calculos.ts`, D-10) que cruza
 * domain/hogar + domain/deudas + domain/ahorro + domain/mantenimiento +
 * domain/viajes, más UN dato propio: el presupuesto aproximado de gasolina
 * mensual (`ConfigMetaDiaria`, ver store.ts) — el único insumo de la meta
 * que no tiene ya un lugar natural en otro dominio (no es un gasto real
 * cargado, es una proyección "cuánto me gasto más o menos al mes").
 */

/** Desglose de a qué corresponde cada peso de la meta base diaria — solo informativo, para mostrarle al conductor de dónde sale el número. */
export interface DesgloseMetaBaseDiaria {
  hogar: number
  deudas: number
  ahorro: number
  mantenimiento: number
  gasolina: number
  total: number
}

export interface ResultadoMetaDiaria {
  /** Lo que "debería" costar cubrir un día normal, sin arrastre de días anteriores. */
  metaBase: number
  /** Lo que quedó sin cubrir en los últimos días (ventana de 30 días, ver calculos.ts) — se le suma a la meta base de hoy. */
  deficitAcumulado: number
  /** metaBase + deficitAcumulado — el número real contra el que se mide el día de hoy. */
  metaDeHoy: number
  ingresoHoy: number
  /** 0-100, ya recortado. Si metaDeHoy es 0 (sin meta configurada todavía), se muestra 100 — no hay nada que cubrir. */
  progresoPorcentaje: number
  cubierta: boolean
}
