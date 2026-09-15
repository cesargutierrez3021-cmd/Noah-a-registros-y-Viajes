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
 */
export function Prisma({ items, total, animado = true, variante = 'clasico' }: { items: ItemDistribucion[]; total: number; animado?: boolean; variante?: VarianteGrafico }) {
  const ejecutivo = variante === 'ejecutivo'
  const superficie = ejecutivo ? SUPERFICIE_EJECUTIVA : 'var(--color-superficie)'
  const colorFuente = ejecutivo ? TONOS_EJECUTIVOS[0] : 'var(--color-acento)'

  return (
    <div style={{ position: 'relative', height: 210, marginBottom: 8 }}>
      <div
        className="prisma__fuente"
        style={{ borderColor: colorFuente, color: colorFuente, background: `color-mix(in srgb, ${colorFuente} 16%, ${superficie})` }}
      >
        <span className="prisma__fuente-icono">💰</span>
        <b>{formatoPesosCorto(total)}</b>
      </div>

      <div className="prisma__lineas">
        {items.slice(0, 4).map((item, i) => {
          const color = ejecutivo ? TONOS_EJECUTIVOS[i % TONOS_EJECUTIVOS.length] : item.color
          return (
            <span
              key={item.clave}
              className={animado ? 'prisma__linea prisma__linea--animada' : 'prisma__linea'}
              style={{ ['--linea' as string]: color, ['--angulo' as string]: `${-25 + i * 16}deg`, animationDelay: `${i * 0.55}s` }}
            />
          )
        })}
      </div>

      <div className="prisma__destinos">
        {items.slice(0, 4).map((item, i) => {
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
