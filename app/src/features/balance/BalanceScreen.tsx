import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useViajes } from '../../domain/viajes/store'
import { useGastos } from '../../domain/gastos/store'
import { useDeudas } from '../../domain/deudas/store'
import { useHogar } from '../../domain/hogar/store'
import { useAhorro } from '../../domain/ahorro/store'
import { useAuth } from '../../domain/auth/store'
import { useTema } from '../../domain/tema/store'
import { useVehiculo } from '../../domain/vehiculo/store'
import { calcularBalanceGeneral } from '../../domain/balance/calculos'
import { GraficoDistribucion } from '../../components/graficos/GraficoDistribucion'
import { GraficoAhorroMeta } from '../../components/graficos/GraficoAhorroMeta'
import { AcordeonResumen } from '../../components/AcordeonResumen'
import { CATEGORIAS_GASTO } from '../../domain/gastos/types'
import type { ItemDistribucion } from '../../domain/estiloGrafico/types'

function formatoPesos(monto: number): string {
  return `$${Math.round(monto).toLocaleString('es-CO')}`
}

/** Suma `monto(item)` agrupado por `clave(item)`, ordenado de mayor a menor total — usado por los 3 resúmenes desplegables de abajo. */
function agruparPorClave<T>(items: T[], clave: (item: T) => string, monto: (item: T) => number): { clave: string; total: number }[] {
  const mapa = new Map<string, number>()
  for (const item of items) {
    const k = clave(item)
    mapa.set(k, (mapa.get(k) ?? 0) + monto(item))
  }
  return [...mapa.entries()].map(([clave, total]) => ({ clave, total })).sort((a, b) => b.total - a.total)
}

/** Una fila dentro de la "papeleta" de un resumen: nombre, monto, y una barrita proporcional al ítem más grande del grupo. */
function FilaResumen({ nombre, monto, porcentaje, color }: { nombre: string; monto: number; porcentaje: number; color: string }) {
  return (
    <div className="acordeon-resumen__fila">
      <div className="acordeon-resumen__fila-linea">
        <span>{nombre}</span>
        <strong>{formatoPesos(monto)}</strong>
      </div>
      <div className="acordeon-resumen__barra">
        <span style={{ width: `${Math.max(4, porcentaje)}%`, background: color }} />
      </div>
    </div>
  )
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
  const { tipoVehiculo } = useVehiculo()
  const animado = tema !== 'papel'

  /**
   * 2026-09-15, pedido explícito del usuario: los tres resúmenes de abajo
   * (deudas/hogar/vehículo) son desplegables — "para que la gente no esté
   * haciendo scroll... buscan lo que necesitan, pichan ahí y ahí aparece el
   * resumen". Cada uno se abre/cierra independiente de los otros dos, por
   * eso es un `Record`, no un solo valor "cuál está abierto".
   */
  const [acordeonesAbiertos, setAcordeonesAbiertos] = useState<Record<string, boolean>>({})
  function alternarAcordeon(clave: string) {
    setAcordeonesAbiertos((actuales) => ({ ...actuales, [clave]: !actuales[clave] }))
  }

  useEffect(() => {
    void cargarViajes()
    void cargarGastos()
    void cargarDeudas()
    void cargarHogar()
    void cargarAhorro()
  }, [cargarViajes, cargarGastos, cargarDeudas, cargarHogar, cargarAhorro])

  const balance = calcularBalanceGeneral(viajes, gastos, deudas, gastosHogar, metasAhorro)

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

  // 2026-09-15, pedido explícito del usuario: "después de la gráfica
  // aparece como un resumen... ese toca quitarlo" — la lista plana de
  // números (Ingresos/Gastos operativos/Gastos de hogar/Balance neto/Deuda/
  // Ahorro) que vivía después de las dos gráficas se quita de ahí. Deuda
  // pendiente total y Ahorro total no se pierden: quedan en el chip del
  // acordeón "Deudas" y en el frasco de ahorro respectivamente. Ingresos
  // totales/Gastos operativos/Balance neto sí eran datos que no vivían en
  // ningún otro lado — se suben arriba de la primera gráfica como una fila
  // de estadísticas chicas (mismo patrón `.app-stat` que ya usa el resto de
  // la app), para no perderlos, sin que quede nada "de resumen" entre las
  // dos gráficas.
  const deudasActivas = deudas.filter((d) => d.saldoActual > 0).sort((a, b) => b.saldoActual - a.saldoActual)
  const maxDeuda = deudasActivas[0]?.saldoActual ?? 0

  const gastosHogarAgrupados = agruparPorClave(gastosHogar, (g) => g.nombre, (g) => g.monto)
  const maxGastoHogar = gastosHogarAgrupados[0]?.total ?? 0

  const gastosVehiculoAgrupados = agruparPorClave(gastos, (g) => g.categoria, (g) => g.monto)
  const maxGastoVehiculo = gastosVehiculoAgrupados[0]?.total ?? 0
  const tituloGastosVehiculo =
    tipoVehiculo === 'moto' ? 'Gastos de la moto' : tipoVehiculo === 'carro' ? 'Gastos del carro' : 'Gastos del vehículo (moto y carro)'
  const iconoVehiculo = tipoVehiculo === 'moto' ? '🏍️' : '🚗'

  return (
    <section className="pantalla"><div className="app-panel">
      <div className="app-hero"><div className="app-eyebrow">MIA · RESUMEN</div><h1 className="app-title">Balance general</h1></div>
      <p className="texto-mute" style={{ marginBottom: 16 }}>
        Cruce de todo lo que entró (viajes) contra todo lo que salió (gastos operativos + gastos de hogar). La deuda
        pendiente y el ahorro se muestran aparte — son plata que no se gastó, no un flujo de este período.
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <div className="app-stat" style={{ flex: '1 1 140px' }}>
          <span className="app-label">Ingresos</span>
          <strong>{formatoPesos(balance.ingresosTotales)}</strong>
        </div>
        <div className="app-stat" style={{ flex: '1 1 140px' }}>
          <span className="app-label">Gastos totales</span>
          <strong>-{formatoPesos(balance.gastosOperativos + balance.gastosDeHogar)}</strong>
        </div>
        <div className="app-stat" style={{ flex: '1 1 140px' }}>
          <span className="app-label">Balance neto</span>
          <strong style={{ color: balance.balanceNeto >= 0 ? '#4caf50' : '#ff6b6b' }}>{formatoPesos(balance.balanceNeto)}</strong>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <GraficoDistribucion items={itemsDistribucion} total={sumaCuatro} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <GraficoAhorroMeta metas={metasAhorro} animado={animado} />
      </div>

      {!autenticado() && (
        <div className="tarjeta-viaje" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8, marginBottom: 16 }}>
          <span className="texto-mute">Estos datos hoy solo viven en este teléfono — si lo pierdes o cambias de equipo, se pierden con él.</span>
          <Link to="/cuenta"><button type="button">Crear cuenta gratis para guardarlos</button></Link>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <AcordeonResumen
          icono="💳"
          titulo="Deudas"
          resumen={deudasActivas.length > 0 ? `${formatoPesos(balance.deudaPendienteTotal)} pendiente` : 'Sin deudas activas'}
          colorAcento="#ff9d83"
          abierto={!!acordeonesAbiertos.deudas}
          onToggle={() => alternarAcordeon('deudas')}
        >
          {deudasActivas.length === 0 ? (
            <span className="texto-mute">No tienes deudas activas — vas muy bien.</span>
          ) : (
            deudasActivas.map((d) => (
              <FilaResumen key={d.id} nombre={d.nombre} monto={d.saldoActual} porcentaje={maxDeuda > 0 ? (d.saldoActual / maxDeuda) * 100 : 0} color="#ff9d83" />
            ))
          )}
        </AcordeonResumen>

        <AcordeonResumen
          icono="🏠"
          titulo="Gastos del hogar"
          resumen={gastosHogarAgrupados.length > 0 ? `${formatoPesos(balance.gastosDeHogar)} en total` : 'Sin gastos cargados'}
          colorAcento="#55e3a0"
          abierto={!!acordeonesAbiertos.hogar}
          onToggle={() => alternarAcordeon('hogar')}
        >
          {gastosHogarAgrupados.length === 0 ? (
            <span className="texto-mute">Todavía no cargaste gastos de hogar.</span>
          ) : (
            gastosHogarAgrupados.map((g) => (
              <FilaResumen key={g.clave} nombre={g.clave} monto={g.total} porcentaje={maxGastoHogar > 0 ? (g.total / maxGastoHogar) * 100 : 0} color="#55e3a0" />
            ))
          )}
        </AcordeonResumen>

        <AcordeonResumen
          icono={iconoVehiculo}
          titulo={tituloGastosVehiculo}
          resumen={gastosVehiculoAgrupados.length > 0 ? `${formatoPesos(balance.gastosOperativos)} en total` : 'Sin gastos cargados'}
          colorAcento="#f0c987"
          abierto={!!acordeonesAbiertos.vehiculo}
          onToggle={() => alternarAcordeon('vehiculo')}
        >
          {gastosVehiculoAgrupados.length === 0 ? (
            <span className="texto-mute">Todavía no cargaste gastos de {tipoVehiculo === 'carro' ? 'carro' : 'moto'}.</span>
          ) : (
            gastosVehiculoAgrupados.map((g) => (
              <FilaResumen
                key={g.clave}
                nombre={CATEGORIAS_GASTO.find((c) => c.valor === g.clave)?.etiqueta ?? g.clave}
                monto={g.total}
                porcentaje={maxGastoVehiculo > 0 ? (g.total / maxGastoVehiculo) * 100 : 0}
                color="#f0c987"
              />
            ))
          )}
        </AcordeonResumen>
      </div>
    </div></section>
  )
}
