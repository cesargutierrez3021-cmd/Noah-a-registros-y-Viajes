import { AnilloMeta } from './AnilloMeta'
import type { ItemDistribucion } from '../../domain/estiloGrafico/types'

function formatoPesosCorto(monto: number): string {
  if (Math.abs(monto) >= 1_000_000) return `$${(monto / 1_000_000).toFixed(1)}M`
  if (Math.abs(monto) >= 1_000) return `$${Math.round(monto / 1000)}K`
  return `$${Math.round(monto)}`
}

/** Estilo "Anillos orbitales" — un AnilloMeta por categoría, en fila. Ver domain/estiloGrafico. */
export function AnillosOrbitales({ items, animado = true }: { items: ItemDistribucion[]; animado?: boolean }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
      {items.map((i) => (
        <AnilloMeta
          key={i.clave}
          porcentaje={i.porcentaje}
          color={i.color}
          valorCentral={`${Math.round(i.porcentaje)}%`}
          etiqueta={i.etiqueta}
          detalle={formatoPesosCorto(i.monto)}
          animado={animado}
        />
      ))}
    </div>
  )
}
