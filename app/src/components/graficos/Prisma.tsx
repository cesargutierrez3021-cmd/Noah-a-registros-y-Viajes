import type { ItemDistribucion } from '../../domain/estiloGrafico/types'

function formatoPesosCorto(monto: number): string {
  if (Math.abs(monto) >= 1_000_000) return `$${(monto / 1_000_000).toFixed(1)}M`
  if (Math.abs(monto) >= 1_000) return `$${Math.round(monto / 1000)}K`
  return `$${Math.round(monto)}`
}

/**
 * Estilo "Prisma" (2026-09-15, pedido explícito del usuario, con referencia
 * visual propia: barras que fluyen desde un círculo con el total, cada
 * barra con su propio color y un punto que la recorre). El movimiento
 * pedido es el punto recorriendo cada barra de ida y vuelta.
 */
export function Prisma({ items, total, animado = true }: { items: ItemDistribucion[]; total: number; animado?: boolean }) {
  return (
    <div className="prisma">
      <div className="prisma__total">
        <span className="prisma__total-icono">💰</span>
        <span className="prisma__total-valor">{formatoPesosCorto(total)}</span>
      </div>
      <div className="prisma__barras">
        {items.map((item, i) => (
          <div key={item.clave} className="prisma__fila">
            <span className="prisma__etiqueta">{item.etiqueta}</span>
            <div className="prisma__barra" style={{ background: `color-mix(in srgb, ${item.color} 55%, var(--color-superficie))` }}>
              <span
                className={animado ? 'prisma__punto prisma__punto--animado' : 'prisma__punto'}
                style={{ background: item.color, animationDelay: `${i * 0.25}s`, left: animado ? undefined : `${Math.min(94, Math.max(6, item.porcentaje))}%` }}
              />
            </div>
            <span className="prisma__porcentaje" style={{ color: item.color }}>{Math.round(item.porcentaje)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
