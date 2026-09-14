import { useEffect, useState } from 'react'
import { useGastos } from '../../domain/gastos/store'
import { sincronizarGastosPendientes } from '../../domain/gastos/sync'
import type { CategoriaGasto } from '../../domain/gastos/types'

const CATEGORIAS: { valor: CategoriaGasto; etiqueta: string }[] = [
  { valor: 'gasolina', etiqueta: 'Gasolina' },
  { valor: 'aceite', etiqueta: 'Aceite' },
  { valor: 'llantas', etiqueta: 'Llantas' },
  { valor: 'mantenimiento', etiqueta: 'Mantenimiento' },
  { valor: 'otro', etiqueta: 'Otro' },
]

export function SeccionGastos() {
  const { gastos, cargando, cargar, agregarGasto } = useGastos()

  const [categoria, setCategoria] = useState<CategoriaGasto>('gasolina')
  const [monto, setMonto] = useState('')
  const [litros, setLitros] = useState('')
  const [notas, setNotas] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function manejarAgregar() {
    setError(null)
    const montoNumero = Number(monto)
    if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
      setError('El monto tiene que ser un número mayor a 0.')
      return
    }
    const litrosNumero = categoria === 'gasolina' && litros.trim() !== '' ? Number(litros) : null
    if (litrosNumero !== null && (!Number.isFinite(litrosNumero) || litrosNumero <= 0)) {
      setError('Los litros tienen que ser un número mayor a 0 (o dejar el campo vacío).')
      return
    }
    setGuardando(true)
    try {
      await agregarGasto({ categoria, monto: montoNumero, litros: litrosNumero, notas: notas.trim() || null })
      void sincronizarGastosPendientes()
      setMonto('')
      setLitros('')
      setNotas('')
    } finally {
      setGuardando(false)
    }
  }

  const gastosOrdenados = [...gastos].sort((a, b) => b.fechaISO.localeCompare(a.fechaISO))

  return (
    <>
      <h2 className="titulo-pantalla" style={{ fontSize: 18 }}>Gastos de jornada</h2>
      <div className="tarjeta-viaje" style={{ marginBottom: 16, flexDirection: 'column', gap: 12, alignItems: 'stretch' }}>
        <label className="texto-mute">
          Categoría
          <select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaGasto)} style={{ display: 'block', width: '100%' }}>
            {CATEGORIAS.map((c) => (
              <option key={c.valor} value={c.valor}>{c.etiqueta}</option>
            ))}
          </select>
        </label>
        <label className="texto-mute">
          Monto
          <input type="number" inputMode="decimal" placeholder="Ej. 40000" value={monto} onChange={(e) => setMonto(e.target.value)} style={{ display: 'block', width: '100%' }} />
        </label>
        {categoria === 'gasolina' && (
          <label className="texto-mute">
            Litros (opcional)
            <input type="number" inputMode="decimal" placeholder="Ej. 8.2" value={litros} onChange={(e) => setLitros(e.target.value)} style={{ display: 'block', width: '100%' }} />
          </label>
        )}
        <label className="texto-mute">
          Notas (opcional)
          <input type="text" value={notas} onChange={(e) => setNotas(e.target.value)} style={{ display: 'block', width: '100%' }} />
        </label>
        {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}
        <button type="button" onClick={() => void manejarAgregar()} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Agregar gasto'}
        </button>
      </div>

      {cargando && <p className="texto-mute">Cargando…</p>}
      {!cargando && gastosOrdenados.length === 0 && <p className="texto-mute" style={{ marginBottom: 24 }}>Todavía no hay gastos cargados.</p>}
      {gastosOrdenados.length > 0 && (
        <ul className="lista-viajes" style={{ marginBottom: 24, maxHeight: 240, overflowY: 'auto' }}>
          {gastosOrdenados.slice(0, 20).map((g) => (
            <li key={g.id} className="tarjeta-viaje" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
              <strong>{CATEGORIAS.find((c) => c.valor === g.categoria)?.etiqueta ?? g.categoria} — ${g.monto.toLocaleString('es-CO')}</strong>
              <span className="texto-mute">{new Date(g.fechaISO).toLocaleString('es-CO')}</span>
              {g.litros !== null && <span className="texto-mute">{g.litros} L</span>}
              {g.notas && <span className="texto-mute">{g.notas}</span>}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
