import { useEffect, useState } from 'react'
import { useAhorro } from '../../domain/ahorro/store'
import { sincronizarAhorroPendiente } from '../../domain/ahorro/sync'
import { CampoMonto } from '../../components/CampoMonto'
import type { FrecuenciaCuota } from '../../domain/deudas/types'

const FRECUENCIAS: { valor: FrecuenciaCuota; etiqueta: string }[] = [
  { valor: 'semanal', etiqueta: 'Semanal' },
  { valor: 'quincenal', etiqueta: 'Quincenal' },
  { valor: 'mensual', etiqueta: 'Mensual' },
]

/** Mismo patrón exacto que SeccionDeudas.tsx, invertido: el saldo SUBE hacia el objetivo en vez de bajar. */
export function SeccionAhorro() {
  const { metas, cargando, cargar, agregarMeta, abonar, actualizarAportePlaneado } = useAhorro()

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [nombre, setNombre] = useState('')
  const [montoObjetivo, setMontoObjetivo] = useState('')
  const [aporteMonto, setAporteMonto] = useState('')
  const [aporteFrecuencia, setAporteFrecuencia] = useState<FrecuenciaCuota>('mensual')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [montosAbono, setMontosAbono] = useState<Record<string, string>>({})
  /**
   * 2026-09-16, corrección de un bug real ("no aumentaba la meta diaria...
   * si pongo semanalmente X valor, tiene que coger ese valor semanalmente"):
   * el aporte planeado de cada meta ya existente ahora también lleva
   * frecuencia, no solo monto — mismo patrón `montosAbono`, un Record por
   * meta mientras se edita.
   */
  const [aportesEdicionMonto, setAportesEdicionMonto] = useState<Record<string, string>>({})
  const [aportesEdicionFrecuencia, setAportesEdicionFrecuencia] = useState<Record<string, FrecuenciaCuota>>({})

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
      const aporteNumero = Number(aporteMonto)
      const aportePlaneado = Number.isFinite(aporteNumero) && aporteNumero > 0 ? { monto: aporteNumero, frecuencia: aporteFrecuencia } : null
      await agregarMeta(nombre.trim(), objetivoNumero, aportePlaneado)
      void sincronizarAhorroPendiente()
      setNombre('')
      setMontoObjetivo('')
      setAporteMonto('')
      setMostrarFormulario(false)
    } finally {
      setGuardando(false)
    }
  }

  async function manejarActualizarAporte(metaId: string) {
    const texto = aportesEdicionMonto[metaId] ?? ''
    const monto = Number(texto)
    const frecuencia = aportesEdicionFrecuencia[metaId] ?? 'mensual'
    await actualizarAportePlaneado(metaId, texto && Number.isFinite(monto) && monto > 0 ? { monto, frecuencia } : null)
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
          Aporte que querés meterle (opcional)
          <CampoMonto valor={aporteMonto} onValorCambia={setAporteMonto} placeholder="Ej. 50.000" />
        </label>
        <label className="texto-mute">
          Cada cuánto
          <select value={aporteFrecuencia} onChange={(e) => setAporteFrecuencia(e.target.value as FrecuenciaCuota)} style={{ display: 'block', width: '100%' }}>
            {FRECUENCIAS.map((f) => (
              <option key={f.valor} value={f.valor}>{f.etiqueta}</option>
            ))}
          </select>
          <span style={{ display: 'block', fontSize: '0.72rem', marginTop: 2 }}>
            Se usa para calcular tu meta diaria (Trabajo) — no es un abono, es solo cuánto planeás meterle y con qué frecuencia.
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
                  valor={aportesEdicionMonto[m.id] ?? (m.aportePlaneado ? String(m.aportePlaneado.monto) : '')}
                  onValorCambia={(crudo) => setAportesEdicionMonto((actuales) => ({ ...actuales, [m.id]: crudo }))}
                  placeholder="Aporte planeado"
                  style={{ flex: 1 }}
                />
                <select
                  value={aportesEdicionFrecuencia[m.id] ?? m.aportePlaneado?.frecuencia ?? 'mensual'}
                  onChange={(e) => setAportesEdicionFrecuencia((actuales) => ({ ...actuales, [m.id]: e.target.value as FrecuenciaCuota }))}
                >
                  {FRECUENCIAS.map((f) => (
                    <option key={f.valor} value={f.valor}>{f.etiqueta}</option>
                  ))}
                </select>
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
