import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useViajes } from '../../domain/viajes/store'
import { useJornada } from '../../domain/jornada/store'
import { sincronizarViajesPendientes } from '../../domain/viajes/sync'
import { sincronizarJornadasPendientes } from '../../domain/jornada/sync'
import { fechaNegocioISO, limitesDiaBogotaISODesdeClave } from '../../lib/fechas'
import { PLATAFORMAS_DISPONIBLES as PLATAFORMAS } from '../../domain/viajes/types'

/**
 * Misma lógica de orquestación que tenía ViajesScreen.tsx — solo se movió
 * acá adentro del panel único.
 *
 * 2026-09-15, pedido explícito del usuario: el botón "Iniciar/Terminar
 * jornada" que vivía acá se quitó — estaba duplicado con el botón CTA de
 * arriba (SeccionPulso, mismo store `useJornada`), y tener los dos confundía
 * ("aparece arriba y también acá abajo"). El único botón de jornada que
 * queda en todo el Panel Trabajo es el de arriba.
 *
 * 2026-09-15 (misma sesión, ronda posterior): la tarjeta de "viajes
 * pendientes de ingreso" que vivía acá se sacó a `TarjetaViajesPendientes.tsx`
 * — el usuario pidió que apareciera justo debajo de "Estado del sistema"
 * (SeccionPulso.tsx), no acá abajo, donde había que hacer scroll para
 * encontrarla.
 */
export function SeccionViajesYJornada() {
  const { viajeEnCurso, viajes, cargando, errorGPS, cargar, iniciarViaje, marcarRecogida, finalizarViaje } = useViajes()
  const { agregarViajeAJornadaAbierta, cargar: cargarJornadas } = useJornada()

  const [ingreso, setIngreso] = useState('')
  const [diaHistorial, setDiaHistorial] = useState(() => fechaNegocioISO())

  useEffect(() => {
    void cargar()
    void cargarJornadas()
  }, [cargar, cargarJornadas])

  async function manejarFinalizar() {
    const viaje = await finalizarViaje({ ingreso: Number(ingreso) || 0, distanciaReportadaPlataforma: null })
    if (viaje) await agregarViajeAJornadaAbierta(viaje.id)
    setIngreso('')
    void sincronizarViajesPendientes()
    void sincronizarJornadasPendientes()
  }

  return (
    <div id="seccion-viajes-jornada">
      <h2 className="tt-titulo-seccion">Jornada y viajes</h2>

      {!viajeEnCurso && (
        <div className="tarjeta-viaje" style={{ marginBottom: 16, flexDirection: 'column', gap: 8 }}>
          {errorGPS && (
            <p className="texto-mute" style={{ color: '#ff6b6b' }}>
              No se pudo iniciar el GPS: {errorGPS}. Revisa el permiso de ubicación e intenta de nuevo.
            </p>
          )}
          <p className="texto-mute">Elegir plataforma para iniciar viaje:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PLATAFORMAS.map((p) => (
              <button key={p} type="button" onClick={() => void iniciarViaje(p)}>{p}</button>
            ))}
          </div>
          <Link to="/viajes/manual">
            <button type="button">Agregar viaje manual (ya pasó, sin GPS)</button>
          </Link>
        </div>
      )}

      {viajeEnCurso && (
        <div className="tarjeta-viaje" style={{ marginBottom: 16, flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
          <p className="texto-mute">
            Viaje en curso — {viajeEnCurso.plataforma} — {viajeEnCurso.recorrido.length} puntos GPS capturados
          </p>
          {!viajeEnCurso.puntoDeRecogidaISO && (
            <button type="button" onClick={marcarRecogida}>Marcar recogida del pasajero</button>
          )}
          <input type="number" placeholder="Ingreso del viaje" value={ingreso} onChange={(e) => setIngreso(e.target.value)} />
          <button type="button" onClick={() => void manejarFinalizar()}>Finalizar viaje</button>
        </div>
      )}

      <h3 className="texto-mute" style={{ marginTop: 8 }}>Historial</h3>
      <div className="tarjeta-viaje" style={{ marginBottom: 12 }}>
        <label className="texto-mute" style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
          Día
          <input type="date" value={diaHistorial} onChange={(e) => setDiaHistorial(e.target.value)} style={{ flex: 1 }} />
        </label>
      </div>

      {cargando ? (
        <p className="texto-mute">Cargando viajes…</p>
      ) : (
        (() => {
          const { desde, hasta } = limitesDiaBogotaISODesdeClave(diaHistorial)
          const delDia = viajes.filter((v) => v.estado === 'finalizado' && v.inicioISO >= desde && v.inicioISO < hasta)
          if (delDia.length === 0) {
            return <p className="texto-mute" style={{ marginBottom: 16 }}>Sin viajes ese día.</p>
          }
          return (
            <ul className="lista-viajes" style={{ marginBottom: 16, maxHeight: 320, overflowY: 'auto' }}>
              {delDia.map((v) => (
                <li key={v.id} className="tarjeta-viaje" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                  <span className="tarjeta-viaje__plataforma">
                    {v.plataforma} · {v.distancia.kmTotalesReales.toFixed(1)} km ·{' '}
                    {v.ingresoPendiente ? 'Falta el ingreso' : `$${v.ingreso.toLocaleString('es-CO')}`}
                  </span>
                  <span className="texto-mute">
                    {(v.localidadInicio ?? v.zonaInicio ?? v.localidad ?? v.zona) ?? 'Zona no detectada'}
                    {' → '}
                    {(v.localidadFin ?? v.zonaFin ?? v.localidad ?? v.zona) ?? 'Zona no detectada'}
                  </span>
                </li>
              ))}
            </ul>
          )
        })()
      )}
    </div>
  )
}
