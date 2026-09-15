import { useEffect, useState } from 'react'
import { useViajes } from '../../domain/viajes/store'
import { agruparPorPeriodo, calcularResumen, desglosePorPlataforma, desglosePorZona, desglosePorFranjaHoraria } from '../../domain/estadisticas/calculos'
import type { ResumenViajes, UnidadPeriodo } from '../../domain/estadisticas/types'
import { AnilloMeta } from '../../components/graficos/AnilloMeta'
import { useTema } from '../../domain/tema/store'

const ETIQUETAS_UNIDAD: Record<UnidadPeriodo, string> = { dia: 'Día', semana: 'Semana', mes: 'Mes' }

function formatoMoneda(valor: number): string {
  return `$${Math.round(valor).toLocaleString('es-CO')}`
}

/**
 * 2026-09-15, pedido explícito del usuario ("te inventaste una que parece
 * de niño de 5 años... quiero que sean iguales así de movimiento"): las
 * listas planas de acá se reemplazan por anillos orbitales (AnilloMeta,
 * ver components/graficos/), cada uno con movimiento real, mostrando el %
 * de ingresos que representa cada entrada dentro de su propio desglose.
 *
 * Colores: "Por franja horaria" es SIEMPRE el mismo set fijo de 4
 * categorías (mañana/mediodía/tarde/noche) — mismo caso que Balance, se
 * reusa el mismo orden validado con la skill dataviz (azul/naranja/aqua/
 * amarillo, ver components/graficos/GraficoDistribucion.tsx). "Por plataforma" y "Por zona" NO son
 * un set fijo (el conductor puede trabajar 2 plataformas o 15 zonas
 * distintas) — ahí un color por entrada dejaría de ser seguro contra
 * daltonismo apenas hay más de 3-4 al mismo tiempo (ver el propio validador
 * de la skill: "todos contra todos" no pasa con más de 3 tonos). Por eso
 * usan un solo color (el acento del tema activo) para todas: la identidad
 * la lleva la etiqueta de texto, no el color — nunca fue una decisión al
 * azar, es la misma regla que ya se siguió en Balance.
 */
const COLORES_FRANJA: Record<string, string> = { mañana: '#3987e5', mediodía: '#d95926', tarde: '#199e70', noche: '#c98500' }
const TOPE_ANILLOS = 5

function porcentajesDeIngresos(items: { clave: string; resumen: ResumenViajes }[]): { clave: string; resumen: ResumenViajes; porcentaje: number }[] {
  const total = items.reduce((acc, i) => acc + i.resumen.ingresos, 0)
  return items.map((i) => ({ ...i, porcentaje: total > 0 ? (i.resumen.ingresos / total) * 100 : 0 }))
}

export function SeccionEstadisticas() {
  const { viajes, cargar } = useViajes()
  const { tema } = useTema()
  const animado = tema !== 'papel'
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
          <p className="texto-mute" style={{ fontSize: '0.78rem', marginBottom: 8 }}>% de tus ingresos, top {Math.min(TOPE_ANILLOS, porPlataforma.length)}.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            {porcentajesDeIngresos(porPlataforma)
              .sort((a, b) => b.resumen.ingresos - a.resumen.ingresos)
              .slice(0, TOPE_ANILLOS)
              .map(({ clave, resumen, porcentaje }) => (
                <AnilloMeta
                  key={clave}
                  porcentaje={porcentaje}
                  color="var(--color-acento)"
                  valorCentral={`${Math.round(porcentaje)}%`}
                  etiqueta={clave}
                  detalle={`${resumen.cantidadViajes} viajes`}
                  tamano={84}
                  animado={animado}
                />
              ))}
          </div>
        </>
      )}

      {porZona.length > 0 && (
        <>
          <h3 className="texto-mute">Por zona donde recoges (Bogotá)</h3>
          <p className="texto-mute" style={{ fontSize: '0.78rem', marginBottom: 8 }}>% de tus ingresos, top {Math.min(TOPE_ANILLOS, porZona.length)} de {porZona.length} zonas.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            {porcentajesDeIngresos(porZona)
              .sort((a, b) => b.resumen.ingresos - a.resumen.ingresos)
              .slice(0, TOPE_ANILLOS)
              .map(({ clave, resumen, porcentaje }) => (
                <AnilloMeta
                  key={clave}
                  porcentaje={porcentaje}
                  color="var(--color-acento)"
                  valorCentral={`${Math.round(porcentaje)}%`}
                  etiqueta={clave}
                  detalle={`${resumen.cantidadViajes} viajes`}
                  tamano={84}
                  animado={animado}
                />
              ))}
          </div>
        </>
      )}

      {porFranja.length > 0 && (
        <>
          <h3 className="texto-mute">Por franja horaria</h3>
          <p className="texto-mute" style={{ fontSize: '0.78rem', marginBottom: 8 }}>
            Mañana 5-12 · Mediodía 12-14 · Tarde 14-19 · Noche 19-5 — según la hora en que recoges, no en la que cierras.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
            {porcentajesDeIngresos(porFranja).map(({ clave, resumen, porcentaje }) => (
              <AnilloMeta
                key={clave}
                porcentaje={porcentaje}
                color={COLORES_FRANJA[clave] ?? 'var(--color-acento)'}
                valorCentral={`${Math.round(porcentaje)}%`}
                etiqueta={clave}
                detalle={`${resumen.cantidadViajes} viajes`}
                animado={animado}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
