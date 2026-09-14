import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useViajes } from '../../domain/viajes/store'
import { useJornada } from '../../domain/jornada/store'
import { sincronizarViajesPendientes } from '../../domain/viajes/sync'
import { sincronizarJornadasPendientes } from '../../domain/jornada/sync'
import type { Plataforma } from '../../domain/viajes/types'

const PLATAFORMAS: Plataforma[] = ['Uber', 'DiDi', 'inDrive', 'Cabify', 'Picap', 'Rappi', 'Particular']

/** Misma lógica de orquestación que tenía ViajesScreen.tsx — solo se movió acá adentro del panel único. */
export function SeccionViajesYJornada() {
  const { viajes, viajeEnCurso, cargando, errorGPS, cargar, iniciarViaje, marcarRecogida, finalizarViaje } = useViajes()
  const { jornadaAbierta, iniciarJornada, terminarJornada, agregarViajeAJornadaAbierta, cargar: cargarJornadas } =
    useJornada()

  const [ingreso, setIngreso] = useState('')

  useEffect(() => {
    void cargar()
    void cargarJornadas()
  }, [cargar, cargarJornadas])

  const jornada = jornadaAbierta()

  async function manejarFinalizar() {
    const viaje = await finalizarViaje({ ingreso: Number(ingreso) || 0, distanciaReportadaPlataforma: null })
    if (viaje) await agregarViajeAJornadaAbierta(viaje.id)
    setIngreso('')
    void sincronizarViajesPendientes()
    void sincronizarJornadasPendientes()
  }

  async function manejarTerminarJornada() {
    await terminarJornada()
    void sincronizarJornadasPendientes()
  }

  return (
    <>
      <h2 className="titulo-pantalla" style={{ fontSize: 18 }}>Jornada y viajes</h2>

      <div className="tarjeta-viaje" style={{ marginBottom: 16 }}>
        {jornada ? (
          <button type="button" onClick={() => void manejarTerminarJornada()}>Terminar jornada</button>
        ) : (
          <button type="button" onClick={() => void iniciarJornada()}>Iniciar jornada</button>
        )}
      </div>

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

      {cargando ? (
        <p className="texto-mute">Cargando viajes…</p>
      ) : viajes.length === 0 ? (
        <p className="texto-mute" style={{ marginBottom: 16 }}>Todavía no hay viajes registrados.</p>
      ) : (
        <ul className="lista-viajes" style={{ marginBottom: 16, maxHeight: 280, overflowY: 'auto' }}>
          {viajes.slice(0, 20).map((v) => (
            <li key={v.id} className="tarjeta-viaje">
              <span className="tarjeta-viaje__plataforma">{v.plataforma}</span>
              <span className="tarjeta-viaje__km">{v.distancia.kmTotalesReales.toFixed(1)} km reales</span>
              <span className="tarjeta-viaje__ingreso">${v.ingreso.toLocaleString('es-CO')}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
