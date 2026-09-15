import { useEffect, useState } from 'react'
import { useViajes } from '../../domain/viajes/store'
import { agruparPorPeriodo, calcularResumen, desglosePorPlataforma, desglosePorZona, desglosePorFranjaHoraria } from '../../domain/estadisticas/calculos'
import type { UnidadPeriodo } from '../../domain/estadisticas/types'

const ETIQUETAS_UNIDAD: Record<UnidadPeriodo, string> = { dia: 'Día', semana: 'Semana', mes: 'Mes' }

function formatoMoneda(valor: number): string {
  return `$${Math.round(valor).toLocaleString('es-CO')}`
}

export function SeccionEstadisticas() {
  const { viajes, cargar } = useViajes()
  const [unidad, setUnidad] = useState<UnidadPeriodo>('dia')

  useEffect(() => {
    void cargar()
  }, [cargar])

  const resumenGeneral = calcularResumen(viajes)
  const porPeriodo = agruparPorPeriodo(viajes, unidad)
  const porPlataforma = desglosePorPlataforma(viajes)
  const porZona = desglosePorZona(viajes)
  const porFranja = desglosePorFranjaHoraria(viajes)

  return (
    <div id="seccion-estadisticas">
      <h2 className="tt-titulo-seccion">Estadísticas</h2>

      <div className="tarjeta-viaje" style={{ marginBottom: 16, flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
        <span className="texto-mute">Total histórico</span>
        <span>{resumenGeneral.cantidadViajes} viajes · {resumenGeneral.kmTotales.toFixed(1)} km reales</span>
        <span>Ingresos: {formatoMoneda(resumenGeneral.ingresos)} · Promedio/viaje: {formatoMoneda(resumenGeneral.ingresoPromedioPorViaje)}</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(Object.keys(ETIQUETAS_UNIDAD) as UnidadPeriodo[]).map((u) => (
          <button key={u} type="button" onClick={() => setUnidad(u)} disabled={u === unidad}>
            {ETIQUETAS_UNIDAD[u]}
          </button>
        ))}
      </div>

      {porPeriodo.length === 0 ? (
        <p className="texto-mute" style={{ marginBottom: 16 }}>Sin viajes finalizados todavía.</p>
      ) : (
        <ul className="lista-viajes" style={{ marginBottom: 16, maxHeight: 200, overflowY: 'auto' }}>
          {porPeriodo.map(({ clave, resumen }) => (
            <li key={clave} className="tarjeta-viaje">
              <span>{clave}</span>
              <span>{resumen.cantidadViajes} viajes · {resumen.kmTotales.toFixed(0)} km</span>
              <span>{formatoMoneda(resumen.ingresos)}</span>
            </li>
          ))}
        </ul>
      )}

      {porPlataforma.length > 0 && (
        <>
          <h3 className="texto-mute">Por plataforma</h3>
          <ul className="lista-viajes" style={{ marginBottom: 16 }}>
            {porPlataforma.map(({ clave, resumen }) => (
              <li key={clave} className="tarjeta-viaje">
                <span>{clave}</span>
                <span>{resumen.cantidadViajes} viajes</span>
                <span>{formatoMoneda(resumen.ingresos)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {porZona.length > 0 && (
        <>
          <h3 className="texto-mute">Por zona donde recoges (Bogotá)</h3>
          <ul className="lista-viajes" style={{ marginBottom: 16 }}>
            {porZona.map(({ clave, resumen }) => (
              <li key={clave} className="tarjeta-viaje">
                <span>{clave}</span>
                <span>{resumen.cantidadViajes} viajes</span>
                <span>{formatoMoneda(resumen.ingresos)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {porFranja.length > 0 && (
        <>
          <h3 className="texto-mute">Por franja horaria</h3>
          <p className="texto-mute" style={{ fontSize: '0.8rem', marginBottom: 8 }}>
            Mañana 5-12 · Mediodía 12-14 · Tarde 14-19 · Noche 19-5 — según la hora en que recoges, no en la que cierras.
          </p>
          <ul className="lista-viajes" style={{ marginBottom: 24 }}>
            {porFranja.map(({ clave, resumen }) => (
              <li key={clave} className="tarjeta-viaje">
                <span style={{ textTransform: 'capitalize' }}>{clave}</span>
                <span>{resumen.cantidadViajes} viajes</span>
                <span>{formatoMoneda(resumen.ingresos)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
