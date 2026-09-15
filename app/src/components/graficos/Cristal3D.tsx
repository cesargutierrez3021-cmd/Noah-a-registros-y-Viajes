import type { ItemDistribucion } from '../../domain/estiloGrafico/types'

function formatoPesosCorto(monto: number): string {
  if (Math.abs(monto) >= 1_000_000) return `$${(monto / 1_000_000).toFixed(1)}M`
  if (Math.abs(monto) >= 1_000) return `$${Math.round(monto / 1000)}K`
  return `$${Math.round(monto)}`
}

/**
 * Estilo "Cristal 3D" (2026-09-15, pedido explícito del usuario, con
 * referencia visual propia: tarjetas de vidrio inclinadas, superpuestas en
 * cascada, una por categoría). El movimiento pedido ("que tuvieran su
 * movimiento") es un flotado lento y sutil por tarjeta (CSS, con un retraso
 * distinto por índice para que no floten todas sincronizadas) — la
 * inclinación en sí es fija, como en la referencia.
 */
export function Cristal3D({ items, animado = true }: { items: ItemDistribucion[]; animado?: boolean }) {
  const inclinaciones = [
    { rotate: -6, top: 0, left: '2%' },
    { rotate: 4, top: 26, left: '30%' },
    { rotate: -3, top: 74, left: '8%' },
    { rotate: 5, top: 100, left: '34%' },
  ]

  return (
    <div style={{ position: 'relative', height: 230, marginBottom: 8 }}>
      {items.slice(0, 4).map((item, i) => {
        const pos = inclinaciones[i]
        return (
          <div
            key={item.clave}
            className={animado ? 'cristal3d__panel cristal3d__panel--animado' : 'cristal3d__panel'}
            style={{
              position: 'absolute',
              top: pos.top,
              left: pos.left,
              zIndex: i,
              animationDelay: `${i * 0.6}s`,
              background: `linear-gradient(135deg, color-mix(in srgb, ${item.color} 22%, var(--color-superficie)) 0%, var(--color-superficie) 100%)`,
              borderColor: `color-mix(in srgb, ${item.color} 45%, var(--color-borde))`,
              // CSS var en vez de `transform` directo: así la animación (que también anima `transform`) puede leer el mismo ángulo sin pisarlo (ver @keyframes cristal3d-flotar).
              ['--rot' as string]: `${pos.rotate}deg`,
              transform: `rotate(${pos.rotate}deg)`,
            }}
          >
            <span className="cristal3d__etiqueta" style={{ color: item.color }}>{item.etiqueta.toUpperCase()}</span>
            <strong className="cristal3d__valor">{Math.round(item.porcentaje)}%</strong>
            <span className="cristal3d__monto">{formatoPesosCorto(item.monto)}</span>
          </div>
        )
      })}
    </div>
  )
}
