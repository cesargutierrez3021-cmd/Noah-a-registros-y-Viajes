/**
 * Dominio: Estadísticas.
 *
 * A propósito NO tiene repository.ts ni store.ts propio: no es dueño de
 * ningún dato, solo deriva números a partir de otros dominios (viajes,
 * jornada, y desde Bloque 4 también gastos — ver `calcularCostoPorKm`).
 * `domain/gastos` ya existe desde Bloque 3; lo único que faltaba era esta
 * función que cruza ambos, y es SOLO esta: nunca se decide acá cuánto costó
 * ni cuándo toca un mantenimiento — eso sigue siendo de `domain/gastos` y
 * `domain/mantenimiento` respectivamente.
 */

export type UnidadPeriodo = 'dia' | 'semana' | 'mes'

/**
 * 2026-09-15, pedido explícito del usuario: saber en qué franja del día le
 * va mejor. Cuatro cortes fijos (no configurables todavía — D-18, no
 * construir sin necesidad confirmada).
 *
 * 2026-09-17 (misma sesión, corrección posterior): el usuario redefinió los
 * 4 cortes con sus propias palabras — "el primer horario va a ser de 4 de
 * la mañana a 11 y media de la mañana, el segundo de 11 y media a 3 de la
 * tarde, el otro de 3 de la tarde a 8 de la noche, y el otro de 8 de la
 * noche a 4 de la mañana": mañana 4:00-11:30, mediodía 11:30-15:00, tarde
 * 15:00-20:00, noche 20:00-4:00 (cruza medianoche). Los 4 NOMBRES se
 * mantienen igual (el usuario no pidió renombrarlos, solo mover los
 * cortes) — ver `franjaHoraria()` en calculos.ts.
 */
export type FranjaHoraria = 'mañana' | 'mediodía' | 'tarde' | 'noche'

export interface ResumenViajes {
  cantidadViajes: number
  kmTotales: number
  ingresos: number
  ingresoPromedioPorViaje: number
}

export interface PuntoPeriodo {
  /** Clave del periodo, ej. '2026-09-13' (día), '2026-W37' (semana ISO), '2026-09' (mes). */
  clave: string
  resumen: ResumenViajes
}

export interface DesglosePor<TClave extends string> {
  clave: TClave
  resumen: ResumenViajes
}

/**
 * Bloque 2, ítem 3 — tiempo de una jornada, desglosado en trabajado vs. muerto.
 * "Trabajado" = suma de la duración de los viajes finalizados de esa jornada
 * (desde que arranca hasta que cierra cada viaje, GPS real). "Muerto" = todo
 * el resto del tiempo transcurrido de la jornada — esperando el próximo viaje,
 * en tráfico entre carreras, etc. Nunca negativo por construcción (ver
 * calcularTiempoJornada).
 */
export interface TiempoJornada {
  tiempoTotalMs: number
  tiempoTrabajadoMs: number
  tiempoMuertoMs: number
}

/** Ingreso por hora, en dos versiones — ver calcularRentabilidadPorHora. */
export interface RentabilidadPorHora {
  /** Solo cuenta las horas con pasajero/en viaje activo — la tarifa "real" de manejar. */
  ingresoPorHoraTrabajada: number
  /** Cuenta TODA la jornada, incluida la espera — la tarifa real de todo el turno. */
  ingresoPorHoraConEspera: number
}

/**
 * Bloque 4 — cruce de `domain/gastos` (plata gastada) contra `domain/viajes`
 * (km recorridos) en un mismo rango de fechas. Es un número que cambia cada
 * período por diseño (ver PLAN-MAESTRO, "Por qué Mantenimiento y Gastos
 * siguen siendo DOS cosas distintas") — nunca se guarda, siempre se deriva.
 */
export interface CostoPorKm {
  gastoTotal: number
  kmTotales: number
  /** null si kmTotales es 0 — dividir por cero no es "costo cero", es "no se puede calcular todavía". */
  costoPorKm: number | null
}
