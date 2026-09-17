import { useEffect, useState } from 'react'
import { useViajes } from '../../domain/viajes/store'
import { useBonos } from '../../domain/bonos/store'
import { agruparPorPeriodo, calcularResumen, desglosePorPlataforma, desglosePorZona, desglosePorZonaFin, desglosePorFranjaHoraria, ingresoPorKm } from '../../domain/estadisticas/calculos'
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
 * "Por plataforma" y "Por zona" NO son un set fijo (el conductor puede
 * trabajar 2 plataformas o 15 zonas distintas) — ahí un color por entrada
 * dejaría de ser seguro contra daltonismo apenas hay más de 3-4 al mismo
 * tiempo (ver el propio validador de la skill: "todos contra todos" no pasa
 * con más de 3 tonos). Por eso usan un solo color (el acento del tema
 * activo) para todas: la identidad la lleva la etiqueta de texto, no el
 * color — nunca fue una decisión al azar, es la misma regla que ya se
 * siguió en Balance.
 *
 * "Por franja horaria" (2026-09-17, corrección posterior): dejó de ser un
 * grid de anillos y pasó a ser un RANKING 1-4 — pedido explícito del
 * usuario: "que me muestres cuál zona horaria es mejor... ranking del 1 al
 * 4... según los viajes, los kilómetros y el dinero hecho". Ordenado por
 * dinero total (criterio que el usuario marcó como el que define el
 * puesto); dinero por km es "una segunda puntuación que tenga relevancia"
 * (sus palabras) — se muestra junto a viajes/km, pero no reordena el
 * ranking. Ver `franjaRanking` más abajo.
 */
const TOPE_ANILLOS = 5

function porcentajesDeIngresos(items: { clave: string; resumen: ResumenViajes }[]): { clave: string; resumen: ResumenViajes; porcentaje: number }[] {
  const total = items.reduce((acc, i) => acc + i.resumen.ingresos, 0)
  return items.map((i) => ({ ...i, porcentaje: total > 0 ? (i.resumen.ingresos / total) * 100 : 0 }))
}

export function SeccionEstadisticas() {
  const { viajes, cargar } = useViajes()
  const { bonos, cargar: cargarBonos } = useBonos()
  const { tema } = useTema()
  const animado = tema !== 'papel'
  const [unidad, setUnidad] = useState<UnidadPeriodo>('dia')

  useEffect(() => {
    void cargar()
    void cargarBonos()
  }, [cargar, cargarBonos])

  const resumenGeneral = calcularResumen(viajes, bonos)
  const porPeriodo = agruparPorPeriodo(viajes, unidad, bonos)
  const porPlataforma = desglosePorPlataforma(viajes)
  const porZona = desglosePorZona(viajes)
  const porZonaFin = desglosePorZonaFin(viajes)
  const porFranja = desglosePorFranjaHoraria(viajes)
  // Ranking 1-4 por dinero total (D-18: mismo helper `ingresoPorKm` que ya existe para "$/km", no se reinventa la división acá).
  const franjaRanking = [...porFranja]
    .sort((a, b) => b.resumen.ingresos - a.resumen.ingresos)
    .map(({ clave, resumen }) => ({ clave, resumen, dineroPorKm: ingresoPorKm(resumen) }))

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

      {/* 2026-09-17, pedido explícito del usuario: "en qué zona es donde dejo más viajes, donde finalizo los viajes" — complemento de la de arriba, ver desglosePorZonaFin (D-18: misma función genérica, solo cambia zonaInicio por zonaFin). */}
      {porZonaFin.length > 0 && (
        <>
          <h3 className="texto-mute">Por zona donde dejas (Bogotá)</h3>
          <p className="texto-mute" style={{ fontSize: '0.78rem', marginBottom: 8 }}>% de tus ingresos, top {Math.min(TOPE_ANILLOS, porZonaFin.length)} de {porZonaFin.length} zonas.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            {porcentajesDeIngresos(porZonaFin)
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

      {franjaRanking.length > 0 && (
        <>
          <h3 className="texto-mute">Por franja horaria — ¿cuál te rinde más?</h3>
          <p className="texto-mute" style={{ fontSize: '0.78rem', marginBottom: 8 }}>
            Mañana 4:00-11:30 · Mediodía 11:30-15:00 · Tarde 15:00-20:00 · Noche 20:00-4:00 — según la hora en que recoges, no en la que cierras.
            Ranking por dinero total; $/km como segunda referencia.
          </p>
          <ul className="lista-viajes" style={{ marginBottom: 24 }}>
            {franjaRanking.map(({ clave, resumen, dineroPorKm }, indice) => {
              const rango = indice + 1
              return (
                <li key={clave} className="tarjeta-viaje" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                  <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`tt-rango-badge${rango === 1 ? ' tt-rango-badge--primero' : ''}`}>{rango}</span>
                      <strong style={{ textTransform: 'capitalize' }}>{clave}</strong>
                    </span>
                    <strong>{formatoMoneda(resumen.ingresos)}</strong>
                  </span>
                  <span className="texto-mute" style={{ fontSize: '0.78rem' }}>
                    {resumen.cantidadViajes} viaje{resumen.cantidadViajes === 1 ? '' : 's'} · {resumen.kmTotales.toFixed(0)} km
                    {dineroPorKm !== null ? ` · ${formatoMoneda(dineroPorKm)}/km` : ' · sin km registrados'}
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
