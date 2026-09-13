import type { Viaje } from '../viajes/types'
import type { DesglosePor, PuntoPeriodo, ResumenViajes, UnidadPeriodo } from './types'

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
