/**
 * Dominio: Bonos.
 *
 * 2026-09-17, pedido explícito del usuario: un bono de plataforma (ej. Uber/
 * DiDi por cumplir X viajes en la semana) — plata que entra pero NO es un
 * viaje (sin km, sin plataforma, sin GPS). Mismo patrón append-only que
 * Gasto (domain/gastos/types.ts): nunca se edita ni se borra una vez
 * creado. A propósito solo tiene `monto` — el usuario pidió que cargarlo
 * sea sin fricción ("solo el monto"), sin categoría ni plataforma.
 *
 * Solo cuenta en `ingresos` (domain/estadisticas/calculos.ts,
 * `calcularResumen`) — nunca en `cantidadViajes` ni en
 * `ingresoPromedioPorViaje`, un bono no es un viaje.
 */
export interface Bono {
  id: string
  monto: number
  fechaISO: string
  pendienteDeSync: boolean
}
