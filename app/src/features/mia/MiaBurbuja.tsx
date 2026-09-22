import { fechaNegocioISO } from '../../lib/fechas'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useConversacion } from '../../domain/conversacion/store'
import { pedirPermisoVoz } from '../../domain/conversacion/voz'
import type { ContextoConversacionEnvio } from '../../domain/conversacion/api'
import { useViajes } from '../../domain/viajes/store'
import { useBonos } from '../../domain/bonos/store'
import { useMantenimiento } from '../../domain/mantenimiento/store'
import { useAuth } from '../../domain/auth/store'
import { agruparPorPeriodo, calcularResumen, desglosePorZona, desglosePorFranjaHoraria } from '../../domain/estadisticas/calculos'

/**
 * Bloque 4, ítem 12 (parte no-visual). MIA deja de ser una ruta/pestaña
 * propia y pasa a ser una burbuja flotante (overlay), visible desde
 * cualquiera de los 3 paneles — se renderiza una sola vez en App.tsx, fuera
 * de <Routes>. `domain/conversacion` NO se toca (mismo store, misma API);
 * esto es 100% la misma lógica que tenía ConversacionScreen.tsx, solo
 * empaquetada como panel expandible en vez de pantalla completa.
 *
 * Un círculo con "MIA" y un panel que se abre/cierra, usando las mismas
 * clases genéricas de siempre (`.pantalla`, `.tarjeta-viaje`, `.texto-mute`,
 * el `<button>` sin clase propia). 2026-09-22, corrección de un comentario
 * desactualizado: esto decía "sin tema todavía, pendiente hasta que se
 * elija" — el sistema de temas (Verde/Oro/Papel) ya existe hace varias
 * rondas y este componente lo hereda automático a través de esas mismas
 * clases genéricas y las variables CSS del `<button>` global
 * (design/tokens.css), sin necesitar nada propio.
 */

function claveDiaDeHoy(): string {
  return fechaNegocioISO()
}

export function MiaBurbuja() {
  const {
    estado,
    turnos,
    ultimoError,
    escucharYResponder,
    cancelar,
    reiniciarConversacion,
    aperturaConVozSolicitada,
    limpiarSolicitudApertura,
  } = useConversacion()
  const { viajes, cargar: cargarViajes } = useViajes()
  const { bonos, cargar: cargarBonos } = useBonos()
  const { items: itemsMantenimiento, cargar: cargarMantenimiento } = useMantenimiento()
  const { autenticado } = useAuth()

  const [abierta, setAbierta] = useState(false)
  const [modoContinuo, setModoContinuo] = useState(false)
  const [permisoListo, setPermisoListo] = useState(false)
  const finDelHistorial = useRef<HTMLDivElement>(null)
  /** true mientras falta arrancar a escuchar tras una apertura pedida desde la burbuja (ver efecto de abajo). */
  const autoEscucharPendiente = useRef(false)

  // 2026-09-15, pedido explícito del usuario: tocar la manija de la burbuja
  // flotante trae la app al frente y pide abrir MIA lista para escuchar —
  // ver domain/viajes/burbujaOrquestacion.ts. Acá se recoge ese pedido.
  useEffect(() => {
    if (!aperturaConVozSolicitada) return
    limpiarSolicitudApertura()
    autoEscucharPendiente.current = true
    setAbierta(true)
  }, [aperturaConVozSolicitada, limpiarSolicitudApertura])

  useEffect(() => {
    if (!abierta) return
    void cargarViajes()
    void cargarBonos()
    cargarMantenimiento()
  }, [abierta, cargarViajes, cargarBonos, cargarMantenimiento])

  useEffect(() => {
    if (!abierta) return
    pedirPermisoVoz()
      .then(setPermisoListo)
      .catch(() => setPermisoListo(false))
  }, [abierta])

  // Termina el flujo que empezó el primer efecto de arriba: una vez el
  // panel está abierto, el permiso de micrófono está listo y hay sesión
  // (sin cuenta no hay a quién preguntarle, ver el bloque `!autenticado()`
  // más abajo), arranca a escuchar solo — sin que el conductor toque nada.
  useEffect(() => {
    if (!abierta || !permisoListo || !autoEscucharPendiente.current) return
    if (!autenticado()) return
    autoEscucharPendiente.current = false
    void escucharYResponder(armarContexto())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierta, permisoListo])

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
    const porDia = agruparPorPeriodo(viajes, 'dia', bonos)
    const puntoHoy = porDia.find((p) => p.clave === claveDiaDeHoy())
    const puntoSemana = agruparPorPeriodo(viajes, 'semana', bonos)[0]
    const alertas = useMantenimiento.getState().alertas(kmActual)

    return {
      hoy: puntoHoy?.resumen,
      semana: puntoSemana?.resumen,
      // 2026-09-15: "en qué zona/horario me va mejor" — mismas funciones que
      // ya usa SeccionEstadisticas.tsx (D-18: no se recalcula nada aparte).
      porZona: desglosePorZona(viajes),
      porFranja: desglosePorFranjaHoraria(viajes),
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
