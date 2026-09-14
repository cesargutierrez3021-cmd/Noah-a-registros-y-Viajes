import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useViajes } from '../../domain/viajes/store'
import { useJornada } from '../../domain/jornada/store'
import { sincronizarViajesPendientes } from '../../domain/viajes/sync'
import { sincronizarJornadasPendientes } from '../../domain/jornada/sync'
import type { Plataforma } from '../../domain/viajes/types'

const PLATAFORMAS: Plataforma[] = ['Uber', 'DiDi', 'inDrive', 'Cabify', 'Picap', 'Rappi', 'Particular']

function fechaHoraLocalParaInput(fecha: Date): string {
  // datetime-local necesita 'YYYY-MM-DDTHH:mm' en hora LOCAL, no ISO/UTC —
  // por eso no se usa toISOString() acá directo.
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`
}

/**
 * Bloque 2, ítem 4 — "agregar viaje manual": para un viaje que ya pasó y no
 * se registró con el flujo de GPS (se olvidó marcarlo, o el conductor
 * prefiere cargarlo después). Reutiliza `agregarViajeManual` del store de
 * viajes (mismo `Viaje`, ver domain/viajes/types.ts) y, si hay una jornada
 * abierta, lo agrega ahí también — mismo criterio de orquestación que ya usa
 * `ViajesScreen.tsx` con `finalizarViaje` (D-10: la coordinación entre
 * jornada y viajes pasa acá, nunca dentro de un store).
 */
export function AgregarViajeManualScreen() {
  const navigate = useNavigate()
  const agregarViajeManual = useViajes((s) => s.agregarViajeManual)
  const { jornadaAbierta, agregarViajeAJornadaAbierta } = useJornada()

  const ahora = new Date()
  const haceMediaHora = new Date(ahora.getTime() - 30 * 60 * 1000)

  const [plataforma, setPlataforma] = useState<Plataforma>('Uber')
  const [inicio, setInicio] = useState(fechaHoraLocalParaInput(haceMediaHora))
  const [fin, setFin] = useState(fechaHoraLocalParaInput(ahora))
  const [km, setKm] = useState('')
  const [ingreso, setIngreso] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function manejarGuardar() {
    setError(null)

    const inicioMs = new Date(inicio).getTime()
    const finMs = new Date(fin).getTime()
    const kmNumero = Number(km)
    const ingresoNumero = Number(ingreso)

    if (Number.isNaN(inicioMs) || Number.isNaN(finMs)) {
      setError('Revisa las fechas — alguna quedó vacía o mal escrita.')
      return
    }
    if (finMs <= inicioMs) {
      setError('La hora de fin tiene que ser después de la de inicio.')
      return
    }
    if (!Number.isFinite(kmNumero) || kmNumero <= 0) {
      setError('Los km tienen que ser un número mayor a 0.')
      return
    }
    if (!Number.isFinite(ingresoNumero) || ingresoNumero < 0) {
      setError('El ingreso tiene que ser un número — 0 si no ganaste nada, pero no vacío.')
      return
    }

    setGuardando(true)
    try {
      const viaje = await agregarViajeManual({
        plataforma,
        inicioISO: new Date(inicioMs).toISOString(),
        finISO: new Date(finMs).toISOString(),
        kmTotalesReales: kmNumero,
        distanciaReportadaPlataforma: null,
        ingreso: ingresoNumero,
        localidad: null,
        zona: null,
      })

      if (jornadaAbierta()) {
        await agregarViajeAJornadaAbierta(viaje.id)
        void sincronizarJornadasPendientes()
      }
      void sincronizarViajesPendientes()

      navigate('/')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="pantalla"><div className="app-panel">
      <h1 className="titulo-pantalla">Agregar viaje manual</h1>
      <p className="texto-mute" style={{ marginBottom: 16 }}>
        Para un viaje que ya pasó y no quedó registrado con el GPS. Sin recorrido — los km se escriben directo.
      </p>

      <div className="tarjeta-viaje" style={{ flexDirection: 'column', gap: 12, alignItems: 'stretch' }}>
        <label className="texto-mute">
          Plataforma
          <select value={plataforma} onChange={(e) => setPlataforma(e.target.value as Plataforma)} style={{ display: 'block', width: '100%' }}>
            {PLATAFORMAS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>

        <label className="texto-mute">
          Inicio
          <input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} style={{ display: 'block', width: '100%' }} />
        </label>

        <label className="texto-mute">
          Fin
          <input type="datetime-local" value={fin} onChange={(e) => setFin(e.target.value)} style={{ display: 'block', width: '100%' }} />
        </label>

        <label className="texto-mute">
          Kilómetros totales
          <input type="number" inputMode="decimal" placeholder="Ej. 8.5" value={km} onChange={(e) => setKm(e.target.value)} style={{ display: 'block', width: '100%' }} />
        </label>

        <label className="texto-mute">
          Ingreso
          <input type="number" inputMode="decimal" placeholder="Ej. 18000" value={ingreso} onChange={(e) => setIngreso(e.target.value)} style={{ display: 'block', width: '100%' }} />
        </label>

        {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}

        <button type="button" onClick={() => void manejarGuardar()} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar viaje'}
        </button>
        <button type="button" onClick={() => navigate('/')} disabled={guardando}>
          Cancelar
        </button>
      </div>
    </div></section>
  )
}
