import { useEffect, useState } from 'react'
import { useDeudas } from '../../domain/deudas/store'
import { sincronizarDeudasPendientes } from '../../domain/deudas/sync'
import type { FrecuenciaCuota } from '../../domain/deudas/types'

const FRECUENCIAS: { valor: FrecuenciaCuota; etiqueta: string }[] = [
  { valor: 'semanal', etiqueta: 'Semanal' },
  { valor: 'quincenal', etiqueta: 'Quincenal' },
  { valor: 'mensual', etiqueta: 'Mensual' },
]

export function SeccionDeudas() {
  const { deudas, cargando, cargar, agregarDeuda, abonar } = useDeudas()

  const [nombre, setNombre] = useState('')
  const [saldoInicial, setSaldoInicial] = useState('')
  const [tieneCuota, setTieneCuota] = useState(false)
  const [montoCuota, setMontoCuota] = useState('')
  const [frecuenciaCuota, setFrecuenciaCuota] = useState<FrecuenciaCuota>('mensual')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [montosAbono, setMontosAbono] = useState<Record<string, string>>({})

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function manejarAgregar() {
    setError(null)
    const saldoNumero = Number(saldoInicial)
    if (!Number.isFinite(saldoNumero) || saldoNumero <= 0) {
      setError('El saldo inicial tiene que ser un número mayor a 0.')
      return
    }
    if (!nombre.trim()) {
      setError('Ponele un nombre a la deuda (ej. "Tarjeta", "Préstamo moto").')
      return
    }
    let cuota = null
    if (tieneCuota) {
      const montoNumero = Number(montoCuota)
      if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
        setError('El monto de la cuota tiene que ser un número mayor a 0 (o desmarcá "tiene cuota fija").')
        return
      }
      cuota = { monto: montoNumero, frecuencia: frecuenciaCuota }
    }
    setGuardando(true)
    try {
      await agregarDeuda(nombre.trim(), saldoNumero, cuota)
      void sincronizarDeudasPendientes()
      setNombre('')
      setSaldoInicial('')
      setTieneCuota(false)
      setMontoCuota('')
    } finally {
      setGuardando(false)
    }
  }

  async function manejarAbonar(deudaId: string) {
    const texto = montosAbono[deudaId] ?? ''
    const monto = Number(texto)
    if (!Number.isFinite(monto) || monto <= 0) return
    await abonar(deudaId, monto)
    void sincronizarDeudasPendientes()
    setMontosAbono((actuales) => ({ ...actuales, [deudaId]: '' }))
  }

  const activas = deudas.filter((d) => d.saldoActual > 0)
  const pagadas = deudas.filter((d) => d.saldoActual <= 0)

  return (
    <>
      <p className="texto-mute" style={{ marginBottom: 16 }}>
        Cargá la deuda una vez con su saldo inicial, y andá abonando — el saldo baja solo.
      </p>

      <div className="tarjeta-viaje" style={{ marginBottom: 16, flexDirection: 'column', gap: 12, alignItems: 'stretch' }}>
        <label className="texto-mute">
          Nombre
          <input type="text" placeholder='Ej. "Tarjeta de crédito"' value={nombre} onChange={(e) => setNombre(e.target.value)} style={{ display: 'block', width: '100%' }} />
        </label>
        <label className="texto-mute">
          Saldo inicial
          <input type="number" inputMode="decimal" placeholder="Ej. 500000" value={saldoInicial} onChange={(e) => setSaldoInicial(e.target.value)} style={{ display: 'block', width: '100%' }} />
        </label>
        <label className="texto-mute">
          <input type="checkbox" checked={tieneCuota} onChange={(e) => setTieneCuota(e.target.checked)} /> Tiene cuota fija programada
        </label>
        {tieneCuota && (
          <>
            <label className="texto-mute">
              Monto de la cuota
              <input type="number" inputMode="decimal" placeholder="Ej. 50000" value={montoCuota} onChange={(e) => setMontoCuota(e.target.value)} style={{ display: 'block', width: '100%' }} />
            </label>
            <label className="texto-mute">
              Frecuencia
              <select value={frecuenciaCuota} onChange={(e) => setFrecuenciaCuota(e.target.value as FrecuenciaCuota)} style={{ display: 'block', width: '100%' }}>
                {FRECUENCIAS.map((f) => (
                  <option key={f.valor} value={f.valor}>{f.etiqueta}</option>
                ))}
              </select>
            </label>
          </>
        )}
        {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}
        <button type="button" onClick={() => void manejarAgregar()} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Agregar deuda'}
        </button>
      </div>

      <h3 className="texto-mute">Activas</h3>
      {cargando && <p className="texto-mute">Cargando…</p>}
      {!cargando && activas.length === 0 && <p className="texto-mute">No hay deudas activas.</p>}
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {activas.map((d) => (
          <li key={d.id} className="tarjeta-viaje" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
            <strong>{d.nombre}</strong>
            <span className="texto-mute">
              Saldo: ${d.saldoActual.toLocaleString('es-CO')} de ${d.saldoInicial.toLocaleString('es-CO')}
            </span>
            {d.cuotaProgramada && (
              <span className="texto-mute">
                Cuota: ${d.cuotaProgramada.monto.toLocaleString('es-CO')} {FRECUENCIAS.find((f) => f.valor === d.cuotaProgramada!.frecuencia)?.etiqueta.toLowerCase()}
              </span>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="number"
                inputMode="decimal"
                placeholder="Monto a abonar"
                value={montosAbono[d.id] ?? ''}
                onChange={(e) => setMontosAbono((actuales) => ({ ...actuales, [d.id]: e.target.value }))}
                style={{ flex: 1 }}
              />
              <button type="button" onClick={() => void manejarAbonar(d.id)}>Abonar</button>
            </div>
          </li>
        ))}
      </ul>

      {pagadas.length > 0 && (
        <>
          <h3 className="texto-mute">Pagadas</h3>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pagadas.map((d) => (
              <li key={d.id} className="texto-mute">{d.nombre} — pagada</li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
