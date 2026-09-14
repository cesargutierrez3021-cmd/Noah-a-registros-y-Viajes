import type { Viaje } from '../viajes/types'
import type { Jornada } from '../jornada/types'
import type { Gasto } from '../gastos/types'
import type {
  CostoPorKm,
  DesglosePor,
  PuntoPeriodo,
  RentabilidadPorHora,
  ResumenViajes,
  TiempoJornada,
  UnidadPeriodo,
} from './types'

const SIN_ZONA = 'Sin zona detectada'

/** Solo viajes cerrados cuentan para estadísticas — uno "en_curso" todavía no tiene cifras finales. */
function soloFinalizados(viajes: Viaje[]): Viaje[] {
  return viajes.filter((v) => v.estado === 'finalizado')
}

export function calcularResumen(viajes: Viaje[]): ResumenViajes {
  const finalizados = soloFinalizados(viajes)
  const cantidadViajes = finalizados.length
  const kmTotales = finalizados.reduce((acc, v) => acc + v.distancia.kmTotalesReales, 0)
  const ingresos = finalizados.reduce((acc, v) => acc + v.ingreso, 0)
  return {
    cantidadViajes,
    kmTotales,
    ingresos,
    ingresoPromedioPorViaje: cantidadViajes === 0 ? 0 : ingresos / cantidadViajes,
  }
}

function claveDia(fechaISO: string): string {
  return fechaISO.slice(0, 10) // YYYY-MM-DD
}

function claveMes(fechaISO: string): string {
  return fechaISO.slice(0, 7) // YYYY-MM
}

/** Semana ISO-8601 (lunes a domingo), formato '2026-W37'. */
function claveSemana(fechaISO: string): string {
  const fecha = new Date(fechaISO)
  const copia = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()))
  const diaSemanaISO = copia.getUTCDay() || 7
  copia.setUTCDate(copia.getUTCDate() + 4 - diaSemanaISO)
  const inicioAño = new Date(Date.UTC(copia.getUTCFullYear(), 0, 1))
  const numeroSemana = Math.ceil(((copia.getTime() - inicioAño.getTime()) / 86400000 + 1) / 7)
  return `${copia.getUTCFullYear()}-W${String(numeroSemana).padStart(2, '0')}`
}

function claveDePeriodo(fechaISO: string, unidad: UnidadPeriodo): string {
  if (unidad === 'dia') return claveDia(fechaISO)
  if (unidad === 'semana') return claveSemana(fechaISO)
  return claveMes(fechaISO)
}

/** Agrupa por día, semana o mes, usando la fecha de inicio del viaje. Orden: más reciente primero. */
export function agruparPorPeriodo(viajes: Viaje[], unidad: UnidadPeriodo): PuntoPeriodo[] {
  const finalizados = soloFinalizados(viajes)
  const grupos = new Map<string, Viaje[]>()

  for (const viaje of finalizados) {
    const clave = claveDePeriodo(viaje.inicioISO, unidad)
    const lista = grupos.get(clave) ?? []
    lista.push(viaje)
    grupos.set(clave, lista)
  }

  return Array.from(grupos.entries())
    .map(([clave, viajesDelPeriodo]) => ({ clave, resumen: calcularResumen(viajesDelPeriodo) }))
    .sort((a, b) => b.clave.localeCompare(a.clave))
}

export function desglosePorPlataforma(viajes: Viaje[]): DesglosePor<string>[] {
  const finalizados = soloFinalizados(viajes)
  const grupos = new Map<string, Viaje[]>()

  for (const viaje of finalizados) {
    const lista = grupos.get(viaje.plataforma) ?? []
    lista.push(viaje)
    grupos.set(viaje.plataforma, lista)
  }

  return Array.from(grupos.entries())
    .map(([clave, viajesDeLaPlataforma]) => ({ clave, resumen: calcularResumen(viajesDeLaPlataforma) }))
    .sort((a, b) => b.resumen.ingresos - a.resumen.ingresos)
}

/** Desglose por localidad de Bogotá (domain/viajes/zonasBogota.ts). Viajes sin zona detectada se agrupan aparte. */
export function desglosePorZona(viajes: Viaje[]): DesglosePor<string>[] {
  const finalizados = soloFinalizados(viajes)
  const grupos = new Map<string, Viaje[]>()

  for (const viaje of finalizados) {
    const clave = viaje.zona ?? SIN_ZONA
    const lista = grupos.get(clave) ?? []
    lista.push(viaje)
    grupos.set(clave, lista)
  }

  return Array.from(grupos.entries())
    .map(([clave, viajesDeLaZona]) => ({ clave, resumen: calcularResumen(viajesDeLaZona) }))
    .sort((a, b) => b.resumen.ingresos - a.resumen.ingresos)
}

const UNA_HORA_MS = 3_600_000

/**
 * Bloque 2, ítem 3. Cruza `Jornada` (domain/jornada) con `Viaje[]` (domain/viajes)
 * — sigue siendo una función pura: recibe ambos como parámetros, no importa
 * ningún store (D-10: la coordinación entre dominios pasa por la capa de
 * orquestación que llama a esto, nunca dentro de un store).
 *
 * Si la jornada sigue abierta (`finISO === null`), usa el momento actual como
 * fin provisional — así el tiempo muerto/trabajado se puede mostrar EN VIVO
 * mientras el conductor sigue de turno, no solo después de cerrar.
 */
export function calcularTiempoJornada(jornada: Jornada, viajes: Viaje[]): TiempoJornada {
  const inicioMs = new Date(jornada.inicioISO).getTime()
  const finMs = jornada.finISO ? new Date(jornada.finISO).getTime() : Date.now()
  const tiempoTotalMs = Math.max(0, finMs - inicioMs)

  const viajesDeLaJornada = viajes.filter(
    (v) => jornada.viajesIds.includes(v.id) && v.estado === 'finalizado' && v.finISO,
  )
  const tiempoTrabajadoMs = viajesDeLaJornada.reduce((acc, v) => {
    const duracion = new Date(v.finISO as string).getTime() - new Date(v.inicioISO).getTime()
    return acc + Math.max(0, duracion)
  }, 0)

  // Math.min acá, no solo el Math.max de cada sumando: un viaje manual (Bloque
  // 2, ítem 4) pudo cargarse con una duración que en teoría se solapa o excede
  // el tiempo total de la jornada (el conductor tipeó mal una hora) — mejor
  // mostrar "tiempo muerto: 0" que un número negativo sin sentido.
  const tiempoMuertoMs = Math.max(0, tiempoTotalMs - Math.min(tiempoTotalMs, tiempoTrabajadoMs))

  return { tiempoTotalMs, tiempoTrabajadoMs, tiempoMuertoMs }
}

/**
 * Bloque 2, ítem 3. Reutiliza `calcularTiempoJornada` (D-18: no duplicar un
 * cálculo que ya existe) para las horas, y suma el ingreso de los mismos
 * viajes finalizados de la jornada.
 */
export function calcularRentabilidadPorHora(jornada: Jornada, viajes: Viaje[]): RentabilidadPorHora {
  const tiempo = calcularTiempoJornada(jornada, viajes)

  const ingresos = viajes
    .filter((v) => jornada.viajesIds.includes(v.id) && v.estado === 'finalizado')
    .reduce((acc, v) => acc + v.ingreso, 0)

  const horasTrabajadas = tiempo.tiempoTrabajadoMs / UNA_HORA_MS
  const horasTotales = tiempo.tiempoTotalMs / UNA_HORA_MS

  return {
    ingresoPorHoraTrabajada: horasTrabajadas === 0 ? 0 : ingresos / horasTrabajadas,
    ingresoPorHoraConEspera: horasTotales === 0 ? 0 : ingresos / horasTotales,
  }
}

/**
 * Bloque 4 — costo por km en un rango de fechas [desdeISO, hastaISO). Recibe
 * los gastos y los viajes ya filtrados/agregados por quien llama (capa de
 * orquestación) o el rango crudo — acá se filtran ambos contra el mismo
 * rango para no depender de que quien llama haya filtrado igual las dos
 * listas.
 */
export function calcularCostoPorKm(gastos: Gasto[], viajes: Viaje[], desdeISO: string, hastaISO: string): CostoPorKm {
  const gastoTotal = gastos
    .filter((g) => g.fechaISO >= desdeISO && g.fechaISO < hastaISO)
    .reduce((acc, g) => acc + g.monto, 0)

  const kmTotales = soloFinalizados(viajes)
    .filter((v) => v.inicioISO >= desdeISO && v.inicioISO < hastaISO)
    .reduce((acc, v) => acc + v.distancia.kmTotalesReales, 0)

  return { gastoTotal, kmTotales, costoPorKm: kmTotales === 0 ? null : gastoTotal / kmTotales }
}
