import { useEffect, useState } from 'react'
import { useViajes } from '../../domain/viajes/store'
import { agruparPorPeriodo, calcularResumen, desglosePorPlataforma, desglosePorZona } from '../../domain/estadisticas/calculos'
import type { UnidadPeriodo } from '../../domain/estadisticas/types'

const ETIQUETAS_UNIDAD: Record<UnidadPeriodo, string> = { dia: 'Día', semana: 'Semana', mes: 'Mes' }

function formatoMoneda(valor: number): string {
  return `$${Math.round(valor).toLocaleString('es-CO')}`
}

export function EstadisticasScreen() {
  const { viajes, cargar } = useViajes()
  const [unidad, setUnidad] = useState<UnidadPeriodo>('dia')

  useEffect(() => {
    void cargar()
  }, [cargar])

  const resumenGeneral = calcularResumen(viajes)
  const porPeriodo = agruparPorPeriodo(viajes, unidad)
  const porPlataforma = desglosePorPlataforma(viajes)
  const porZona = desglosePorZona(viajes)

  return (
    <section className="pantalla">
      <h1 className="titulo-pantalla">Estadísticas</h1>

      <div className="tarjeta-viaje" style={{ marginBottom: 16, flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
        <span className="texto-mute">Total histórico</span>
        <span>{resumenGeneral.cantidadViajes} viajes · {resumenGeneral.kmTotales.toFixed(1)} km reales</span>
        <span>Ingresos: {formatoMoneda(resumenGeneral.ingresos)} · Promedio/viaje: {formatoMoneda(resumenGeneral.ingresoPromedioPorViaje)}</span>
        <span className="texto-mute" style={{ fontSize: '0.75rem' }}>
          Gastos y ganancia neta se agregan cuando exista el módulo de gastos (todavía no construido).
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(Object.keys(ETIQUETAS_UNIDAD) as UnidadPeriodo[]).map((u) => (
          <button key={u} type="button" onClick={() => setUnidad(u)} disabled={u === unidad}>
            {ETIQUETAS_UNIDAD[u]}
          </button>
        ))}
      </div>

      <h2 className="titulo-pantalla" style={{ fontSize: '1rem' }}>Por {ETIQUETAS_UNIDAD[unidad].toLowerCase()}</h2>
      {porPeriodo.length === 0 ? (
        <p className="texto-mute" style={{ marginBottom: 16 }}>Sin viajes finalizados todavía.</p>
      ) : (
        <ul className="lista-viajes" style={{ marginBottom: 16 }}>
          {porPeriodo.map(({ clave, resumen }) => (
            <li key={clave} className="tarjeta-viaje">
              <span>{clave}</span>
              <span>{resumen.cantidadViajes} viajes · {resumen.kmTotales.toFixed(0)} km</span>
              <span>{formatoMoneda(resumen.ingresos)}</span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="titulo-pantalla" style={{ fontSize: '1rem' }}>Por plataforma</h2>
      {porPlataforma.length === 0 ? (
        <p className="texto-mute" style={{ marginBottom: 16 }}>Sin datos.</p>
      ) : (
        <ul className="lista-viajes" style={{ marginBottom: 16 }}>
          {porPlataforma.map(({ clave, resumen }) => (
            <li key={clave} className="tarjeta-viaje">
              <span>{clave}</span>
              <span>{resumen.cantidadViajes} viajes</span>
              <span>{formatoMoneda(resumen.ingresos)}</span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="titulo-pantalla" style={{ fontSize: '1rem' }}>Por zona (Bogotá)</h2>
      {porZona.length === 0 ? (
        <p className="texto-mute">Sin datos.</p>
      ) : (
        <ul className="lista-viajes">
          {porZona.map(({ clave, resumen }) => (
            <li key={clave} className="tarjeta-viaje">
              <span>{clave}</span>
              <span>{resumen.cantidadViajes} viajes</span>
              <span>{formatoMoneda(resumen.ingresos)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
