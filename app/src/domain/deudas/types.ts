/**
 * Dominio: Deudas.
 *
 * Una deuda tiene un saldo que BAJA con cada abono (pago) — a diferencia de
 * Gasto/RegistroMantenimiento (append-only), acá la entidad principal es
 * MUTABLE. Mismo criterio que Jornada (domain/jornada): se sincroniza vía
 * upsert por id, actualizándose en el lugar en cada abono, nunca se borra.
 * No tiene `eliminarDeuda` a propósito — ver el comentario en `pendienteDeSync`
 * más abajo sobre por qué.
 */

export type FrecuenciaCuota = 'semanal' | 'quincenal' | 'mensual'

export interface CuotaProgramada {
  monto: number
  frecuencia: FrecuenciaCuota
  /**
   * 2026-09-16, pedido explícito del usuario: "cuando le pongo cuota
   * semanal o quincenal o mensual, no hay una fecha para solucionar...
   * ¿cómo vas a ver qué día es la cuota?" — sin esto, `proximaFechaCuotaDeuda`
   * (domain/avisos/calculos.ts) solo podía APROXIMAR contando intervalos de
   * calendario desde que se cargó la deuda, un día que no significa nada
   * real para el conductor. Ahora el conductor elige el ancla real —
   * SOLO el campo que corresponde a `frecuencia` se usa, los otros dos
   * quedan en `null`:
   * - mensual   → `diaDelMes` (1-31, mismo patrón que ConceptoFijo.diaDelMes)
   * - quincenal → `diasDelMes`, DOS días del mes — "cada quincena no es
   *   siempre igual para todo el mundo" (palabras del usuario)
   * - semanal   → `diaDeLaSemana` (0=domingo..6=sábado, igual que Date.getDay())
   * Opcionales (no `| null` sin `?`) para no romper deudas ya sincronizadas
   * antes de este campo (D-16) — sin ancla puesta, cae de vuelta a la
   * aproximación vieja.
   */
  diaDelMes?: number | null
  diasDelMes?: [number, number] | null
  diaDeLaSemana?: number | null
}

export interface Deuda {
  id: string
  nombre: string
  saldoInicial: number
  /** Baja con cada abono (ver `store.ts`, función `abonar`). <= 0 = pagada. */
  saldoActual: number
  /** Cuota recurrente esperada (para mostrar "te toca pagar X cada Y"), opcional — no genera abonos solo, el usuario los carga a mano. */
  cuotaProgramada: CuotaProgramada | null
  /**
   * 2026-09-15, pedido explícito del usuario: "hay que ponerle fecha límite...
   * si no, ¿cómo me va a emitir la alerta de cuándo se va a vencer si no
   * tiene fecha límite?" — antes la única forma de generar un aviso de
   * vencimiento (domain/avisos/calculos.ts) era proyectar una fecha a partir
   * de `creadaEnISO` + `cuotaProgramada.frecuencia`, una aproximación honesta
   * pero que dejaba SIN ningún aviso a cualquier deuda sin cuota programada
   * (el checkbox "tiene cuota fija" es opcional). Esta es una fecha real que
   * el conductor pone a mano y puede actualizar cuando quiera (ver
   * `store.ts`, `actualizarFechaLimite`) — null = sin fecha puesta todavía,
   * sin aviso (mismo comportamiento que antes para esas deudas).
   */
  fechaLimiteISO: string | null
  creadaEnISO: string
  /**
   * Deuda es mutable (`saldoActual` cambia) pero deliberadamente no se puede
   * BORRAR desde el cliente — mismo problema que `ItemMantenimiento`
   * (domain/mantenimiento/types.ts): el diseño de sync push-only con upsert
   * (D-16) no tiene forma de propagar un borrado al backend. A diferencia de
   * un ítem de mantenimiento, sí conviene sincronizar la deuda en sí (no solo
   * su historial de abonos) porque el saldo actual es el dato que el usuario
   * más necesita ver actualizado — por eso, en vez de no sincronizarla, se
   * sincroniza pero SIN soporte de borrado. Si hace falta poder eliminar una
   * deuda cargada por error, hay que resolver antes ese diseño (igual que
   * con los ítems de mantenimiento) — no agregar `eliminarDeuda` sin eso.
   */
  pendienteDeSync: boolean
}

/** Registro histórico de un abono. Igual patrón que RegistroMantenimiento/Gasto: nunca se edita ni se borra una vez creado. */
export interface AbonoDeuda {
  id: string
  deudaId: string
  monto: number
  fechaISO: string
  pendienteDeSync: boolean
}
