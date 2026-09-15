import { fechaNegocioISO, limitesDiaBogotaISO, limitesSemanaBogotaISO, limitesMesBogotaISO } from '../../lib/fechas'
import { useMemo, useState } from 'react'
import { useViajes } from '../../domain/viajes/store'
import { useJornada } from '../../domain/jornada/store'
import { useGastos } from '../../domain/gastos/store'
import { sincronizarJornadasPendientes } from '../../domain/jornada/sync'
import { mostrarBurbuja, ocultarBurbuja } from '../../domain/viajes/burbuja'
import {
  agruparPorPeriodo,
  calcularCostoPorKm,
  calcularDineroEnEspera,
  calcularResumen,
  calcularRentabilidadPorHora,
  calcularTiempoJornada,
} from '../../domain/estadisticas/calculos'
import type { Gasto } from '../../domain/gastos/types'
import type { Viaje } from '../../domain/viajes/types'
import { SeccionMantenimiento } from './SeccionMantenimiento'
import { SeccionGastos } from './SeccionGastos'
import { SeccionEstadisticas } from './SeccionEstadisticas'
import { TarjetaViajesPendientes } from './TarjetaViajesPendientes'

type VistaLectura = 'recortadas' | 'resumen' | 'mantenimiento' | 'estadisticas'
type PeriodoResumen = 'hoy' | 'semana' | 'mes'

function formatoPesos(monto: number): string {
  return `$${Math.round(monto).toLocaleString('es-CO')}`
}

function formatoDuracion(ms: number): string {
  const totalMin = Math.round(ms / 60_000)
  const horas = Math.floor(totalMin / 60)
  const min = totalMin % 60
  return horas === 0 ? `${min}m` : `${horas}h ${min}m`
}

function limitesDeHoyISO(): { desde: string; hasta: string } { return limitesDiaBogotaISO() }
function limitesDeSemanaISO(): { desde: string; hasta: string } { return limitesSemanaBogotaISO() }

function limitesDeMesISO(): { desde: string; hasta: string } { return limitesMesBogotaISO() }

function limitesDe(periodo: PeriodoResumen): { desde: string; hasta: string } {
  if (periodo === 'hoy') return limitesDeHoyISO()
  if (periodo === 'semana') return limitesDeSemanaISO()
  return limitesDeMesISO()
}

function sumaCategoria(gastos: Gasto[], categoria: Gasto['categoria'], desde: string, hasta: string): number {
  return gastos
    .filter((g) => g.categoria === categoria && g.fechaISO >= desde && g.fechaISO < hasta)
    .reduce((acc, g) => acc + g.monto, 0)
}

function sumaTotalGastos(gastos: Gasto[], desde: string, hasta: string): number {
  return gastos.filter((g) => g.fechaISO >= desde && g.fechaISO < hasta).reduce((acc, g) => acc + g.monto, 0)
}

function claveDiaDeHoy(): string {
  return fechaNegocioISO()
}

/**
 * Bloque 4, ítems 9/10/13/14 (visual) — la tarjeta de pulso, vestida con el
 * tema del Panel "Trabajo" (ver design/tokens.css, `.tema-trabajo`). Todos
 * los números son reales (mismos stores/funciones de siempre, D-3/D-18) —
 * lo único nuevo de esta sesión es cómo se ven.
 *
 * Interpretación de dos ambigüedades de la guía visual (documentadas acá
 * para no tener que redecidir después): "Gasolina/km" usa SOLO los gastos de
 * categoría 'gasolina' (no todos los gastos, eso ya lo cubre el desglose de
 * "Resumen" más abajo) — la etiqueta ahora sí corresponde al dato real. Y
 * "Agregar bono" de la guía no se incluyó: ese concepto no existe como
 * dominio en MIA (no se inventó un botón que no hace nada) — quedan
 * "Agregar viaje" y "Agregar gasto", que sí llevan a algo real.
 */
export function SeccionPulso() {
  const { viajes, viajeEnCurso } = useViajes()
  const { jornadaAbierta, iniciarJornada, terminarJornada, pausarJornada, reanudarJornada } = useJornada()
  const { gastos } = useGastos()

  const [vista, setVista] = useState<VistaLectura>('recortadas')
  const [periodo, setPeriodo] = useState<PeriodoResumen>('hoy')
  const [historialAbierto, setHistorialAbierto] = useState(false)

  const jornada = jornadaAbierta()

  const resumenHoy = useMemo(() => {
    const porDia = agruparPorPeriodo(viajes, 'dia')
    return porDia.find((p) => p.clave === claveDiaDeHoy())?.resumen ?? calcularResumen([])
  }, [viajes])

  const tiempo = useMemo(() => (jornada ? calcularTiempoJornada(jornada, viajes) : null), [jornada, viajes])
  const rentabilidad = useMemo(() => (jornada ? calcularRentabilidadPorHora(jornada, viajes) : null), [jornada, viajes])
  const dineroEnEspera = useMemo(
    () => (tiempo && rentabilidad ? calcularDineroEnEspera(tiempo, rentabilidad) : null),
    [tiempo, rentabilidad],
  )

  const { desde: desdeHoy, hasta: hastaHoy } = limitesDeHoyISO()
  const gasolinaPorKmHoy = useMemo(
    () => calcularCostoPorKm(gastos.filter((g) => g.categoria === 'gasolina'), viajes, desdeHoy, hastaHoy),
    [gastos, viajes, desdeHoy, hastaHoy],
  )
  const mantenimientoHoy = useMemo(() => sumaCategoria(gastos, 'mantenimiento', desdeHoy, hastaHoy), [gastos, desdeHoy, hastaHoy])

  // --- Vista "Resumen" ---
  const rango = limitesDe(periodo)
  const viajesDelPeriodo = useMemo(
    () => viajes.filter((v: Viaje) => v.estado === 'finalizado' && v.inicioISO >= rango.desde && v.inicioISO < rango.hasta),
    [viajes, rango.desde, rango.hasta],
  )
  const resumenPeriodo = useMemo(() => calcularResumen(viajesDelPeriodo), [viajesDelPeriodo])
  const gastoTotalPeriodo = sumaTotalGastos(gastos, rango.desde, rango.hasta)
  const netoPeriodo = resumenPeriodo.ingresos - gastoTotalPeriodo
  const historial = useMemo(() => agruparPorPeriodo(viajes, 'dia').slice(0, 5), [viajes])

  async function manejarJornada() {
    if (jornada) {
      await terminarJornada()
      // 2026-09-15, pedido explícito del usuario: la burbuja aparece al
      // iniciar jornada y desaparece al terminarla — si en ese momento
      // había un viaje en curso, se deja (mismo criterio que ya tenía
      // domain/viajes/store.ts: ocultarBurbuja() solo cuando el viaje
      // termina de verdad, nunca a mitad de uno).
      if (!viajeEnCurso) void ocultarBurbuja()
    } else {
      await iniciarJornada()
      // "que cuando le dé iniciar jornada, me abra el botón flotante" — antes
      // la burbuja solo aparecía al elegir una plataforma para un viaje
      // (domain/viajes/store.ts, iniciarViaje). Ahora aparece de una vez.
      void mostrarBurbuja('0.0', '0m', !!viajeEnCurso, viajes.length)
    }
    void sincronizarJornadasPendientes()
  }

  function irA(idSeccion: string) {
    document.getElementById(idSeccion)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div>
      <div className="tt-hero">
        <span className="tt-hero__eyebrow">MIA · PANEL DE TRABAJO</span>
        <h1 className="tt-hero__titulo">El pulso de tu día.</h1>
        <p className="tt-hero__subtitulo">
          {jornada ? 'Jornada en curso — todo se está midiendo solo.' : 'Abre la jornada para empezar a medir.'}
        </p>
      </div>

      <div className="tt-estado tt-tarjeta">
        <span className="tt-estado__etiqueta">Estado del sistema</span>
        <div className={`tt-estado__valor ${jornada && !jornada.pausadaDesdeISO ? 'tt-estado__valor--activo' : 'tt-estado__valor--pausa'}`}>
          {jornada ? (jornada.pausadaDesdeISO ? 'Pausada' : 'En curso') : 'Sin abrir'}
        </div>
        <span className="tt-estado__detalle">
          {resumenHoy.kmTotales.toFixed(1)} km · {resumenHoy.cantidadViajes} viaje{resumenHoy.cantidadViajes === 1 ? '' : 's'}
        </span>
      </div>

      {/* 2026-09-15, pedido explícito del usuario: "cuando los viajes están pendientes... tiene que aparecer ahí abajito de estado del sistema... no debería tener que hacer scroll" */}
      <TarjetaViajesPendientes />

      <button
        type="button"
        className={`tt-boton-cta ${jornada ? 'tt-boton-cta--pausar' : ''}`}
        onClick={() => void manejarJornada()}
      >
        {jornada ? 'Terminar jornada' : 'Iniciar jornada'}
      </button>

      {/* 2026-09-15, pedido explícito del usuario: "toca pausar jornada y reanudar jornada, no está ese botoncito" — mismo store (useJornada), solo pausa el reloj de la jornada (ver calcularTiempoJornada), nunca un viaje en curso. */}
      {jornada && (
        <button
          type="button"
          className="tt-boton-cta tt-boton-cta--pausar"
          style={{ marginTop: 8 }}
          onClick={() => void (jornada.pausadaDesdeISO ? reanudarJornada() : pausarJornada())}
        >
          {jornada.pausadaDesdeISO ? 'Reanudar jornada' : 'Pausar jornada'}
        </button>
      )}

      <div className="tt-pildoras">
        <button type="button" className={`tt-pildora ${vista === 'recortadas' ? 'tt-pildora--activa' : ''}`} onClick={() => setVista('recortadas')}>
          Lectura del día
        </button>
        <button type="button" className={`tt-pildora ${vista === 'resumen' ? 'tt-pildora--activa' : ''}`} onClick={() => setVista('resumen')}>
          Resumen
        </button>
        <button type="button" className={`tt-pildora ${vista === 'mantenimiento' ? 'tt-pildora--activa' : ''}`} onClick={() => setVista('mantenimiento')}>
          Mantenim. y gastos
        </button>
        <button type="button" className={`tt-pildora ${vista === 'estadisticas' ? 'tt-pildora--activa' : ''}`} onClick={() => setVista('estadisticas')}>
          Estadísticas
        </button>
      </div>

      {vista === 'mantenimiento' && (
        <>
          <SeccionMantenimiento />
          <SeccionGastos />
        </>
      )}

      {vista === 'estadisticas' && <SeccionEstadisticas />}

      {vista === 'recortadas' && (
        <div className="tt-grilla-metricas">
          <div className="tt-metrica tt-metrica--recortada">
            <span className="tt-metrica__icono">⏱️</span>
            <span className="tt-metrica__etiqueta">Tiempo de jornada</span>
            <span className="tt-metrica__valor">{formatoDuracion(tiempo?.tiempoTotalMs ?? 0)}</span>
          </div>
          <div className="tt-metrica tt-metrica--recortada">
            <span className="tt-metrica__icono">🏍️</span>
            <span className="tt-metrica__etiqueta">Tiempo real trabajado</span>
            <span className="tt-metrica__valor">{formatoDuracion(tiempo?.tiempoTrabajadoMs ?? 0)}</span>
          </div>
          <div className="tt-metrica tt-metrica--recortada">
            <span className="tt-metrica__icono">🌙</span>
            <span className="tt-metrica__etiqueta">Tiempo muerto</span>
            <span className="tt-metrica__valor tt-metrica__valor--oro">{formatoDuracion(tiempo?.tiempoMuertoMs ?? 0)}</span>
          </div>
          <div className="tt-metrica tt-metrica--recortada">
            <span className="tt-metrica__icono">💰</span>
            <span className="tt-metrica__etiqueta">Dinero / hora real</span>
            <span className="tt-metrica__valor tt-metrica__valor--lila">
              {rentabilidad && rentabilidad.ingresoPorHoraTrabajada > 0 ? formatoPesos(rentabilidad.ingresoPorHoraTrabajada) : '—'}
            </span>
          </div>
          <div className="tt-metrica tt-metrica--recortada">
            <span className="tt-metrica__icono">⛽</span>
            <span className="tt-metrica__etiqueta">Gasolina / km</span>
            <span className="tt-metrica__valor">
              {gasolinaPorKmHoy.costoPorKm === null ? '—' : formatoPesos(gasolinaPorKmHoy.costoPorKm)}
            </span>
          </div>
          <div className="tt-metrica tt-metrica--recortada">
            <span className="tt-metrica__icono">🔧</span>
            <span className="tt-metrica__etiqueta">Dinero que se va en espera</span>
            <span className="tt-metrica__valor tt-metrica__valor--coral">
              {dineroEnEspera === null ? '—' : formatoPesos(dineroEnEspera)}
            </span>
          </div>
          <div className="tt-metrica tt-metrica--recortada">
            <span className="tt-metrica__icono">📍</span>
            <span className="tt-metrica__etiqueta">Kilómetros del día</span>
            <span className="tt-metrica__valor">{resumenHoy.kmTotales.toFixed(0)} km</span>
          </div>
          <div className="tt-metrica tt-metrica--recortada">
            <span className="tt-metrica__icono">🛠️</span>
            <span className="tt-metrica__etiqueta">Mantenimiento del día</span>
            <span className="tt-metrica__valor tt-metrica__valor--oro">{formatoPesos(mantenimientoHoy)}</span>
          </div>
        </div>
      )}

      {vista === 'resumen' && (
        <>
          <div className="tt-pildoras">
            <button type="button" className={`tt-pildora tt-pildora--dorada ${periodo === 'hoy' ? 'tt-pildora--activa' : ''}`} onClick={() => setPeriodo('hoy')}>
              Hoy
            </button>
            <button type="button" className={`tt-pildora ${periodo === 'semana' ? 'tt-pildora--activa' : ''}`} onClick={() => setPeriodo('semana')}>
              Semana
            </button>
            <button type="button" className={`tt-pildora ${periodo === 'mes' ? 'tt-pildora--activa' : ''}`} onClick={() => setPeriodo('mes')}>
              Mes
            </button>
          </div>

          <div className="tt-resumen-neto">
            <span className="tt-resumen-neto__etiqueta">Neto del período</span>
            <div className="tt-resumen-neto__valor">{formatoPesos(netoPeriodo)}</div>
            <span className="tt-resumen-neto__detalle">
              {resumenPeriodo.cantidadViajes} viaje{resumenPeriodo.cantidadViajes === 1 ? '' : 's'} · {resumenPeriodo.kmTotales.toFixed(0)} km recorridos
            </span>
          </div>

          <div className="tt-resumen-filas">
            <div className="tt-resumen-fila">
              <span className="tt-resumen-fila__nombre">
                Gasolina
                <span className="tt-resumen-fila__nota">
                  {resumenPeriodo.kmTotales === 0 ? 'sin kilómetros en este período' : `${sumaCategoria(gastos, 'gasolina', rango.desde, rango.hasta) === 0 ? 'sin cargas' : 'ver detalle abajo'}`}
                </span>
              </span>
              <span>{formatoPesos(sumaCategoria(gastos, 'gasolina', rango.desde, rango.hasta))}</span>
            </div>
            <div className="tt-resumen-fila">
              <span className="tt-resumen-fila__nombre">
                Mantenimiento
                <span className="tt-resumen-fila__nota">recordatorios en la sección de abajo</span>
              </span>
              <span>{formatoPesos(sumaCategoria(gastos, 'mantenimiento', rango.desde, rango.hasta))}</span>
            </div>
            <div className="tt-resumen-fila">
              <span className="tt-resumen-fila__nombre">
                Aceite
                <span className="tt-resumen-fila__nota">categoría propia, no se mezcla con mantenimiento</span>
              </span>
              <span>{formatoPesos(sumaCategoria(gastos, 'aceite', rango.desde, rango.hasta))}</span>
            </div>
            <div className="tt-resumen-fila">
              <span className="tt-resumen-fila__nombre">
                Gastos totales de moto
                <span className="tt-resumen-fila__nota">incluye llantas y otros, no solo las 3 categorías de arriba</span>
              </span>
              <span>{formatoPesos(gastoTotalPeriodo)}</span>
            </div>
          </div>

          <h2 className="tt-divisor">Operación y registros</h2>
          <div className="tt-acciones">
            <button type="button" className="tt-accion-boton" onClick={() => irA('seccion-viajes-jornada')}>
              Agregar viaje
            </button>
            <button type="button" className="tt-accion-boton" onClick={() => setVista('mantenimiento')}>
              Agregar gasto
            </button>
            <button type="button" className="tt-accion-boton" onClick={() => setVista('mantenimiento')}>
              Mantenimiento
            </button>
          </div>

          <button type="button" className="tt-acordeon" onClick={() => setHistorialAbierto((v) => !v)}>
            {historialAbierto ? '▾' : '▸'} Historial · últimos {historial.length} día{historial.length === 1 ? '' : 's'}
            {historialAbierto && (
              <div className="tt-acordeon__contenido">
                {historial.length === 0 ? (
                  <span className="texto-mute">Todavía no hay viajes registrados.</span>
                ) : (
                  historial.map(({ clave, resumen }) => (
                    <div key={clave} className="tt-resumen-fila">
                      <span>{clave}</span>
                      <span>
                        {resumen.cantidadViajes} viaje{resumen.cantidadViajes === 1 ? '' : 's'} · {formatoPesos(resumen.ingresos)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </button>
        </>
      )}
    </div>
  )
}
