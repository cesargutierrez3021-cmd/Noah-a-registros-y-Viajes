import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useViajes } from '../../domain/viajes/store'
import { useGastos } from '../../domain/gastos/store'
import { useDeudas } from '../../domain/deudas/store'
import { useHogar } from '../../domain/hogar/store'
import { useAuth } from '../../domain/auth/store'
import { calcularBalanceGeneral } from '../../domain/balance/calculos'

function formatoPesos(monto: number): string {
  return `$${Math.round(monto).toLocaleString('es-CO')}`
}

/**
 * Bloque 3, sección 4/4 (última del bloque). Pantalla sin vestir a
 * propósito (Bloque 4 la funde en el panel "Balance", ver PLAN-MAESTRO.md) —
 * hoy solo valida que el cruce de los 4 dominios funcione de punta a punta.
 *
 * Esta pantalla es la única que le pide datos a los 4 stores a la vez — es
 * exactamente el tipo de coordinación que D-10 dice que va en la capa de
 * orquestación (una pantalla), nunca dentro de un store.
 */
export function BalanceScreen() {
  const { viajes, cargar: cargarViajes } = useViajes()
  const { gastos, cargar: cargarGastos } = useGastos()
  const { deudas, cargar: cargarDeudas } = useDeudas()
  const { gastos: gastosHogar, cargar: cargarHogar } = useHogar()
  const { autenticado } = useAuth()

  useEffect(() => {
    void cargarViajes()
    void cargarGastos()
    void cargarDeudas()
    void cargarHogar()
  }, [cargarViajes, cargarGastos, cargarDeudas, cargarHogar])

  const balance = calcularBalanceGeneral(viajes, gastos, deudas, gastosHogar)

  return (
    <section className="pantalla"><div className="app-panel">
      <div className="app-hero"><div className="app-eyebrow">MIA · RESUMEN</div><h1 className="app-title">Balance general</h1></div>
      <p className="texto-mute" style={{ marginBottom: 16 }}>
        Cruce de todo lo que entró (viajes) contra todo lo que salió (gastos operativos + gastos de hogar). La deuda
        pendiente se muestra aparte — es una obligación futura, no un gasto ya hecho.
      </p>

      {!autenticado() && (
        <div className="tarjeta-viaje" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8, marginBottom: 16 }}>
          <span className="texto-mute">Estos datos hoy solo viven en este teléfono — si lo pierdes o cambias de equipo, se pierden con él.</span>
          <Link to="/cuenta"><button type="button">Crear cuenta gratis para guardarlos</button></Link>
        </div>
      )}

      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <li className="tarjeta-viaje">
          <span>Ingresos totales (viajes)</span>
          <strong>{formatoPesos(balance.ingresosTotales)}</strong>
        </li>
        <li className="tarjeta-viaje">
          <span>Gastos operativos</span>
          <strong>-{formatoPesos(balance.gastosOperativos)}</strong>
        </li>
        <li className="tarjeta-viaje">
          <span>Gastos de hogar</span>
          <strong>-{formatoPesos(balance.gastosDeHogar)}</strong>
        </li>
        <li className="tarjeta-viaje" style={{ borderTop: '1px solid var(--color-borde, #333)', paddingTop: 8 }}>
          <span>Balance neto</span>
          <strong style={{ color: balance.balanceNeto >= 0 ? '#4caf50' : '#ff6b6b' }}>
            {formatoPesos(balance.balanceNeto)}
          </strong>
        </li>
        <li className="tarjeta-viaje" style={{ marginTop: 16 }}>
          <span>Deuda pendiente total</span>
          <strong>{formatoPesos(balance.deudaPendienteTotal)}</strong>
        </li>
      </ul>
    </div></section>
  )
}
