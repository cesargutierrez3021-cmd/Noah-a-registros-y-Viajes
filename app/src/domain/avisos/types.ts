/**
 * Dominio: Avisos (2026-09-15, pedido explícito del usuario: "notificaciones
 * de cuando las deudas se vayan a vencer, los gastos fijos de la casa
 * también, cuando los mantenimientos se vayan a vencer... el recordatorio
 * tiene que aparecerme como un mensajito en la parte de arriba... en todas
 * las pantallas").
 *
 * Sin store ni repository propios a propósito (D-10, mismo criterio que
 * domain/balance): un aviso no es un dato que se guarde — es el cruce, en
 * el momento, de mantenimiento/deudas/hogar. `calculos.ts` son funciones
 * puras que ya reciben esos 3 arrays cargados por sus propios stores.
 */
export type TipoAviso = 'mantenimiento' | 'deuda' | 'hogar'
export type SeveridadAviso = 'vencido' | 'proximo'

export interface Aviso {
  /** Estable entre recálculos (mismo item = mismo id) — lo usa notificador.ts para no repetir una notificación ya mandada. */
  id: string
  tipo: TipoAviso
  severidad: SeveridadAviso
  titulo: string
  detalle: string
}
