import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useConversacion } from '../../domain/conversacion/store'
import { pedirPermisoVoz } from '../../domain/conversacion/voz'
import type { ContextoConversacionEnvio } from '../../domain/conversacion/api'
import { useViajes } from '../../domain/viajes/store'
import { useMantenimiento } from '../../domain/mantenimiento/store'
import { useAuth } from '../../domain/auth/store'
import { agruparPorPeriodo, calcularResumen } from '../../domain/estadisticas/calculos'

/**
 * Bloque 4, ítem 12 (parte no-visual). MIA deja de ser una ruta/pestaña
 * propia y pasa a ser una burbuja flotante (overlay), visible desde
 * cualquiera de los 3 paneles — se renderiza una sola vez en App.tsx, fuera
 * de <Routes>. `domain/conversacion` NO se toca (mismo store, misma API);
 * esto es 100% la misma lógica que tenía ConversacionScreen.tsx, solo
 * empaquetada como panel expandible en vez de pantalla completa.
 *
 * A propósito sin animación/tema todavía — un círculo con "MIA" y un panel
 * que se abre/cierra, usando las mismas clases genéricas de siempre. El
 * aspecto final (posición exacta, ícono, colores) es la parte visual del
 * Bloque 4, pendiente hasta que se elija el tema.
 */

function claveDiaDeHoy(): string {
  return new Date().toISOString().slice(0, 10)
}

export function MiaBurbuja() {
  const { estado, turnos, ultimoError, escucharYResponder, cancelar, reiniciarConversacion } = useConversacion()
  const { viajes, cargar: cargarViajes } = useViajes()
  const { items: itemsMantenimiento, cargar: cargarMantenimiento } = useMantenimiento()
  const { autenticado } = useAuth()

  const [abierta, setAbierta] = useState(false)
  const [modoContinuo, setModoContinuo] = useState(false)
  const [permisoListo, setPermisoListo] = useState(false)
  const finDelHistorial = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierta) return
    void cargarViajes()
    cargarMantenimiento()
  }, [abierta, cargarViajes, cargarMantenimiento])

  useEffect(() => {
    if (!abierta) return
    pedirPermisoVoz()
      .then(setPermisoListo)
      .catch(() => setPermisoListo(false))
  }, [abierta])

  useEffect(() => {
    finDelHistorial.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turnos])

  useEffect(() => {
    if (modoContinuo && estado === 'inactiva' && turnos.length > 0) {
      void escucharYResponder(armarContexto())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, modoContinuo])

  function armarContexto(): ContextoConversacionEnvio {
    const kmActual = calcularResumen(viajes).kmTotales
    const porDia = agruparPorPeriodo(viajes, 'dia')
    const puntoHoy = porDia.find((p) => p.clave === claveDiaDeHoy())
    const puntoSemana = agruparPorPeriodo(viajes, 'semana')[0]
    const alertas = useMantenimiento.getState().alertas(kmActual)

    return {
      hoy: puntoHoy?.resumen,
      semana: puntoSemana?.resumen,
      mantenimiento: itemsMantenimiento.map((item) => {
        const alerta = alertas.find((a) => a.item.id === item.id)
        return {
          nombre: item.nombre,
          vencido: alerta?.vencido ?? false,
          proximoAVencer: alerta?.proximoAVencer ?? false,
          kmFaltantes: alerta?.kmFaltantes ?? null,
          diasFaltantes: alerta?.diasFaltantes ?? null,
        }
      }),
    }
  }

  function manejarTocarMicrofono() {
    if (estado === 'escuchando' || estado === 'procesando' || estado === 'hablando') {
      cancelar()
      return
    }
    void escucharYResponder(armarContexto())
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        style={{ position: 'fixed', bottom: 76, right: 16, borderRadius: '50%', width: 56, height: 56, zIndex: 40 }}
      >
        MIA
      </button>

      {abierta && (
        <div
          className="pantalla"
          style={{
            position: 'fixed',
            bottom: 140,
            right: 16,
            left: 16,
            maxHeight: '60vh',
            overflowY: 'auto',
            zIndex: 40,
            background: 'var(--color-superficie, #1c1c1c)',
            border: '1px solid var(--color-borde, #333)',
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 className="titulo-pantalla" style={{ fontSize: 18, margin: 0 }}>Pregúntale a MIA</h2>
            <button type="button" onClick={() => setAbierta(false)}>Cerrar</button>
          </div>

          {!autenticado() ? (
            <>
              <p className="texto-mute" style={{ marginBottom: 16 }}>
                Hace falta iniciar sesión para hablar con MIA — las respuestas se generan en el backend, no en el teléfono.
              </p>
              <Link to="/cuenta" onClick={() => setAbierta(false)}>
                <button type="button">Iniciar sesión</button>
              </Link>
            </>
          ) : (
            <>
              {!permisoListo && (
                <p className="texto-mute" style={{ marginBottom: 12 }}>Hace falta el permiso de micrófono para usar la voz.</p>
              )}

              <div className="lista-viajes" style={{ marginBottom: 16, maxHeight: 220, overflowY: 'auto' }}>
                {turnos.length === 0 && <p className="texto-mute">Todavía no has preguntado nada en esta conversación.</p>}
                {turnos.map((turno, i) => (
                  <div key={i} className="tarjeta-viaje" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                    <span className="texto-mute">Vos: {turno.pregunta}</span>
                    <span>MIA: {turno.respuesta}</span>
                  </div>
                ))}
                <div ref={finDelHistorial} />
              </div>

              {ultimoError && <p className="texto-mute" style={{ color: '#f04646', marginBottom: 12 }}>{ultimoError}</p>}

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <button type="button" onClick={manejarTocarMicrofono} disabled={!permisoListo} style={{ borderRadius: '50%', width: 72, height: 72 }}>
                  {estadoATextoBoton(estado)}
                </button>
                <label className="texto-mute" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={modoContinuo} onChange={(e) => setModoContinuo(e.target.checked)} />
                  Conversación continua
                </label>
                {turnos.length > 0 && (
                  <button type="button" onClick={reiniciarConversacion}>Nueva conversación</button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}

function estadoATextoBoton(estado: ReturnType<typeof useConversacion.getState>['estado']): string {
  switch (estado) {
    case 'escuchando':
      return 'Escuchando…'
    case 'procesando':
      return 'Pensando…'
    case 'hablando':
      return 'Hablando…'
    case 'error':
      return 'Reintentar'
    default:
      return 'Preguntar'
  }
}
