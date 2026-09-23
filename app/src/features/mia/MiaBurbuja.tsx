import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useConversacion } from '../../domain/conversacion/store'
import { pedirPermisoVoz } from '../../domain/conversacion/voz'
import type { ContextoConversacionEnvio } from '../../domain/conversacion/api'
import { useViajes } from '../../domain/viajes/store'
import { useBonos } from '../../domain/bonos/store'
import { useMantenimiento } from '../../domain/mantenimiento/store'
import { useHogar } from '../../domain/hogar/store'
import { useDeudas } from '../../domain/deudas/store'
import { useAhorro } from '../../domain/ahorro/store'
import { useMetaDiaria } from '../../domain/metaDiaria/store'
import { useAuth } from '../../domain/auth/store'
import { agruparPorPeriodo, calcularResumen, desglosePorZona, desglosePorFranjaHoraria } from '../../domain/estadisticas/calculos'
import { calcularMetaBaseDiaria, calcularMetaDiaria, generarClavesDiasAnteriores } from '../../domain/metaDiaria/calculos'
import { proximaFechaCuotaDeuda } from '../../domain/avisos/calculos'

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
  return new Date().toISOString().slice(0, 10)
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
    vozElegida,
    tono,
    vocesDisponibles,
    cargarVocesDisponibles,
    elegirVoz,
    elegirTono,
    probarVoz,
  } = useConversacion()
  const { viajes, cargar: cargarViajes } = useViajes()
  const { bonos, cargar: cargarBonos } = useBonos()
  const { items: itemsMantenimiento, cargar: cargarMantenimiento } = useMantenimiento()
  const { conceptos: conceptosHogar, cargar: cargarHogar } = useHogar()
  const { deudas, cargar: cargarDeudas } = useDeudas()
  const { metas: metasAhorro, cargar: cargarAhorro } = useAhorro()
  const { presupuestoGasolinaMensual, cargar: cargarMetaDiaria } = useMetaDiaria()
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
    void cargarHogar()
    void cargarDeudas()
    void cargarAhorro()
    cargarMetaDiaria()
  }, [abierta, cargarViajes, cargarBonos, cargarMantenimiento, cargarHogar, cargarDeudas, cargarAhorro, cargarMetaDiaria])

  useEffect(() => {
    if (!abierta) return
    pedirPermisoVoz()
      .then(setPermisoListo)
      .catch(() => setPermisoListo(false))
  }, [abierta])

  useEffect(() => {
    if (!abierta) return
    void cargarVocesDisponibles()
  }, [abierta, cargarVocesDisponibles])

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
      // 2026-09-23, pedido explícito del usuario: "que él pueda responderme... deudas,
      // ahorro, meta diaria" — mismos dominios y mismo criterio de "meta en progreso"
      // que ya usa SeccionPulso.tsx (D-18: no se recalcula distinto acá).
      deudas: armarContextoDeudas(),
      ahorro: armarContextoAhorro(),
      metaDiaria: armarContextoMetaDiaria(porDia, puntoHoy?.resumen.ingresos ?? 0),
    }
  }

  function armarContextoDeudas(): ContextoConversacionEnvio['deudas'] {
    const activas = deudas.filter((d) => d.saldoActual > 0)
    const totalPendiente = activas.reduce((acc, d) => acc + d.saldoActual, 0)

    let masProxima: { deuda: (typeof activas)[number]; fecha: Date } | null = null
    for (const deuda of activas) {
      const fecha = proximaFechaCuotaDeuda(deuda)
      if (!fecha) continue
      if (!masProxima || fecha.getTime() < masProxima.fecha.getTime()) masProxima = { deuda, fecha }
    }

    return {
      totalPendiente,
      cantidadActivas: activas.length,
      proximoPago: masProxima
        ? {
            nombre: masProxima.deuda.nombre,
            monto: masProxima.deuda.cuotaProgramada?.monto ?? masProxima.deuda.saldoActual,
            diasFaltantes: Math.max(0, Math.round((masProxima.fecha.getTime() - Date.now()) / 86_400_000)),
          }
        : null,
    }
  }

  function armarContextoAhorro(): ContextoConversacionEnvio['ahorro'] {
    const enProgreso = metasAhorro.filter((m) => m.saldoActual < m.montoObjetivo)
    return {
      totalGuardado: enProgreso.reduce((acc, m) => acc + m.saldoActual, 0),
      totalObjetivo: enProgreso.reduce((acc, m) => acc + m.montoObjetivo, 0),
      cantidadMetas: enProgreso.length,
    }
  }

  function armarContextoMetaDiaria(
    porDia: ReturnType<typeof agruparPorPeriodo>,
    ingresoHoy: number,
  ): ContextoConversacionEnvio['metaDiaria'] {
    const kmPromedioDiario =
      porDia.length === 0 ? 0 : porDia.slice(0, 30).reduce((acc, p) => acc + p.resumen.kmTotales, 0) / Math.min(30, porDia.length)
    const capacidadDiariaRealista =
      porDia.length === 0 ? null : porDia.slice(0, 30).reduce((acc, p) => acc + p.resumen.ingresos, 0) / Math.min(30, porDia.length)

    const metaBase = calcularMetaBaseDiaria({
      conceptosFijosActivos: conceptosHogar.filter((c) => c.activo),
      deudasActivas: deudas.filter((d) => d.saldoActual > 0),
      metasAhorroEnProgreso: metasAhorro.filter((m) => m.saldoActual < m.montoObjetivo),
      itemsMantenimiento,
      kmPromedioDiario,
      presupuestoGasolinaMensual,
    })
    if (metaBase.total <= 0) return undefined

    const finalizados = viajes.filter((v) => v.estado === 'finalizado')
    const primerViajeISO = finalizados.reduce<string | null>(
      (acc, v) => (acc === null || v.inicioISO < acc ? v.inicioISO : acc),
      null,
    )
    const ingresosPorDiaClave = new Map(porDia.map((p) => [p.clave, p.resumen.ingresos]))
    const clavesDiasAnteriores = generarClavesDiasAnteriores(primerViajeISO)
    const resultado = calcularMetaDiaria(metaBase.total, ingresosPorDiaClave, clavesDiasAnteriores, ingresoHoy, capacidadDiariaRealista)

    return {
      metaDeHoy: resultado.metaDeHoy,
      ingresoHoy: resultado.ingresoHoy,
      progresoPorcentaje: resultado.progresoPorcentaje,
      faltanteRealista: resultado.faltanteRealista,
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

              {/* 2026-09-23, pedido explícito del usuario: "no me gusta ese tono de voz" —
                  elegir otra voz instalada en el teléfono (si el motor tiene más de una en
                  español) y/o ajustar el tono (pitch), que siempre funciona sin importar
                  cuántas voces haya instaladas. */}
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span className="texto-mute" style={{ fontSize: '0.78rem' }}>Voz de MIA</span>
                {vocesDisponibles.length > 0 && (
                  <select value={vozElegida ?? ''} onChange={(e) => elegirVoz(e.target.value || null)}>
                    <option value="">Voz por defecto del teléfono</option>
                    {vocesDisponibles.map((v) => (
                      <option key={v.name} value={v.name}>{v.name}</option>
                    ))}
                  </select>
                )}
                <label className="texto-mute" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}>
                  Tono
                  <input
                    type="range"
                    min={0.6}
                    max={1.6}
                    step={0.1}
                    value={tono}
                    onChange={(e) => elegirTono(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                </label>
                <button type="button" onClick={() => void probarVoz()} disabled={!permisoListo}>Probar voz</button>
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
