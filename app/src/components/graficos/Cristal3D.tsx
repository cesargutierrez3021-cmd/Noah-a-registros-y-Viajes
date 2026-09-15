import type { ItemDistribucion } from '../../domain/estiloGrafico/types'
import { SUPERFICIE_EJECUTIVA, BORDE_EJECUTIVO, TONOS_EJECUTIVOS } from './paletaEjecutiva'
import type { VarianteGrafico } from './paletaEjecutiva'

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
 *
 * `variante` (misma sesión, ronda posterior — paquete "prism-crystal-orbit-
 * package"): 'ejecutivo' es la misma estructura, mismo movimiento, mismos
 * datos — pidió el usuario "conservar la lógica visual y los movimientos
 * del componente original" — solo cambia el color: en vez del color propio
 * de cada categoría (arcoíris), usa la paleta grafito/dorado fija de
 * paletaEjecutiva.ts (mismo lenguaje visual que las tarjetas de
 * mantenimiento), sin importar el tema activo de la app.
 */
export function Cristal3D({ items, animado = true, variante = 'clasico' }: { items: ItemDistribucion[]; animado?: boolean; variante?: VarianteGrafico }) {
  const inclinaciones = [
    { rotate: -6, top: 0, left: '2%' },
    { rotate: 4, top: 26, left: '30%' },
    { rotate: -3, top: 74, left: '8%' },
    { rotate: 5, top: 100, left: '34%' },
  ]
  const ejecutivo = variante === 'ejecutivo'
  const superficie = ejecutivo ? SUPERFICIE_EJECUTIVA : 'var(--color-superficie)'
  const borde = ejecutivo ? BORDE_EJECUTIVO : 'var(--color-borde)'

  return (
    <div style={{ position: 'relative', height: 230, marginBottom: 8 }}>
      {items.slice(0, 4).map((item, i) => {
        const pos = inclinaciones[i]
        const color = ejecutivo ? TONOS_EJECUTIVOS[i % TONOS_EJECUTIVOS.length] : item.color
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
              background: `linear-gradient(135deg, color-mix(in srgb, ${color} 22%, ${superficie}) 0%, ${superficie} 100%)`,
              borderColor: `color-mix(in srgb, ${color} 45%, ${borde})`,
              // CSS var en vez de `transform` directo: así la animación (que también anima `transform`) puede leer el mismo ángulo sin pisarlo (ver @keyframes cristal3d-flotar).
              ['--rot' as string]: `${pos.rotate}deg`,
              transform: `rotate(${pos.rotate}deg)`,
            }}
          >
            <span className="cristal3d__etiqueta" style={{ color }}>{item.etiqueta.toUpperCase()}</span>
            <strong className="cristal3d__valor" style={ejecutivo ? { color: '#e6e2d8' } : undefined}>{Math.round(item.porcentaje)}%</strong>
            <span className="cristal3d__monto">{formatoPesosCorto(item.monto)}</span>
          </div>
        )
      })}
    </div>
  )
}
