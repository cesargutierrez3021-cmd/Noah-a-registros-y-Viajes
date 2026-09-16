import type { ItemDistribucion } from '../../domain/estiloGrafico/types'
import { SUPERFICIE_EJECUTIVA, TONOS_EJECUTIVOS } from './paletaEjecutiva'
import type { VarianteGrafico } from './paletaEjecutiva'

function formatoPesosCorto(monto: number): string {
  if (Math.abs(monto) >= 1_000_000) return `$${(monto / 1_000_000).toFixed(1)}M`
  if (Math.abs(monto) >= 1_000) return `$${Math.round(monto / 1000)}K`
  return `$${Math.round(monto)}`
}

/**
 * Estilo "Prisma" — el ingreso total como fuente a la izquierda, 4 líneas
 * de flujo (una por categoría) que abren en abanico hacia sus destinos
 * porcentuales, a la derecha.
 *
 * 2026-09-16 (corrección pedida por el usuario, misma sesión): la primera
 * versión (ronda anterior) eran barras horizontales con un punto que las
 * recorría — no calzaba con `PrismFlow` de `ORIGINAL_COMPONENTS.tsx`
 * (paquete "prism-crystal-orbit-package"), que es este abanico de líneas.
 * Reescrito calcando esa estructura (`prism-source` + `prism-lines` con
 * `rotate(-25deg + i*16deg)` + `prism-targets`), adaptado a un ancho de
 * teléfono. El movimiento es el brillo recorriendo cada línea (`flow`) y
 * las tarjetas de destino meciéndose (`target`), igual que el original.
 *
 * `variante`: 'ejecutivo' conserva la misma estructura y movimiento —
 * solo cambia a la paleta grafito/dorado fija de paletaEjecutiva.ts en vez
 * del color propio de cada categoría.
 *
 * 2026-09-16, mismo bug real que Cristal3D (ver el comentario largo ahí):
 * la "fuente" 💰 ya decía en el comentario original "el ingreso total como
 * fuente" pero recibía `total` = `sumaCuatro` (Hogar+Deudas+Ahorro+Libre),
 * no el ingreso real — agregar una deuda inflaba este número también.
 * Ahora recibe `ingresoReal` aparte.
 *
 * 2026-09-16 (misma sesión, ronda posterior): pasa de 4 a 5 categorías al
 * agregarse "Vehículo" (BalanceScreen.tsx) — a diferencia de Cristal3D (5
 * placas de FOTO fija, no puede crecer a una 6ta sin una foto nueva que no
 * existe), acá las líneas y tarjetas de destino son CSS/SVG puro, así que
 * suman una más sin problema. El ángulo de cada línea se calcula centrado
 * sobre la cantidad real de `items` (`PASO_ANGULO` fijo, el punto de
 * arranque se corre según cuántas haya) en vez de un abanico fijo para
 * exactamente 4 — así no queda descuadrado si algún día hay más o menos.
 */
const PASO_ANGULO = 15
export function Prisma({
  items,
  ingresoReal,
  animado = true,
  variante = 'clasico',
}: {
  items: ItemDistribucion[]
  ingresoReal: number
  animado?: boolean
  variante?: VarianteGrafico
}) {
  const ejecutivo = variante === 'ejecutivo'
  const superficie = ejecutivo ? SUPERFICIE_EJECUTIVA : 'var(--color-superficie)'
  const colorFuente = ejecutivo ? TONOS_EJECUTIVOS[0] : 'var(--color-acento)'

  return (
    <div style={{ position: 'relative', height: Math.max(210, 40 * items.length + 60), marginBottom: 8 }}>
      <div
        className="prisma__fuente"
        style={{ borderColor: colorFuente, color: colorFuente, background: `color-mix(in srgb, ${colorFuente} 16%, ${superficie})` }}
      >
        <span className="prisma__fuente-icono">💰</span>
        <b>{formatoPesosCorto(ingresoReal)}</b>
      </div>

      <div className="prisma__lineas">
        {items.map((item, i) => {
          const color = ejecutivo ? TONOS_EJECUTIVOS[i % TONOS_EJECUTIVOS.length] : item.color
          const anguloInicial = -((items.length - 1) * PASO_ANGULO) / 2
          return (
            <span
              key={item.clave}
              className={animado ? 'prisma__linea prisma__linea--animada' : 'prisma__linea'}
              style={{ ['--linea' as string]: color, ['--angulo' as string]: `${anguloInicial + i * PASO_ANGULO}deg`, animationDelay: `${i * 0.55}s` }}
            />
          )
        })}
      </div>

      <div className="prisma__destinos">
        {items.map((item, i) => {
          const color = ejecutivo ? TONOS_EJECUTIVOS[i % TONOS_EJECUTIVOS.length] : item.color
          return (
            <span
              key={item.clave}
              className={animado ? 'prisma__destino prisma__destino--animado' : 'prisma__destino'}
              style={{ borderColor: color, animationDelay: `${i * 0.25}s` }}
            >
              {Math.round(item.porcentaje)}% {item.etiqueta.toLowerCase()}
            </span>
          )
        })}
      </div>
    </div>
  )
}
