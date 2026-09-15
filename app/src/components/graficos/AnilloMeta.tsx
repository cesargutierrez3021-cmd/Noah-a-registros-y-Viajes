/**
 * Anillo orbital de "porcentaje de una meta" (2026-09-15, pedido explícito
 * del usuario, con referencia visual propia: un anillo con el % en el
 * centro y un punto que orbita de verdad alrededor — no una gráfica de
 * barras ni una lista). Reusable (D-18): lo usa Balance ("Ahorro frente a
 * la meta") y Estadísticas (franja horaria, plataforma, zona) en vez de
 * que cada pantalla arme su propio SVG.
 *
 * El aro de fondo + el arco de progreso son estáticos (SVG `stroke-dasharray`,
 * sin animación — el progreso en sí no "camina"). El movimiento real, pedido
 * explícito ("tiene que tener movimiento"), es el punto que orbita sobre el
 * aro con `animateTransform`, igual mecánica que GraficoOrbital.tsx.
 */

const RADIO = 40
const CIRCUNFERENCIA = 2 * Math.PI * RADIO

export function AnilloMeta({
  porcentaje,
  color,
  valorCentral,
  etiqueta,
  detalle,
  tamano = 108,
}: {
  /** 0-100 (se recorta ahí para el trazo; el texto central puede mostrar más si querés). */
  porcentaje: number
  color: string
  valorCentral: string
  etiqueta: string
  detalle?: string
  tamano?: number
}) {
  const porcentajeTrazo = Math.max(0, Math.min(100, porcentaje))
  const avance = (porcentajeTrazo / 100) * CIRCUNFERENCIA
  const duracionOrbita = '10s'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: tamano }}>
      <svg viewBox="0 0 100 100" width={tamano} height={tamano} role="img" aria-label={`${etiqueta}: ${porcentajeTrazo.toFixed(0)}%`}>
        <circle cx="50" cy="50" r={RADIO} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="7" />
        <circle
          cx="50"
          cy="50"
          r={RADIO}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${avance} ${CIRCUNFERENCIA}`}
          transform="rotate(-90 50 50)"
        />
        <text x="50" y="54" textAnchor="middle" fontSize="20" fontWeight="700" fill="currentColor">
          {valorCentral}
        </text>

        {/* El punto que orbita — la parte con movimiento de verdad. */}
        <g>
          <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur={duracionOrbita} repeatCount="indefinite" />
          <circle cx={50 + RADIO} cy="50" r="4" fill={color} />
        </g>
      </svg>
      <span className="texto-mute" style={{ fontSize: '0.78rem', textAlign: 'center' }}>{etiqueta}</span>
      {detalle && <span className="texto-mute" style={{ fontSize: '0.72rem', textAlign: 'center' }}>{detalle}</span>}
    </div>
  )
}
