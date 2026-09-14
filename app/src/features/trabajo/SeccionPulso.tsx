import { useMemo } from 'react'
import { useViajes } from '../../domain/viajes/store'
import { useJornada } from '../../domain/jornada/store'
import { useGastos } from '../../domain/gastos/store'
import {
  agruparPorPeriodo,
  calcularCostoPorKm,
  calcularResumen,
  calcularRentabilidadPorHora,
  calcularTiempoJornada,
} from '../../domain/estadisticas/calculos'

function formatoPesos(monto: number): string {
  return `$${Math.round(monto).toLocaleString('es-CO')}`
}

function formatoHoras(ms: number): string {
  const horas = ms / 3_600_000
  return `${horas.toFixed(1)} h`
}

function limitesDeHoyISO(): { desde: string; hasta: string } {
  const ahora = new Date()
  const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  const fin = new Date(inicio)
  fin.setDate(fin.getDate() + 1)
  return { desde: inicio.toISOString(), hasta: fin.toISOString() }
}

function claveDiaDeHoy(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Bloque 4, ítem 13 — SOLO la parte de datos: neto del día, km, costo/km,
 * $/hora, y estado de la jornada. A propósito sin animación ni tema todavía
 * (eso queda para cuando se decida el diseño visual, ver PLAN-MAESTRO) —
 * hoy usa las mismas clases genéricas que el resto de la app.
 */
export function SeccionPulso() {
  const { viajes } = useViajes()
  const { jornadaAbierta } = useJornada()
  const { gastos, totalEnRango } = useGastos()

  const jornada = jornadaAbierta()

  const resumenHoy = useMemo(() => {
    const porDia = agruparPorPeriodo(viajes, 'dia')
    return porDia.find((p) => p.clave === claveDiaDeHoy())?.resumen ?? calcularResumen([])
  }, [viajes])

  const gastoHoy = useMemo(() => {
    const { desde, hasta } = limitesDeHoyISO()
    return totalEnRango(desde, hasta)
  }, [totalEnRango, gastos])

  const costoPorKmHoy = useMemo(() => {
    const { desde, hasta } = limitesDeHoyISO()
    return calcularCostoPorKm(gastos, viajes, desde, hasta)
  }, [gastos, viajes])

  const netoHoy = resumenHoy.ingresos - gastoHoy

  const tiempo = jornada ? calcularTiempoJornada(jornada, viajes) : null
  const rentabilidad = jornada ? calcularRentabilidadPorHora(jornada, viajes) : null

  return (
    <div className="tarjeta-viaje" style={{ marginBottom: 16, flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
      <span className="texto-mute">Pulso de hoy</span>
      <span>
        Neto: <strong style={{ color: netoHoy >= 0 ? '#4caf50' : '#ff6b6b' }}>{formatoPesos(netoHoy)}</strong>
        {'  ·  '}
        {resumenHoy.kmTotales.toFixed(1)} km
      </span>
      <span className="texto-mute">
        Costo/km hoy: {costoPorKmHoy.costoPorKm === null ? '— (sin km todavía)' : formatoPesos(costoPorKmHoy.costoPorKm)}
      </span>
      {jornada ? (
        <span className="texto-mute">
          Jornada abierta — {tiempo && formatoHoras(tiempo.tiempoTrabajadoMs)} trabajadas / {tiempo && formatoHoras(tiempo.tiempoMuertoMs)} muertas
          {rentabilidad && ` · ${formatoPesos(rentabilidad.ingresoPorHoraTrabajada)}/h trabajada · ${formatoPesos(rentabilidad.ingresoPorHoraConEspera)}/h con espera`}
        </span>
      ) : (
        <span className="texto-mute">Sin jornada abierta</span>
      )}
    </div>
  )
}
