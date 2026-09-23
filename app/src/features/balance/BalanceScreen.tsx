import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useViajes } from '../../domain/viajes/store'
import { useGastos } from '../../domain/gastos/store'
import { useDeudas } from '../../domain/deudas/store'
import { useHogar } from '../../domain/hogar/store'
import { useAhorro } from '../../domain/ahorro/store'
import { useBonos } from '../../domain/bonos/store'
import { useMantenimiento } from '../../domain/mantenimiento/store'
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
  const { deudas, abonos: abonosDeuda, cargar: cargarDeudas } = useDeudas()
  const { gastos: gastosHogar, cargar: cargarHogar } = useHogar()
  const { metas: metasAhorro, abonos: abonosAhorro, cargar: cargarAhorro } = useAhorro()
  const { bonos, cargar: cargarBonos } = useBonos()
  const { registros: registrosMantenimiento, cargar: cargarMantenimiento } = useMantenimiento()
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
    void cargarBonos()
    void cargarMantenimiento()
  }, [cargarViajes, cargarGastos, cargarDeudas, cargarHogar, cargarAhorro, cargarBonos, cargarMantenimiento])

  const balance = calcularBalanceGeneral(viajes, gastos, deudas, gastosHogar, metasAhorro, bonos, registrosMantenimiento)

  /**
   * 2026-09-16, pedido explícito del usuario: "falta la gráfica de los
   * gastos de la moto... todo lo que reporto como gastos dentro del panel
   * de trabajo y todo lo de los mantenimientos" — dos fuentes reales
   * distintas, nunca se pisan: lo cargado a mano en "Gastos de jornada" y el
   * costo real de cada mantenimiento marcado "realizado"
   * (`RegistroMantenimiento.costo`, ver TarjetaMantenimiento.tsx — antes
   * siempre se guardaba `null`, sin UI para cargarlo; ahora hay un campo
   * "Costo real" junto al botón).
   *
   * 2026-09-23, corrección de un bug real reportado por el usuario ("cuando
   * yo lo pongo en mantenimiento... no me lo está calculando"): antes ESTE
   * archivo era el único lugar que sumaba las dos fuentes — `calcularBalanceGeneral`
   * (domain/balance/calculos.ts) solo sabía de `gastos`, así que el costo real
   * de mantenimiento nunca llegaba a `balance.gastosOperativos`/`balanceNeto`
   * (el stat "Gastos totales" de arriba), ni al acordeón "Gastos de la moto"
   * de más abajo (su resumen usa `balance.gastosOperativos` directo) — solo
   * se sumaba acá, a mano, para esta gráfica puntual. Ahora `calcularBalanceGeneral`
   * ya incluye el costo de mantenimiento realizado en `gastosOperativos`
   * (D-18, un solo lugar) — `gastosVehiculoTotal` ya no necesita sumarlo de
   * nuevo (sumarlo acá otra vez lo contaría doble).
   */
  const costoMantenimientoRealizado = registrosMantenimiento.reduce((acc, r) => acc + (r.costo ?? 0), 0)
  const gastosVehiculoTotal = balance.gastosOperativos

  // 2026-09-17 (corrección posterior, misma sesión, pedido explícito del
  // usuario): "ese porcentaje equivale al ingreso... si tengo un ingreso de
  // un millón, que me muestre qué porcentaje se va a deudas... pero sin
  // ingreso no hay nada. ¿Cómo me va a decir que el 95% es de deudas si el
  // ingreso es cero?" — el diseño anterior (comentario de abajo, ya no
  // vigente) calculaba el % contra la SUMA de las categorías entre sí, así
  // que con ingreso $0 una deuda grande igual se llevaba casi el 100% del
  // reparto. Ahora cada % es monto/ingresosTotales — sin ingreso, las 5
  // dan 0%, tal como pidió. Ya no suman 100% entre sí a propósito (cada
  // anillo/placa es su propio medidor "% de mi ingreso", no una porción de
  // una torta — ver AnillosOrbitales.tsx/Prisma.tsx/Cristal3D.tsx, ninguno
  // de los 3 estilos depende de que las porciones sumen 100).
  const ingresos = balance.ingresosTotales
  function porcentajeDeIngreso(monto: number): number {
    return ingresos > 0 ? Math.max(0, Math.min(100, (monto / ingresos) * 100)) : 0
  }
  // 2026-09-17, mismo pedido: "cuando llegue la fecha de pagos de deudas...
  // si yo marco que se pagó o se abonó, ahí sí que vaya sumando... y así
  // vaya apareciendo el porcentaje" — `deudaPendienteTotal` es un STOCK (lo
  // que TODAVÍA se debe, baja al abonar) — mostrar ESE número contra el
  // ingreso no tiene el comportamiento que pidió (pagar una cuota bajaría
  // el % en vez de subirlo, y una deuda vieja grande mostraría 100% para
  // siempre así no se haya movido nada este período). Acá "Deudas" pasa a
  // ser un FLUJO, igual criterio que las otras 4 categorías (todas suman
  // dinero que YA salió/entró, nunca "lo que falta"): el total abonado de
  // verdad (`AbonoDeuda.monto`, ya cargado por `useDeudas()` arriba) —
  // empieza en $0 y solo crece cuando de verdad se confirma un pago.
  // `deudaPendienteTotal` sigue intacto en el resto de la pantalla (el
  // acordeón "Deudas" de abajo, que el usuario dijo que está bien así).
  const totalAbonadoDeudas = abonosDeuda.reduce((acc, a) => acc + a.monto, 0)
  // 2026-09-23, corrección de un bug real reportado por el usuario ("me está diciendo que tengo
  // 108%... se me duplicó el dinero"): "Ahorro" usaba `balance.ahorroTotal` (STOCK — el saldo
  // actual guardado, incluye TODO lo ahorrado desde siempre) mientras "Deudas" ya usaba un FLUJO
  // (`totalAbonadoDeudas`, arriba). Mismo criterio que esa corrección de 2026-09-17: acá también
  // pasa a ser el total de verdad ABONADO (`AbonoAhorro`, useAhorro().abonos — mismo patrón que
  // AbonoDeuda), no el saldo acumulado.
  const totalAportadoAhorro = abonosAhorro.reduce((acc, a) => acc + a.monto, 0)
  // 2026-09-23, misma corrección: "Libre" venía de `balance.balanceNeto` (ingresos - gastos
  // operativos - gastos de hogar), que a propósito NO resta la deuda abonada, el ahorro aportado,
  // ni el mantenimiento del vehículo — correcto para el concepto general de "Balance neto" (ver
  // domain/balance/calculos.ts, esa resta sigue vigente ahí, se usa en la fila de estadísticas de
  // arriba). Pero ACÁ, en la gráfica de 5 categorías, esas 3 cosas SÍ tienen su propia porción
  // (Deudas/Ahorro/Vehículo) — si "Libre" no las resta, esa plata queda contada dos veces (una en
  // su propia porción, otra de nuevo en "Libre") y el reparto suma más de 100% del ingreso, ej. el
  // caso real del usuario: 79% libre + 21% deudas + 8% ahorro = 108%. Acá "Libre" pasa a ser el
  // residuo de verdad: lo que entró menos TODO lo que ya se contó en las otras 4 porciones de esta
  // misma gráfica.
  const librePositivo = Math.max(0, ingresos - balance.gastosDeHogar - gastosVehiculoTotal - totalAbonadoDeudas - totalAportadoAhorro)
  // 2026-09-15, el usuario mandó la referencia exacta de color para
  // Hogar/Deudas/Ahorro/Libre (paquete "prism-crystal-orbit-package",
  // ORIGINAL_COMPONENTS.tsx: C.green/coral/lilac/sky). "Vehículo" (2026-09-16,
  // categoría nueva) reusa el ámbar `#f0c987` que ya usa el acordeón de
  // gastos de vehículo más abajo (D-18, un solo color por concepto en toda
  // la pantalla).
  //
  // 2026-09-16 (corrección posterior, misma sesión): "Cristal 3D" también
  // muestra "Vehículo" ahora — ver el comentario largo en Cristal3D.tsx
  // sobre la 6ta placa (editada de la placa "LIBRE" existente, mismo
  // material/luz, sin foto nueva). El orden acá ya no importa para ese
  // componente (usa `items.slice(0,5)`, las 5 categorías completas).
  const itemsDistribucion: ItemDistribucion[] = [
    { clave: 'hogar', etiqueta: 'Hogar', monto: balance.gastosDeHogar, color: '#55e3a0', porcentaje: porcentajeDeIngreso(balance.gastosDeHogar) },
    { clave: 'deudas', etiqueta: 'Deudas', monto: totalAbonadoDeudas, color: '#ff9d83', porcentaje: porcentajeDeIngreso(totalAbonadoDeudas) },
    { clave: 'ahorro', etiqueta: 'Ahorro', monto: totalAportadoAhorro, color: '#b7a4ff', porcentaje: porcentajeDeIngreso(totalAportadoAhorro) },
    { clave: 'libre', etiqueta: 'Libre', monto: librePositivo, color: '#78c8ff', porcentaje: porcentajeDeIngreso(librePositivo) },
    { clave: 'vehiculo', etiqueta: 'Vehículo', monto: gastosVehiculoTotal, color: '#f0c987', porcentaje: porcentajeDeIngreso(gastosVehiculoTotal) },
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

  // 2026-09-23, corrección de un bug real reportado por el usuario: el costo real de un
  // mantenimiento marcado "realizado" (`costoMantenimientoRealizado`, arriba) no aparecía en esta
  // lista — solo los gastos cargados a mano desde "Gastos de jornada" (categoría "mantenimiento"
  // incluida). Se agrega como una fila propia ("Mantenimiento realizado") para que la lista SÍ
  // sume el mismo total que ya muestra el resumen del acordeón (`balance.gastosOperativos`, ver
  // abajo) — antes esos dos números no coincidían.
  const gastosVehiculoAgrupados = [
    ...agruparPorClave(gastos, (g) => g.categoria, (g) => g.monto),
    ...(costoMantenimientoRealizado > 0 ? [{ clave: 'mantenimiento_realizado', total: costoMantenimientoRealizado }] : []),
  ].sort((a, b) => b.total - a.total)
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
        <GraficoDistribucion items={itemsDistribucion} ingresoReal={balance.ingresosTotales} />
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
                nombre={g.clave === 'mantenimiento_realizado' ? 'Mantenimiento realizado' : (CATEGORIAS_GASTO.find((c) => c.valor === g.clave)?.etiqueta ?? g.clave)}
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
