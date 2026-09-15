import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useViajes } from '../../domain/viajes/store'
import { useJornada } from '../../domain/jornada/store'
import { sincronizarViajesPendientes } from '../../domain/viajes/sync'
import { sincronizarJornadasPendientes } from '../../domain/jornada/sync'
import { fechaNegocioISO, limitesDiaBogotaISODesdeClave } from '../../lib/fechas'
import type { Plataforma } from '../../domain/viajes/types'

const PLATAFORMAS: Plataforma[] = ['Uber', 'DiDi', 'inDrive', 'Cabify', 'Picap', 'Rappi', 'Particular']

/**
 * Misma lógica de orquestación que tenía ViajesScreen.tsx — solo se movió
 * acá adentro del panel único.
 *
 * 2026-09-15, pedido explícito del usuario: el botón "Iniciar/Terminar
 * jornada" que vivía acá se quitó — estaba duplicado con el botón CTA de
 * arriba (SeccionPulso, mismo store `useJornada`), y tener los dos confundía
 * ("aparece arriba y también acá abajo"). El único botón de jornada que
 * queda en todo el Panel Trabajo es el de arriba.
 */
export function SeccionViajesYJornada() {
  const { viajes, viajeEnCurso, cargando, errorGPS, cargar, iniciarViaje, marcarRecogida, finalizarViaje, completarIngreso } = useViajes()
  const { agregarViajeAJornadaAbierta, cargar: cargarJornadas } = useJornada()

  const [ingreso, setIngreso] = useState('')
  const [diaHistorial, setDiaHistorial] = useState(() => fechaNegocioISO())
  /** 2026-09-16: uno por cada viaje pendiente de ingreso (puede haber varios, ver store.ts). */
  const [ingresosPendientes, setIngresosPendientes] = useState<Record<string, string>>({})

  useEffect(() => {
    void cargar()
    void cargarJornadas()
  }, [cargar, cargarJornadas])

  const viajesPendientesIngreso = viajes.filter((v) => v.ingresoPendiente)

  async function manejarFinalizar() {
    const viaje = await finalizarViaje({ ingreso: Number(ingreso) || 0, distanciaReportadaPlataforma: null })
    if (viaje) await agregarViajeAJornadaAbierta(viaje.id)
    setIngreso('')
    void sincronizarViajesPendientes()
    void sincronizarJornadasPendientes()
  }

  async function manejarCompletarIngreso(viajeId: string) {
    const monto = Number(ingresosPendientes[viajeId]) || 0
    await completarIngreso(viajeId, monto)
    await agregarViajeAJornadaAbierta(viajeId)
    setIngresosPendientes((prev) => {
      const siguiente = { ...prev }
      delete siguiente[viajeId]
      return siguiente
    })
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

      {viajesPendientesIngreso.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {viajesPendientesIngreso.length > 1 && (
            <p className="texto-mute">
              Tienes {viajesPendientesIngreso.length} viajes terminados desde la burbuja esperando el ingreso — complétalos uno por uno.
            </p>
          )}
          {viajesPendientesIngreso.map((v) => (
            <div key={v.id} className="tarjeta-viaje" style={{ flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
              <p className="texto-mute">
                Terminaste este viaje desde la burbuja flotante — {v.plataforma}, {v.distancia.kmTotalesReales.toFixed(1)} km.
                Solo falta el ingreso para guardarlo.
              </p>
              <input
                type="number"
                placeholder="Ingreso del viaje"
                value={ingresosPendientes[v.id] ?? ''}
                onChange={(e) => setIngresosPendientes((prev) => ({ ...prev, [v.id]: e.target.value }))}
              />
              <button type="button" onClick={() => void manejarCompletarIngreso(v.id)}>Guardar viaje</button>
            </div>
          ))}
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
