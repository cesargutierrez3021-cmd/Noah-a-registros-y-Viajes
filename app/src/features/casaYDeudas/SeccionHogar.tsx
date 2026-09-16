import { useEffect, useState } from 'react'
import { useHogar } from '../../domain/hogar/store'
import { sincronizarHogarPendiente } from '../../domain/hogar/sync'
import { CampoMonto } from '../../components/CampoMonto'

export function SeccionHogar() {
  const { gastos, conceptos, cargando, cargar, agregarGastoUnico, agregarConceptoFijo, actualizarMontoConceptoFijo, desactivarConceptoFijo } = useHogar()

  const [mostrarFormUnico, setMostrarFormUnico] = useState(false)
  const [mostrarFormFijo, setMostrarFormFijo] = useState(false)

  const [nombreUnico, setNombreUnico] = useState('')
  const [montoUnico, setMontoUnico] = useState('')
  const [errorUnico, setErrorUnico] = useState<string | null>(null)
  const [guardandoUnico, setGuardandoUnico] = useState(false)

  const [nombreFijo, setNombreFijo] = useState('')
  const [montoFijo, setMontoFijo] = useState('')
  const [diaFijo, setDiaFijo] = useState('1')
  const [errorFijo, setErrorFijo] = useState<string | null>(null)
  const [guardandoFijo, setGuardandoFijo] = useState(false)

  const [montosEdicion, setMontosEdicion] = useState<Record<string, string>>({})

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function manejarAgregarUnico() {
    setErrorUnico(null)
    const monto = Number(montoUnico)
    if (!Number.isFinite(monto) || monto <= 0) {
      setErrorUnico('El monto tiene que ser un número mayor a 0.')
      return
    }
    if (!nombreUnico.trim()) {
      setErrorUnico('Ponele un nombre al gasto (ej. "Reparación de la nevera").')
      return
    }
    setGuardandoUnico(true)
    try {
      await agregarGastoUnico(nombreUnico.trim(), monto)
      void sincronizarHogarPendiente()
      setNombreUnico('')
      setMontoUnico('')
      setMostrarFormUnico(false)
    } finally {
      setGuardandoUnico(false)
    }
  }

  async function manejarAgregarFijo() {
    setErrorFijo(null)
    const monto = Number(montoFijo)
    const dia = Number(diaFijo)
    if (!Number.isFinite(monto) || monto <= 0) {
      setErrorFijo('El monto esperado tiene que ser un número mayor a 0.')
      return
    }
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
      setErrorFijo('El día del mes tiene que ser un número entre 1 y 31.')
      return
    }
    if (!nombreFijo.trim()) {
      setErrorFijo('Ponele un nombre al gasto fijo (ej. "Arriendo", "Internet").')
      return
    }
    setGuardandoFijo(true)
    try {
      await agregarConceptoFijo(nombreFijo.trim(), monto, dia)
      void sincronizarHogarPendiente()
      setNombreFijo('')
      setMontoFijo('')
      setDiaFijo('1')
      setMostrarFormFijo(false)
    } finally {
      setGuardandoFijo(false)
    }
  }

  async function manejarActualizarMonto(id: string) {
    const texto = montosEdicion[id] ?? ''
    const monto = Number(texto)
    if (!Number.isFinite(monto) || monto <= 0) return
    await actualizarMontoConceptoFijo(id, monto)
    void sincronizarHogarPendiente()
    setMontosEdicion((actuales) => ({ ...actuales, [id]: '' }))
  }

  async function manejarDesactivar(id: string) {
    await desactivarConceptoFijo(id)
    void sincronizarHogarPendiente()
  }

  const conceptosActivos = conceptos.filter((c) => c.activo)
  const historialOrdenado = [...gastos].sort((a, b) => b.fechaISO.localeCompare(a.fechaISO))

  return (
    <>
      <p className="texto-mute" style={{ marginBottom: 16 }}>
        Los gastos fijos (arriendo, servicios) se cargan una sola vez y se autogeneran solos cada mes.
      </p>

      <h3 className="texto-mute">Gasto único</h3>
      {/* 2026-09-16, pedido explícito del usuario: menos scroll — el formulario queda detrás de un botón. */}
      <button type="button" style={{ marginBottom: 16 }} onClick={() => setMostrarFormUnico((v) => !v)}>
        {mostrarFormUnico ? 'Cancelar' : '+ Agregar gasto único'}
      </button>
      {mostrarFormUnico && (
      <div className="tarjeta-viaje" style={{ marginBottom: 16, flexDirection: 'column', gap: 12, alignItems: 'stretch' }}>
        <label className="texto-mute">
          Nombre
          <input type="text" placeholder='Ej. "Reparación nevera"' value={nombreUnico} onChange={(e) => setNombreUnico(e.target.value)} style={{ display: 'block', width: '100%' }} />
        </label>
        <label className="texto-mute">
          Monto
          <CampoMonto valor={montoUnico} onValorCambia={setMontoUnico} placeholder="Ej. 120.000" />
        </label>
        {errorUnico && <p style={{ color: '#ff6b6b' }}>{errorUnico}</p>}
        <button type="button" onClick={() => void manejarAgregarUnico()} disabled={guardandoUnico}>
          {guardandoUnico ? 'Guardando…' : 'Agregar gasto único'}
        </button>
      </div>
      )}

      <h3 className="texto-mute">Gasto fijo mensual</h3>
      <button type="button" style={{ marginBottom: 16 }} onClick={() => setMostrarFormFijo((v) => !v)}>
        {mostrarFormFijo ? 'Cancelar' : '+ Agregar gasto fijo'}
      </button>
      {mostrarFormFijo && (
      <div className="tarjeta-viaje" style={{ marginBottom: 16, flexDirection: 'column', gap: 12, alignItems: 'stretch' }}>
        <label className="texto-mute">
          Nombre
          <input type="text" placeholder='Ej. "Arriendo", "Internet"' value={nombreFijo} onChange={(e) => setNombreFijo(e.target.value)} style={{ display: 'block', width: '100%' }} />
        </label>
        <label className="texto-mute">
          Monto esperado cada mes
          <CampoMonto valor={montoFijo} onValorCambia={setMontoFijo} placeholder="Ej. 500.000" />
        </label>
        <label className="texto-mute">
          Día del mes en que se paga
          <input type="number" inputMode="numeric" min={1} max={31} value={diaFijo} onChange={(e) => setDiaFijo(e.target.value)} style={{ display: 'block', width: '100%' }} />
        </label>
        {errorFijo && <p style={{ color: '#ff6b6b' }}>{errorFijo}</p>}
        <button type="button" onClick={() => void manejarAgregarFijo()} disabled={guardandoFijo}>
          {guardandoFijo ? 'Guardando…' : 'Agregar gasto fijo'}
        </button>
      </div>
      )}

      <h3 className="texto-mute">Gastos fijos activos</h3>
      {!cargando && conceptosActivos.length === 0 && <p className="texto-mute">No hay gastos fijos activos.</p>}
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {conceptosActivos.map((c) => (
          <li key={c.id} className="tarjeta-viaje" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
            <strong>{c.nombre}</strong>
            <span className="texto-mute">${c.montoEsperado.toLocaleString('es-CO')} — día {c.diaDelMes} de cada mes</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <CampoMonto
                valor={montosEdicion[c.id] ?? ''}
                onValorCambia={(crudo) => setMontosEdicion((actuales) => ({ ...actuales, [c.id]: crudo }))}
                placeholder="Nuevo monto"
                style={{ flex: 1 }}
              />
              <button type="button" onClick={() => void manejarActualizarMonto(c.id)}>Actualizar monto</button>
              <button type="button" onClick={() => void manejarDesactivar(c.id)}>Desactivar</button>
            </div>
          </li>
        ))}
      </ul>

      <h3 className="texto-mute">Historial</h3>
      {cargando && <p className="texto-mute">Cargando…</p>}
      {!cargando && historialOrdenado.length === 0 && <p className="texto-mute">Todavía no hay gastos de hogar.</p>}
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {historialOrdenado.slice(0, 20).map((g) => (
          <li key={g.id} className="texto-mute">
            {new Date(g.fechaISO).toLocaleDateString('es-CO')} — {g.nombre}: ${g.monto.toLocaleString('es-CO')}
            {g.tipo === 'fijo' ? ' (fijo)' : ''}
          </li>
        ))}
      </ul>
    </>
  )
}
