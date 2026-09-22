import { useEffect, useState } from 'react'
import { useDeudas } from '../../domain/deudas/store'
import { sincronizarDeudasPendientes } from '../../domain/deudas/sync'
import type { FrecuenciaCuota } from '../../domain/deudas/types'
import { CampoMonto } from '../../components/CampoMonto'

const FRECUENCIAS: { valor: FrecuenciaCuota; etiqueta: string }[] = [
  { valor: 'semanal', etiqueta: 'Semanal' },
  { valor: 'quincenal', etiqueta: 'Quincenal' },
  { valor: 'mensual', etiqueta: 'Mensual' },
]

const DIAS_SEMANA: { valor: number; etiqueta: string }[] = [
  { valor: 1, etiqueta: 'Lunes' },
  { valor: 2, etiqueta: 'Martes' },
  { valor: 3, etiqueta: 'Miércoles' },
  { valor: 4, etiqueta: 'Jueves' },
  { valor: 5, etiqueta: 'Viernes' },
  { valor: 6, etiqueta: 'Sábado' },
  { valor: 0, etiqueta: 'Domingo' },
]

/** Texto corto de la ancla real de una cuota (ver CuotaProgramada.diaDelMes/diasDelMes/diaDeLaSemana) — '' si es una cuota vieja sin ancla puesta. */
function textoAncla(cuota: { frecuencia: FrecuenciaCuota; diaDelMes?: number | null; diasDelMes?: [number, number] | null; diaDeLaSemana?: number | null }): string {
  if (cuota.frecuencia === 'mensual' && cuota.diaDelMes != null) return ` · día ${cuota.diaDelMes} de cada mes`
  if (cuota.frecuencia === 'quincenal' && cuota.diasDelMes) return ` · días ${cuota.diasDelMes[0]} y ${cuota.diasDelMes[1]} de cada mes`
  if (cuota.frecuencia === 'semanal' && cuota.diaDeLaSemana != null) return ` · cada ${DIAS_SEMANA.find((d) => d.valor === cuota.diaDeLaSemana)?.etiqueta.toLowerCase()}`
  return ''
}

export function SeccionDeudas() {
  const { deudas, abonos, cargando, cargar, agregarDeuda, abonar, actualizarFechaLimite } = useDeudas()

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [nombre, setNombre] = useState('')
  const [saldoInicial, setSaldoInicial] = useState('')
  const [tieneCuota, setTieneCuota] = useState(false)
  const [montoCuota, setMontoCuota] = useState('')
  const [frecuenciaCuota, setFrecuenciaCuota] = useState<FrecuenciaCuota>('mensual')
  const [diaDelMesCuota, setDiaDelMesCuota] = useState('1')
  const [diasDelMesCuota, setDiasDelMesCuota] = useState<[string, string]>(['1', '15'])
  const [diaDeLaSemanaCuota, setDiaDeLaSemanaCuota] = useState(1)
  const [fechaLimite, setFechaLimite] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [montosAbono, setMontosAbono] = useState<Record<string, string>>({})
  const [fechasEdicion, setFechasEdicion] = useState<Record<string, string>>({})

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
      cuota = {
        monto: montoNumero,
        frecuencia: frecuenciaCuota,
        diaDelMes: frecuenciaCuota === 'mensual' ? Number(diaDelMesCuota) || 1 : null,
        diasDelMes: frecuenciaCuota === 'quincenal' ? [Number(diasDelMesCuota[0]) || 1, Number(diasDelMesCuota[1]) || 15] as [number, number] : null,
        diaDeLaSemana: frecuenciaCuota === 'semanal' ? diaDeLaSemanaCuota : null,
      }
    }
    setGuardando(true)
    try {
      await agregarDeuda(nombre.trim(), saldoNumero, cuota, fechaLimite ? new Date(fechaLimite).toISOString() : null)
      void sincronizarDeudasPendientes()
      setNombre('')
      setSaldoInicial('')
      setTieneCuota(false)
      setMontoCuota('')
      setFechaLimite('')
      setMostrarFormulario(false)
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

  async function manejarActualizarFecha(deudaId: string) {
    const fecha = fechasEdicion[deudaId]
    if (!fecha) return
    await actualizarFechaLimite(deudaId, new Date(fecha).toISOString())
    void sincronizarDeudasPendientes()
    setFechasEdicion((actuales) => ({ ...actuales, [deudaId]: '' }))
  }

  /**
   * 2026-09-17, pedido explícito del usuario: "botoncito de si se cumplió
   * con la cuota... hoy es 5, se vence hoy y la cuota eran 500... que yo le
   * despiche paga y él ya suma que se pagó y se descontó" — reusa el
   * `abonar` que ya existe: este botón es solo un atajo de un toque con el
   * monto YA conocido de la cuota, no un flujo nuevo — el usuario dijo que
   * "el cuadrito de abono está perfecto", así que ese sigue intacto al lado.
   *
   * 2026-09-23, corrección de un bug real reportado por el usuario ("el
   * botón de pagar creo que solo se me activa en la fecha de vencimiento...
   * siempre tiene que estar ahí, por si quiero pagar antes"): antes exigía
   * `proximaFechaCuotaDeuda(deuda) <= ahora` para aparecer — ya no. El botón
   * aparece siempre que la deuda tenga cuota programada.
   *
   * Eso rompe el guard viejo de "no pagar dos veces": comparaba abonos
   * contra `proxima` (la fecha TEÓRICA de la cuota) — si se paga ANTES de
   * esa fecha, el abono queda con fecha anterior a `proxima`, así que ese
   * chequeo nunca lo reconocería como "ya cubierto" y dejaría pagar de
   * nuevo. Reemplazado por una ventana de enfriamiento: si el abono MÁS
   * RECIENTE de esta deuda es más nuevo que la duración de un período
   * completo (30/15/7 días según la frecuencia), se considera ya cubierto
   * este ciclo — funciona igual de bien si se paga antes, justo a tiempo, o
   * tarde, sin depender de ninguna fecha teórica.
   */
  function duracionPeriodoMs(frecuencia: FrecuenciaCuota): number {
    const DIA_MS = 86_400_000
    if (frecuencia === 'mensual') return 30 * DIA_MS
    if (frecuencia === 'quincenal') return 15 * DIA_MS
    return 7 * DIA_MS
  }

  function cuotaYaCubiertaEsteCiclo(deudaId: string, frecuencia: FrecuenciaCuota): boolean {
    const abonosDeuda = abonos.filter((a) => a.deudaId === deudaId)
    if (abonosDeuda.length === 0) return false
    const masRecienteMs = Math.max(...abonosDeuda.map((a) => new Date(a.fechaISO).getTime()))
    return Date.now() - masRecienteMs < duracionPeriodoMs(frecuencia)
  }

  async function manejarPagarCuota(deudaId: string) {
    const deuda = deudas.find((d) => d.id === deudaId)
    if (!deuda?.cuotaProgramada) return
    await abonar(deudaId, deuda.cuotaProgramada.monto)
    void sincronizarDeudasPendientes()
  }

  const activas = deudas.filter((d) => d.saldoActual > 0)
  const pagadas = deudas.filter((d) => d.saldoActual <= 0)

  return (
    <>
      <p className="texto-mute" style={{ marginBottom: 16 }}>
        Cargá la deuda una vez con su saldo inicial, y andá abonando — el saldo baja solo.
      </p>

      {/* 2026-09-16, pedido explícito del usuario: "me toca hacer mucho scroll... prefiero que sea un botoncito que agregar y así se despliegue el menú" */}
      <button type="button" style={{ marginBottom: 16 }} onClick={() => setMostrarFormulario((v) => !v)}>
        {mostrarFormulario ? 'Cancelar' : '+ Agregar deuda'}
      </button>

      {mostrarFormulario && (
      <div className="tarjeta-viaje" style={{ marginBottom: 16, flexDirection: 'column', gap: 12, alignItems: 'stretch' }}>
        <label className="texto-mute">
          Nombre
          <input type="text" placeholder='Ej. "Tarjeta de crédito"' value={nombre} onChange={(e) => setNombre(e.target.value)} style={{ display: 'block', width: '100%' }} />
        </label>
        <label className="texto-mute">
          Saldo inicial
          <CampoMonto valor={saldoInicial} onValorCambia={setSaldoInicial} placeholder="Ej. 500.000" />
        </label>
        <label className="texto-mute">
          Fecha límite de pago (opcional)
          <input type="date" value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} style={{ display: 'block', width: '100%' }} />
        </label>
        <p className="texto-mute" style={{ fontSize: '0.78rem', margin: 0 }}>
          Ponele una fecha para que MIA te avise cuando se esté por vencer — sin fecha, no hay forma de avisarte.
        </p>
        <label className="texto-mute">
          <input type="checkbox" checked={tieneCuota} onChange={(e) => setTieneCuota(e.target.checked)} /> Tiene cuota fija programada
        </label>
        {tieneCuota && (
          <>
            <label className="texto-mute">
              Monto de la cuota
              <CampoMonto valor={montoCuota} onValorCambia={setMontoCuota} placeholder="Ej. 50.000" />
            </label>
            <label className="texto-mute">
              Frecuencia
              <select value={frecuenciaCuota} onChange={(e) => setFrecuenciaCuota(e.target.value as FrecuenciaCuota)} style={{ display: 'block', width: '100%' }}>
                {FRECUENCIAS.map((f) => (
                  <option key={f.valor} value={f.valor}>{f.etiqueta}</option>
                ))}
              </select>
            </label>
            {/* 2026-09-16, pedido explícito del usuario: "¿cómo vas a ver qué día es la cuota de cada mes?... agrega la opción" — el día/fecha real de la cuota, no solo la frecuencia. */}
            {frecuenciaCuota === 'mensual' && (
              <label className="texto-mute">
                Día del mes en que se paga
                <input type="number" inputMode="numeric" min={1} max={31} value={diaDelMesCuota} onChange={(e) => setDiaDelMesCuota(e.target.value)} style={{ display: 'block', width: '100%' }} />
              </label>
            )}
            {frecuenciaCuota === 'quincenal' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <label className="texto-mute" style={{ flex: 1 }}>
                  Primer día del mes
                  <input type="number" inputMode="numeric" min={1} max={31} value={diasDelMesCuota[0]} onChange={(e) => setDiasDelMesCuota([e.target.value, diasDelMesCuota[1]])} style={{ display: 'block', width: '100%' }} />
                </label>
                <label className="texto-mute" style={{ flex: 1 }}>
                  Segundo día del mes
                  <input type="number" inputMode="numeric" min={1} max={31} value={diasDelMesCuota[1]} onChange={(e) => setDiasDelMesCuota([diasDelMesCuota[0], e.target.value])} style={{ display: 'block', width: '100%' }} />
                </label>
              </div>
            )}
            {frecuenciaCuota === 'semanal' && (
              <label className="texto-mute">
                Día de la semana
                <select value={diaDeLaSemanaCuota} onChange={(e) => setDiaDeLaSemanaCuota(Number(e.target.value))} style={{ display: 'block', width: '100%' }}>
                  {DIAS_SEMANA.map((d) => (
                    <option key={d.valor} value={d.valor}>{d.etiqueta}</option>
                  ))}
                </select>
              </label>
            )}
          </>
        )}
        {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}
        <button type="button" onClick={() => void manejarAgregar()} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Agregar deuda'}
        </button>
      </div>
      )}

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
                {textoAncla(d.cuotaProgramada)}
              </span>
            )}
            <span className="texto-mute">
              {d.fechaLimiteISO ? `Vence: ${new Date(d.fechaLimiteISO).toLocaleDateString('es-CO')}` : 'Sin fecha límite puesta — no te va a avisar'}
            </span>
            {d.cuotaProgramada && !cuotaYaCubiertaEsteCiclo(d.id, d.cuotaProgramada.frecuencia) && (
              <button type="button" onClick={() => void manejarPagarCuota(d.id)}>
                ✓ Pagar cuota de ${d.cuotaProgramada!.monto.toLocaleString('es-CO')}
              </button>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <CampoMonto
                valor={montosAbono[d.id] ?? ''}
                onValorCambia={(crudo) => setMontosAbono((actuales) => ({ ...actuales, [d.id]: crudo }))}
                placeholder="Monto a abonar"
                style={{ flex: 1 }}
              />
              <button type="button" onClick={() => void manejarAbonar(d.id)}>Abonar</button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="date"
                value={fechasEdicion[d.id] ?? ''}
                onChange={(e) => setFechasEdicion((actuales) => ({ ...actuales, [d.id]: e.target.value }))}
                style={{ flex: 1 }}
              />
              <button type="button" onClick={() => void manejarActualizarFecha(d.id)}>{d.fechaLimiteISO ? 'Cambiar fecha' : 'Poner fecha límite'}</button>
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
