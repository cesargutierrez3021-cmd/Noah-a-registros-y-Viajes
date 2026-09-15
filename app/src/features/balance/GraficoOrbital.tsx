/**
 * "Gráfica orbital" del Balance general (2026-09-15, pedido explícito del
 * usuario): 4 categorías — Ingreso / Gastos / Hogar / Ahorro — como nodos que
 * ORBITAN de verdad alrededor del balance neto (rotación SVG continua, no un
 * dato que "cambia de color"), cada una con su propio color fijo, y el
 * tamaño del nodo según el monto (más plata, nodo más grande).
 *
 * Colores — validados con la skill `dataviz` (scripts/validate_palette.js),
 * no elegidos a ojo: son 4 de los 8 tonos categóricos de su paleta de
 * referencia, en el orden documentado ahí (azul→naranja→aqua→amarillo),
 * que pasa el chequeo de daltonismo para pares ADYACENTES en modo oscuro
 * (ΔE CVD 8.4, ΔE visión normal 19.8 — el par que cierra el anillo,
 * amarillo↔azul, también pasa: ΔE 27.4/30.7). No pasa el chequeo "todos
 * contra todos" (ese es para dispersión de puntos con posición variable);
 * acá no aplica porque cada categoría vive SIEMPRE en el mismo lugar del
 * anillo — el único par que un ojo puede comparar "de cerca" es el
 * adyacente, igual que en una leyenda o una fila de tarjetas.
 *
 * Por eso mismo nunca dependen SOLO del color: cada nodo lleva su etiqueta
 * encima (contra-rotada para que no gire con la órbita) y además hay una
 * leyenda fija abajo con el monto exacto — la identidad nunca es solo el
 * color (regla de la skill).
 */

interface CategoriaBalance {
  clave: 'ingreso' | 'gastos' | 'hogar' | 'ahorro'
  etiqueta: string
  icono: string
  monto: number
  /** Ángulo en grados, 0 = derecha, 90 = abajo (convención SVG, eje Y hacia abajo). */
  anguloInicial: number
  color: string
}

function formatoPesosCorto(monto: number): string {
  if (Math.abs(monto) >= 1_000_000) return `$${(monto / 1_000_000).toFixed(1)}M`
  if (Math.abs(monto) >= 1_000) return `$${Math.round(monto / 1000)}K`
  return `$${Math.round(monto)}`
}

const CENTRO = 130
const RADIO_ORBITA = 96
const RADIO_NODO_MIN = 17
const RADIO_NODO_MAX = 40

function radioNodo(monto: number, montoMaximo: number): number {
  if (montoMaximo <= 0) return RADIO_NODO_MIN
  // Escala por raíz cuadrada (proporcional al ÁREA, no al radio) — un monto
  // el doble de grande no debe verse "el doble de intimidante".
  const proporcion = Math.sqrt(Math.max(monto, 0) / montoMaximo)
  return RADIO_NODO_MIN + proporcion * (RADIO_NODO_MAX - RADIO_NODO_MIN)
}

export function GraficoOrbital({
  ingresos,
  gastosOperativos,
  gastosDeHogar,
  ahorro,
  balanceNeto,
}: {
  ingresos: number
  gastosOperativos: number
  gastosDeHogar: number
  ahorro: number
  balanceNeto: number
}) {
  const categorias: CategoriaBalance[] = [
    { clave: 'ingreso', etiqueta: 'Ingreso', icono: '↑', monto: ingresos, anguloInicial: -90, color: '#3987e5' },
    { clave: 'gastos', etiqueta: 'Gastos', icono: '⛽', monto: gastosOperativos, anguloInicial: 0, color: '#d95926' },
    { clave: 'ahorro', etiqueta: 'Ahorro', icono: '●', monto: ahorro, anguloInicial: 90, color: '#199e70' },
    { clave: 'hogar', etiqueta: 'Hogar', icono: '⌂', monto: gastosDeHogar, anguloInicial: 180, color: '#c98500' },
  ]
  const montoMaximo = Math.max(ingresos, gastosOperativos, gastosDeHogar, ahorro, 1)

  return (
    <div className="balance-orbital">
      <svg viewBox="0 0 260 260" role="img" aria-label="Balance general por categoría, con movimiento orbital">
        <circle cx={CENTRO} cy={CENTRO} r={RADIO_ORBITA} fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1" />

        <g textAnchor="middle">
          <text x={CENTRO} y={CENTRO - 4} fontSize="10" opacity="0.65">
            Balance neto
          </text>
          <text x={CENTRO} y={CENTRO + 14} fontSize="17" fontWeight="700">
            {formatoPesosCorto(balanceNeto)}
          </text>
        </g>

        {categorias.map((cat) => {
          const r = radioNodo(cat.monto, montoMaximo)
          const rad = (cat.anguloInicial * Math.PI) / 180
          const x0 = CENTRO + RADIO_ORBITA * Math.cos(rad)
          const y0 = CENTRO + RADIO_ORBITA * Math.sin(rad)
          const duracion = '28s'
          return (
            <g key={cat.clave}>
              <animateTransform
                attributeName="transform"
                type="rotate"
                from={`0 ${CENTRO} ${CENTRO}`}
                to={`360 ${CENTRO} ${CENTRO}`}
                dur={duracion}
                repeatCount="indefinite"
              />
              <g transform={`translate(${x0} ${y0})`}>
                <g>
                  {/* Contra-rotación: mantiene el ícono/etiqueta derechos mientras el nodo orbita. */}
                  <animateTransform attributeName="transform" type="rotate" from="0" to="-360" dur={duracion} repeatCount="indefinite" />
                  <circle r={r} fill={cat.color} fillOpacity="0.92" />
                  <text textAnchor="middle" dominantBaseline="central" fontSize={r * 0.6} fill="#ffffff">
                    {cat.icono}
                  </text>
                </g>
              </g>
            </g>
          )
        })}
      </svg>

      <ul className="balance-orbital__leyenda">
        {categorias.map((cat) => (
          <li key={cat.clave}>
            <span className="balance-orbital__punto" style={{ background: cat.color }} />
            <span className="balance-orbital__nombre">{cat.etiqueta}</span>
            <strong>{formatoPesosCorto(cat.monto)}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}
