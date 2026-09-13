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
 * Pantalla de conversación de voz (Fase 10). Es la capa de orquestación que
 * cruza domain/viajes + domain/mantenimiento para armar `contexto` — el
 * store de conversación (domain/conversacion/store.ts) nunca lee esos
 * dominios directamente, mismo principio que D-10 ya establece para
 * jornada/viajes en ViajesScreen.tsx.
 *
 * "Conversación continua": después de que el asistente termina de leer una
 * respuesta, si el modo continuo está activo, se vuelve a escuchar
 * automáticamente sin que el conductor tenga que tocar el botón de nuevo —
 * pensado para manejar con las manos en el volante. Se puede apagar en
 * cualquier momento; siempre se puede seguir usando a los toques.
 */

function claveDiaDeHoy(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ConversacionScreen() {
  const { estado, turnos, ultimoError, escucharYResponder, cancelar, reiniciarConversacion } = useConversacion()
  const { viajes, cargar: cargarViajes } = useViajes()
  const { items: itemsMantenimiento, cargar: cargarMantenimiento } = useMantenimiento()
  const { autenticado } = useAuth()

  const [modoContinuo, setModoContinuo] = useState(false)
  const [permisoListo, setPermisoListo] = useState(false)
  const finDelHistorial = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void cargarViajes()
    cargarMantenimiento()
  }, [cargarViajes, cargarMantenimiento])

  useEffect(() => {
    pedirPermisoVoz()
      .then(setPermisoListo)
      .catch(() => setPermisoListo(false))
  }, [])

  useEffect(() => {
    finDelHistorial.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turnos])

  // Conversación continua: en cuanto vuelve a 'inactiva' después de un turno
  // completo (hubo al menos un turno), si el modo continuo sigue prendido,
  // se vuelve a escuchar sola.
  useEffect(() => {
    if (modoContinuo && estado === 'inactiva' && turnos.length > 0) {
      void escucharYResponder(armarContexto())
    }
    // Solo debe dispararse cuando `estado` cambia a 'inactiva' — no en cada
    // render ni cada vez que cambian viajes/mantenimiento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, modoContinuo])

  function armarContexto(): ContextoConversacionEnvio {
    const kmActual = calcularResumen(viajes).kmTotales

    const porDia = agruparPorPeriodo(viajes, 'dia')
    const puntoHoy = porDia.find((p) => p.clave === claveDiaDeHoy())

    // Aproximación: el bucket de semana más reciente. Si el conductor no ha
    // viajado esta semana todavía, esto en realidad sería la última semana
    // con viajes, no "esta semana" vacía — aceptable para una respuesta
    // hablada, pero queda anotado como aproximación (ver "Estado real de
    // Fase 10" en PLAN-MAESTRO).
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

  if (!autenticado()) {
    return (
      <section className="pantalla">
        <h1 className="titulo-pantalla">Pregúntale a MIA</h1>
        <p className="texto-mute" style={{ marginBottom: 16 }}>
          Hace falta iniciar sesión para hablar con MIA — las respuestas se generan en el backend, no en el teléfono.
        </p>
        <Link to="/cuenta">
          <button type="button">Iniciar sesión</button>
        </Link>
      </section>
    )
  }

  return (
    <section className="pantalla">
      <h1 className="titulo-pantalla">Pregúntale a MIA</h1>

      {!permisoListo && (
        <p className="texto-mute" style={{ marginBottom: 12 }}>
          Hace falta el permiso de micrófono para usar la voz.
        </p>
      )}

      <div className="lista-viajes" style={{ marginBottom: 16, maxHeight: '50vh', overflowY: 'auto' }}>
        {turnos.length === 0 && <p className="texto-mute">Todavía no has preguntado nada en esta conversación.</p>}
        {turnos.map((turno, i) => (
          <div key={i} className="tarjeta-viaje" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
            <span className="texto-mute">Vos: {turno.pregunta}</span>
            <span>MIA: {turno.respuesta}</span>
          </div>
        ))}
        <div ref={finDelHistorial} />
      </div>

      {ultimoError && (
        <p className="texto-mute" style={{ color: '#f04646', marginBottom: 12 }}>
          {ultimoError}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <button type="button" onClick={manejarTocarMicrofono} disabled={!permisoListo} style={{ borderRadius: '50%', width: 96, height: 96 }}>
          {estadoATextoBoton(estado)}
        </button>

        <label className="texto-mute" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={modoContinuo} onChange={(e) => setModoContinuo(e.target.checked)} />
          Conversación continua (seguir escuchando después de cada respuesta)
        </label>

        {turnos.length > 0 && (
          <button type="button" onClick={reiniciarConversacion}>
            Nueva conversación
          </button>
        )}
      </div>
    </section>
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
