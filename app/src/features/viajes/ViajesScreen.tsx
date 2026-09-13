import { useEffect, useState } from 'react'
import { useViajes } from '../../domain/viajes/store'
import { useJornada } from '../../domain/jornada/store'
import { sincronizarViajesPendientes } from '../../domain/viajes/sync'
import { sincronizarJornadasPendientes } from '../../domain/jornada/sync'
import type { Plataforma } from '../../domain/viajes/types'

const PLATAFORMAS: Plataforma[] = ['Uber', 'DiDi', 'inDrive', 'Cabify', 'Picap', 'Rappi', 'Particular']

/**
 * Pantalla de referencia del patrón nuevo. Importante: la coordinación entre
 * el dominio de viajes y el de jornada (agregar el viaje recién terminado a la
 * jornada abierta) pasa AQUÍ, en la capa de orquestación — no dentro de los
 * stores. Así cada dominio se mantiene con una sola responsabilidad.
 */
export function ViajesScreen() {
  const { viajes, viajeEnCurso, cargando, cargar, iniciarViaje, marcarRecogida, finalizarViaje } = useViajes()
  const { jornadaAbierta, iniciarJornada, terminarJornada, agregarViajeAJornadaAbierta, cargar: cargarJornadas } =
    useJornada()

  const [ingreso, setIngreso] = useState('')

  useEffect(() => {
    void cargar()
    void cargarJornadas()
  }, [cargar, cargarJornadas])

  const jornada = jornadaAbierta()

  async function manejarFinalizar() {
    const viaje = await finalizarViaje({
      ingreso: Number(ingreso) || 0,
      distanciaReportadaPlataforma: null,
    })
    if (viaje) await agregarViajeAJornadaAbierta(viaje.id)
    setIngreso('')
    // Fase 13: intento de sincronización inmediato tras cerrar un viaje —
    // best-effort, no bloquea la UI ni molesta si falla (App.tsx ya lo
    // reintenta de todos modos al próximo abrir la app). La jornada también
    // cambió recién arriba (se le agregó el viaje), por eso se sincronizan
    // las dos acá.
    void sincronizarViajesPendientes()
    void sincronizarJornadasPendientes()
  }

  async function manejarTerminarJornada() {
    await terminarJornada()
    void sincronizarJornadasPendientes()
  }

  return (
    <section className="pantalla">
      <h1 className="titulo-pantalla">Viajes</h1>

      <div className="tarjeta-viaje" style={{ marginBottom: 16 }}>
        {jornada ? (
          <button type="button" onClick={() => void manejarTerminarJornada()}>Terminar jornada</button>
        ) : (
          <button type="button" onClick={() => void iniciarJornada()}>Iniciar jornada</button>
        )}
      </div>

      {!viajeEnCurso && (
        <div className="tarjeta-viaje" style={{ marginBottom: 16, flexDirection: 'column', gap: 8 }}>
          <p className="texto-mute">Elegir plataforma para iniciar viaje:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PLATAFORMAS.map((p) => (
              <button key={p} type="button" onClick={() => void iniciarViaje(p)}>{p}</button>
            ))}
          </div>
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
          <input
            type="number"
            placeholder="Ingreso del viaje"
            value={ingreso}
            onChange={(e) => setIngreso(e.target.value)}
          />
          <button type="button" onClick={() => void manejarFinalizar()}>Finalizar viaje</button>
        </div>
      )}

      {cargando ? (
        <p className="texto-mute">Cargando viajes…</p>
      ) : viajes.length === 0 ? (
        <p className="texto-mute">Todavía no hay viajes registrados.</p>
      ) : (
        <ul className="lista-viajes">
          {viajes.map((v) => (
            <li key={v.id} className="tarjeta-viaje">
              <span className="tarjeta-viaje__plataforma">{v.plataforma}</span>
              <span className="tarjeta-viaje__km">{v.distancia.kmTotalesReales.toFixed(1)} km reales</span>
              <span className="tarjeta-viaje__ingreso">${v.ingreso.toLocaleString('es-CO')}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
