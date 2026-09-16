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

export interface MetaAhorro {
  id: string
  nombre: string
  montoObjetivo: number
  /** Sube con cada abono (ver `store.ts`, función `abonar`). >= montoObjetivo = meta cumplida. */
  saldoActual: number
  /**
   * 2026-09-16, pedido explícito del usuario ("la meta diaria se tiene que
   * definir sobre... el ahorro"): cuánto quiere aportar el conductor a esta
   * meta cada mes — un objetivo de PLANEACIÓN para prorratear
   * domain/metaDiaria, no un abono real (esos siguen siendo `AbonoAhorro`,
   * cargados a mano igual que siempre). `null` = esta meta no cuenta en la
   * meta diaria (mismo criterio opcional que `Deuda.cuotaProgramada`).
   */
  aporteMensualObjetivo: number | null
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
