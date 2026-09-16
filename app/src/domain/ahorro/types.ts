/**
 * Dominio: Ahorro.
 *
 * Mismo patrón exacto que domain/deudas (types.ts), invertido: una meta tiene
 * un saldo que SUBE con cada abono, y nunca pasa de `montoObjetivo` (mismo
 * criterio con el que Deuda nunca baja de 0 — ver store.ts, función `abonar`).
 * 2026-09-15, pedido explícito del usuario: "Ahorro" estaba mencionado desde
 * el diseño de paneles (Panel "Casa y Deudas" = Hogar/Deudas/Ahorro) pero
 * nunca se había construido — ver el comentario que quedó en
 * CasaYDeudasScreen.tsx antes de este cambio.
 */

import type { FrecuenciaCuota } from '../deudas/types'

/**
 * 2026-09-16, corrección de un bug real reportado por el usuario ("si pongo
 * que voy a poner semanalmente X valor, tiene que coger ese valor
 * semanalmente, las semanas que alcancen en el mes"): antes esto era un
 * solo número fijo ya asumido mensual (`aporteMensualObjetivo`) — no
 * dejaba decir "ahorro $50.000 por SEMANA" y que la meta diaria contara las
 * semanas reales del mes. Mismo patrón que `CuotaProgramada` (domain/deudas),
 * reusando el mismo tipo `FrecuenciaCuota` (D-18) — sin ancla de día
 * (semana/quincena/mes) a propósito: acá no hace falta un día exacto para
 * avisos, solo contar cuántas veces cae la frecuencia en el mes (ver
 * domain/metaDiaria/calculos.ts, `ocurrenciasFrecuenciaEnMes`).
 */
export interface AportePlaneado {
  monto: number
  frecuencia: FrecuenciaCuota
}

export interface MetaAhorro {
  id: string
  nombre: string
  montoObjetivo: number
  /** Sube con cada abono (ver `store.ts`, función `abonar`). >= montoObjetivo = meta cumplida. */
  saldoActual: number
  /**
   * 2026-09-15, pedido explícito del usuario ("la meta diaria se tiene que
   * definir sobre... el ahorro"): cuánto quiere aportar el conductor a esta
   * meta y con qué frecuencia — un objetivo de PLANEACIÓN para prorratear
   * domain/metaDiaria, no un abono real (esos siguen siendo `AbonoAhorro`,
   * cargados a mano igual que siempre). `null` = esta meta no cuenta en la
   * meta diaria (mismo criterio opcional que `Deuda.cuotaProgramada`).
   */
  aportePlaneado: AportePlaneado | null
  creadaEnISO: string
  /**
   * Igual que Deuda: mutable (`saldoActual` cambia) pero deliberadamente sin
   * `eliminarMeta` — el diseño de sync push-only con upsert (D-16) no tiene
   * forma de propagar un borrado al backend. Si hace falta poder eliminar una
   * meta cargada por error, hay que resolver antes ese diseño (mismo
   * razonamiento que Deuda/ItemMantenimiento).
   */
  pendienteDeSync: boolean
}

/** Registro histórico de un abono a una meta. Igual patrón que AbonoDeuda: nunca se edita ni se borra una vez creado. */
export interface AbonoAhorro {
  id: string
  metaId: string
  monto: number
  fechaISO: string
  pendienteDeSync: boolean
}
