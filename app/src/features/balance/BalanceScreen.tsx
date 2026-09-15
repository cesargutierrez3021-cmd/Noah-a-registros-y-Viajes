import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useViajes } from '../../domain/viajes/store'
import { useGastos } from '../../domain/gastos/store'
import { useDeudas } from '../../domain/deudas/store'
import { useHogar } from '../../domain/hogar/store'
import { useAhorro } from '../../domain/ahorro/store'
import { useAuth } from '../../domain/auth/store'
import { useTema } from '../../domain/tema/store'
import { calcularBalanceGeneral } from '../../domain/balance/calculos'
import { AnilloMeta } from '../../components/graficos/AnilloMeta'
import { GraficoDistribucion } from '../../components/graficos/GraficoDistribucion'
import type { ItemDistribucion } from '../../domain/estiloGrafico/types'

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
  const { metas: metasAhorro, cargar: cargarAhorro } = useAhorro()
  const { autenticado } = useAuth()
  const { tema } = useTema()
  const animado = tema !== 'papel'

  useEffect(() => {
    void cargarViajes()
    void cargarGastos()
    void cargarDeudas()
    void cargarHogar()
    void cargarAhorro()
  }, [cargarViajes, cargarGastos, cargarDeudas, cargarHogar, cargarAhorro])

  const balance = calcularBalanceGeneral(viajes, gastos, deudas, gastosHogar, metasAhorro)

  // 2026-09-15, pedido explícito del usuario: "la otra órbita que ves en el
  // ahorro, también quiero que esté en balance... que vea cuánto voy en
  // porcentaje de la meta". Si hay varias metas, se suman objetivo y saldo
  // de todas — un solo % que representa el ahorro total contra lo que se
  // propuso en total (mismo criterio que ahorroTotal en calculos.ts).
  const objetivoAhorroTotal = metasAhorro.reduce((acc, m) => acc + m.montoObjetivo, 0)
  const porcentajeAhorro = objetivoAhorroTotal > 0 ? (balance.ahorroTotal / objetivoAhorroTotal) * 100 : 0

  // 2026-09-15, pedido explícito del usuario, con referencia visual propia:
  // Hogar/Deudas/Ahorro/Libre, las 4 sumando 100% entre sí — NO % del
  // ingreso total (una deuda acumulada puede superar el ingreso de un solo
  // período, eso rompería el sentido de "4 porciones de una torta"). Libre
  // (balance neto) se recorta a 0 para este reparto si diera negativo — un
  // "libre" negativo no es una porción positiva de nada, ya se ve en rojo
  // en la lista de abajo.
  const librePositivo = Math.max(balance.balanceNeto, 0)
  const sumaCuatro = balance.gastosDeHogar + balance.deudaPendienteTotal + balance.ahorroTotal + librePositivo
  // 2026-09-15 (corrección posterior, misma sesión): el usuario mandó la
  // referencia exacta de color para Hogar/Deudas/Ahorro/Libre (paquete
  // "prism-crystal-orbit-package", ORIGINAL_COMPONENTS.tsx: C.green/coral/
  // lilac/sky) y mostró capturas — el set anterior (ámbar/rojo-naranja/
  // verde/azul) no calzaba con lo que había pedido. Se reemplaza por el
  // set exacto del paquete, mismo orden Hogar→Deudas→Ahorro→Libre.
  const itemsDistribucion: ItemDistribucion[] = [
    { clave: 'hogar', etiqueta: 'Hogar', monto: balance.gastosDeHogar, color: '#55e3a0', porcentaje: sumaCuatro > 0 ? (balance.gastosDeHogar / sumaCuatro) * 100 : 0 },
    { clave: 'deudas', etiqueta: 'Deudas', monto: balance.deudaPendienteTotal, color: '#ff9d83', porcentaje: sumaCuatro > 0 ? (balance.deudaPendienteTotal / sumaCuatro) * 100 : 0 },
    { clave: 'ahorro', etiqueta: 'Ahorro', monto: balance.ahorroTotal, color: '#b7a4ff', porcentaje: sumaCuatro > 0 ? (balance.ahorroTotal / sumaCuatro) * 100 : 0 },
    { clave: 'libre', etiqueta: 'Libre', monto: librePositivo, color: '#78c8ff', porcentaje: sumaCuatro > 0 ? (librePositivo / sumaCuatro) * 100 : 0 },
  ]

  return (
    <section className="pantalla"><div className="app-panel">
      <div className="app-hero"><div className="app-eyebrow">MIA · RESUMEN</div><h1 className="app-title">Balance general</h1></div>
      <p className="texto-mute" style={{ marginBottom: 8 }}>
        Cruce de todo lo que entró (viajes) contra todo lo que salió (gastos operativos + gastos de hogar). La deuda
        pendiente y el ahorro se muestran aparte — son plata que no se gastó, no un flujo de este período.
      </p>

      <div style={{ marginBottom: 20 }}>
        <GraficoDistribucion items={itemsDistribucion} total={sumaCuatro} />
      </div>

      {metasAhorro.length > 0 && (
        <div className="tarjeta-viaje" style={{ flexDirection: 'column', alignItems: 'center', gap: 4, marginBottom: 16, paddingTop: 20, paddingBottom: 16 }}>
          <span className="texto-mute">Ahorro frente a la meta</span>
          <AnilloMeta
            porcentaje={porcentajeAhorro}
            color="#b7a4ff"
            valorCentral={`${Math.round(porcentajeAhorro)}%`}
            etiqueta={`${formatoPesos(balance.ahorroTotal)} de ${formatoPesos(objetivoAhorroTotal)}`}
            animado={animado}
          />
        </div>
      )}

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
        <li className="tarjeta-viaje">
          <span>Ahorro total</span>
          <strong>{formatoPesos(balance.ahorroTotal)}</strong>
        </li>
      </ul>
    </div></section>
  )
}
