import { useEffect, useState } from 'react'
import { useAhorro } from '../../domain/ahorro/store'
import { sincronizarAhorroPendiente } from '../../domain/ahorro/sync'
import { CampoMonto } from '../../components/CampoMonto'

/** Mismo patrón exacto que SeccionDeudas.tsx, invertido: el saldo SUBE hacia el objetivo en vez de bajar. */
export function SeccionAhorro() {
  const { metas, cargando, cargar, agregarMeta, abonar, actualizarAporteMensual } = useAhorro()

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [nombre, setNombre] = useState('')
  const [montoObjetivo, setMontoObjetivo] = useState('')
  const [aporteMensual, setAporteMensual] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [montosAbono, setMontosAbono] = useState<Record<string, string>>({})
  /** Aporte mensual en edición por meta ya creada — solo mientras se está tecleando, se guarda al confirmar (mismo patrón que montosAbono). */
  const [aportesEdicion, setAportesEdicion] = useState<Record<string, string>>({})

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function manejarAgregar() {
    setError(null)
    const objetivoNumero = Number(montoObjetivo)
    if (!Number.isFinite(objetivoNumero) || objetivoNumero <= 0) {
      setError('La meta tiene que ser un número mayor a 0.')
      return
    }
    if (!nombre.trim()) {
      setError('Ponele un nombre a la meta (ej. "Imprevistos", "Llantas nuevas").')
      return
    }
    setGuardando(true)
    try {
      const aporteNumero = Number(aporteMensual)
      await agregarMeta(nombre.trim(), objetivoNumero, Number.isFinite(aporteNumero) && aporteNumero > 0 ? aporteNumero : null)
      void sincronizarAhorroPendiente()
      setNombre('')
      setMontoObjetivo('')
      setAporteMensual('')
      setMostrarFormulario(false)
    } finally {
      setGuardando(false)
    }
  }

  async function manejarActualizarAporte(metaId: string) {
    const texto = aportesEdicion[metaId] ?? ''
    const monto = Number(texto)
    await actualizarAporteMensual(metaId, texto && Number.isFinite(monto) && monto > 0 ? monto : null)
    void sincronizarAhorroPendiente()
  }

  async function manejarAbonar(metaId: string) {
    const texto = montosAbono[metaId] ?? ''
    const monto = Number(texto)
    if (!Number.isFinite(monto) || monto <= 0) return
    await abonar(metaId, monto)
    void sincronizarAhorroPendiente()
    setMontosAbono((actuales) => ({ ...actuales, [metaId]: '' }))
  }

  const enProgreso = metas.filter((m) => m.saldoActual < m.montoObjetivo)
  const cumplidas = metas.filter((m) => m.saldoActual >= m.montoObjetivo)

  return (
    <>
      <p className="texto-mute" style={{ marginBottom: 16 }}>
        Ponete una meta con el monto que querés juntar, y andá abonando — el saldo sube solo hasta llegar.
      </p>

      <button type="button" style={{ marginBottom: 16 }} onClick={() => setMostrarFormulario((v) => !v)}>
        {mostrarFormulario ? 'Cancelar' : '+ Agregar meta'}
      </button>

      {mostrarFormulario && (
      <div className="tarjeta-viaje" style={{ marginBottom: 16, flexDirection: 'column', gap: 12, alignItems: 'stretch' }}>
        <label className="texto-mute">
          Nombre
          <input type="text" placeholder='Ej. "Imprevistos"' value={nombre} onChange={(e) => setNombre(e.target.value)} style={{ display: 'block', width: '100%' }} />
        </label>
        <label className="texto-mute">
          Meta (monto a juntar)
          <CampoMonto valor={montoObjetivo} onValorCambia={setMontoObjetivo} placeholder="Ej. 300.000" />
        </label>
        <label className="texto-mute">
          Aporte mensual que querés meterle (opcional)
          <CampoMonto valor={aporteMensual} onValorCambia={setAporteMensual} placeholder="Ej. 50.000" />
          <span style={{ display: 'block', fontSize: '0.72rem', marginTop: 2 }}>
            Se usa para calcular tu meta diaria (Trabajo) — no es un abono, es solo cuánto planeás meterle cada mes.
          </span>
        </label>
        {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}
        <button type="button" onClick={() => void manejarAgregar()} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Crear meta'}
        </button>
      </div>
      )}

      <h3 className="texto-mute">En progreso</h3>
      {cargando && <p className="texto-mute">Cargando…</p>}
      {!cargando && enProgreso.length === 0 && <p className="texto-mute">No tenés metas de ahorro todavía.</p>}
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {enProgreso.map((m) => {
          const porcentaje = Math.round((m.saldoActual / m.montoObjetivo) * 100)
          return (
            <li key={m.id} className="tarjeta-viaje" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
              <strong>{m.nombre}</strong>
              <span className="texto-mute">
                ${m.saldoActual.toLocaleString('es-CO')} de ${m.montoObjetivo.toLocaleString('es-CO')} · {porcentaje}%
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <CampoMonto
                  valor={montosAbono[m.id] ?? ''}
                  onValorCambia={(crudo) => setMontosAbono((actuales) => ({ ...actuales, [m.id]: crudo }))}
                  placeholder="Monto a abonar"
                  style={{ flex: 1 }}
                />
                <button type="button" onClick={() => void manejarAbonar(m.id)}>Abonar</button>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <CampoMonto
                  valor={aportesEdicion[m.id] ?? (m.aporteMensualObjetivo ? String(m.aporteMensualObjetivo) : '')}
                  onValorCambia={(crudo) => setAportesEdicion((actuales) => ({ ...actuales, [m.id]: crudo }))}
                  placeholder="Aporte mensual planeado"
                  style={{ flex: 1 }}
                />
                <button type="button" onClick={() => void manejarActualizarAporte(m.id)} style={{ background: 'transparent' }}>
                  Guardar
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {cumplidas.length > 0 && (
        <>
          <h3 className="texto-mute">Cumplidas</h3>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cumplidas.map((m) => (
              <li key={m.id} className="texto-mute">{m.nombre} — meta cumplida 🎉</li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
