import type { ItemDistribucion } from '../../domain/estiloGrafico/types'
import { SUPERFICIE_EJECUTIVA, BORDE_EJECUTIVO, TONOS_EJECUTIVOS } from './paletaEjecutiva'
import type { VarianteGrafico } from './paletaEjecutiva'

/**
 * Estilo "Cristal 3D" — piso de vidrio inclinado + 4 bloques en cascada,
 * uno por categoría, cada uno con su etiqueta y porcentaje.
 *
 * 2026-09-16 (corrección pedida por el usuario, misma sesión): la primera
 * versión de este componente (ronda anterior) se apartaba de la referencia
 * que mandó ("no las hiciste exactas") — le faltaba el piso de vidrio y no
 * calzaba con `GlassStack` de `ORIGINAL_COMPONENTS.tsx` (paquete
 * "prism-crystal-orbit-package"). Reescrito calcando esa estructura y su
 * CSS (`glass-floor` + `glass-block` inclinados con `skewY`+`rotate`,
 * animación `glassFloat` con los mismos retrasos 0/.4/.8/1.2s), adaptado a
 * un ancho de teléfono en vez del stage de escritorio original.
 *
 * `variante`: 'ejecutivo' conserva la misma estructura y movimiento — solo
 * cambia a la paleta grafito/dorado fija de paletaEjecutiva.ts en vez del
 * color propio de cada categoría, sin importar el tema activo de la app.
 */
export function Cristal3D({ items, animado = true, variante = 'clasico' }: { items: ItemDistribucion[]; animado?: boolean; variante?: VarianteGrafico }) {
  // left/bottom en % y px, skewY+rotate — misma composición que block-0..3 del original, reescalada a un ancho móvil (~340-400px) en vez del stage de 1050px.
  const bloques = [
    { left: '2%', bottom: 32, skewY: -8, rotate: -4, delay: 0 },
    { left: '28%', bottom: 58, skewY: 8, rotate: 3, delay: 0.4 },
    { left: '52%', bottom: 24, skewY: -8, rotate: -2, delay: 0.8 },
    { left: '74%', bottom: 66, skewY: 6, rotate: 4, delay: 1.2 },
  ]
  const ejecutivo = variante === 'ejecutivo'
  const superficie = ejecutivo ? SUPERFICIE_EJECUTIVA : 'var(--color-superficie)'
  const borde = ejecutivo ? BORDE_EJECUTIVO : 'var(--color-borde)'
  // El piso toma el color de la última categoría (Libre = sky en la referencia) o el dorado ejecutivo — es un detalle ambiental, no representa un dato.
  const colorPiso = ejecutivo ? TONOS_EJECUTIVOS[0] : (items[3]?.color ?? 'var(--color-acento)')

  return (
    <div style={{ position: 'relative', height: 220, marginBottom: 8 }}>
      <div
        className="cristal3d__piso"
        style={{ borderColor: `color-mix(in srgb, ${colorPiso} 45%, transparent)`, background: `color-mix(in srgb, ${colorPiso} 12%, transparent)` }}
      />
      {items.slice(0, 4).map((item, i) => {
        const pos = bloques[i]
        const color = ejecutivo ? TONOS_EJECUTIVOS[i % TONOS_EJECUTIVOS.length] : item.color
        return (
          <div
            key={item.clave}
            className={animado ? 'cristal3d__panel cristal3d__panel--animado' : 'cristal3d__panel'}
            style={{
              position: 'absolute',
              left: pos.left,
              bottom: pos.bottom,
              zIndex: i,
              animationDelay: `${pos.delay}s`,
              background: `linear-gradient(145deg, color-mix(in srgb, ${color} 22%, ${superficie}) 0%, transparent 68%)`,
              borderColor: `color-mix(in srgb, ${color} 55%, ${borde})`,
              // CSS vars en vez de `transform` directo: así la animación (que también anima `transform`) puede leer el mismo skew/ángulo sin pisarlo (ver @keyframes cristal3d-flotar).
              ['--skew' as string]: `${pos.skewY}deg`,
              ['--rot' as string]: `${pos.rotate}deg`,
              transform: `skewY(${pos.skewY}deg) rotate(${pos.rotate}deg)`,
            }}
          >
            <span className="cristal3d__etiqueta" style={{ color }}>{item.etiqueta.toUpperCase()}</span>
            <strong className="cristal3d__valor" style={ejecutivo ? { color: '#e6e2d8' } : undefined}>{Math.round(item.porcentaje)}%</strong>
          </div>
        )
      })}
    </div>
  )
}
