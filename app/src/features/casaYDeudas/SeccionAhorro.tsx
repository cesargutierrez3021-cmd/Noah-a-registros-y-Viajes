import { useEffect, useState } from 'react'
import { useAhorro } from '../../domain/ahorro/store'
import { sincronizarAhorroPendiente } from '../../domain/ahorro/sync'

/** Mismo patrón exacto que SeccionDeudas.tsx, invertido: el saldo SUBE hacia el objetivo en vez de bajar. */
export function SeccionAhorro() {
  const { metas, cargando, cargar, agregarMeta, abonar } = useAhorro()

  const [nombre, setNombre] = useState('')
  const [montoObjetivo, setMontoObjetivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [montosAbono, setMontosAbono] = useState<Record<string, string>>({})

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
      await agregarMeta(nombre.trim(), objetivoNumero)
      void sincronizarAhorroPendiente()
      setNombre('')
      setMontoObjetivo('')
    } finally {
      setGuardando(false)
    }
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

      <div className="tarjeta-viaje" style={{ marginBottom: 16, flexDirection: 'column', gap: 12, alignItems: 'stretch' }}>
        <label className="texto-mute">
          Nombre
          <input type="text" placeholder='Ej. "Imprevistos"' value={nombre} onChange={(e) => setNombre(e.target.value)} style={{ display: 'block', width: '100%' }} />
        </label>
        <label className="texto-mute">
          Meta (monto a juntar)
          <input type="number" inputMode="decimal" placeholder="Ej. 300000" value={montoObjetivo} onChange={(e) => setMontoObjetivo(e.target.value)} style={{ display: 'block', width: '100%' }} />
        </label>
        {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}
        <button type="button" onClick={() => void manejarAgregar()} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Crear meta'}
        </button>
      </div>

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
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Monto a abonar"
                  value={montosAbono[m.id] ?? ''}
                  onChange={(e) => setMontosAbono((actuales) => ({ ...actuales, [m.id]: e.target.value }))}
                  style={{ flex: 1 }}
                />
                <button type="button" onClick={() => void manejarAbonar(m.id)}>Abonar</button>
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
