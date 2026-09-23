import { useEffect, useRef, useState } from 'react'
import type { MetaAhorro } from '../../domain/ahorro/types'

/**
 * 2026-09-15, pedido explícito del usuario: "quiero que me crees una
 * gráfica interactiva, súper bonita... con efectos, con movimiento... la
 * gráfica que tiene que mostrar el ahorro de lo que llevo comparado a la
 * meta" — segunda gráfica de Balance, justo debajo de la de distribución
 * (GraficoDistribucion/Cristal3D). Reemplaza al `AnilloMeta` chico que
 * vivía ahí antes (mismo dato, presentación muchísimo más grande y viva).
 *
 * Diseño: un frasco de vidrio con un brillo fijo — mismo espíritu que
 * Cristal3D (SVG + CSS, sin librería de gráficos de terceros) pero
 * enteramente dibujado en código (acá no hay fotos que recortar: es un
 * frasco, no una placa física). El % y el monto se cuentan hacia arriba al
 * montar (`useContadorAnimado`) para que se sienta "vivo", no un texto
 * estático.
 *
 * 2026-09-17, pedido explícito del usuario ("no me gusta ese contenedor...
 * quiero que sea el mismo tarro de cristal con su tapa, pero que vayan
 * apareciendo monedas de oro por dentro a medida que voy ahorrando"): el
 * líquido con olas/burbujas que subía con el % se reemplazó por monedas de
 * oro que van apareciendo y apilándose adentro del MISMO frasco/tapa de
 * siempre (nada del vidrio cambió). Las monedas ocupan posiciones fijas en
 * una grilla (columnas x filas) dentro del frasco, con un jitter
 * determinístico (mismo índice → misma posición siempre, para que no
 * "salten" en cada re-render) para que no se vean perfectamente alineadas —
 * una pila real de monedas, no una cuadrícula. Se revelan de a una, de
 * abajo hacia arriba, en la misma cantidad que el contador de % — cuantas
 * más lleva ahorradas, más monedas hay visibles.
 */

const ANCHO = 200
const ALTO = 260
const FRASCO_X = 30
const FRASCO_Y = 34
const FRASCO_ANCHO = 140
const FRASCO_ALTO = 196
const FRASCO_RADIO = 42

const MONEDA_PAD = 16
const MONEDA_COLUMNAS = 4
const MONEDA_FILAS = 9
const MONEDA_TOTAL = MONEDA_COLUMNAS * MONEDA_FILAS
const MONEDA_RADIO = 12

interface PosicionMoneda { x: number; y: number; rotacion: number }

/** Pseudo-aleatorio determinístico (misma semilla → mismo valor siempre) — nada de Math.random en render, se vería "saltando" en cada re-render. */
function jitter(semilla: number, rango: number): number {
  const bruto = Math.sin(semilla * 12.9898) * 43758.5453
  return ((bruto - Math.floor(bruto)) - 0.5) * 2 * rango
}

function posicionesMonedas(): PosicionMoneda[] {
  const interiorAncho = FRASCO_ANCHO - MONEDA_PAD * 2
  const interiorAlto = FRASCO_ALTO - MONEDA_PAD * 2
  const colAncho = interiorAncho / MONEDA_COLUMNAS
  const filaAlto = interiorAlto / MONEDA_FILAS
  const posiciones: PosicionMoneda[] = []
  for (let i = 0; i < MONEDA_TOTAL; i++) {
    const col = i % MONEDA_COLUMNAS
    const fila = Math.floor(i / MONEDA_COLUMNAS)
    // fila 0 = la de más abajo, para que se "llene" desde el fondo del frasco hacia arriba.
    const xBase = FRASCO_X + MONEDA_PAD + colAncho * col + colAncho / 2
    const yBase = FRASCO_Y + FRASCO_ALTO - MONEDA_PAD - filaAlto * fila - filaAlto / 2
    posiciones.push({
      x: xBase + jitter(i * 2, 5),
      y: yBase + jitter(i * 2 + 1, 4),
      rotacion: jitter(i * 2 + 2, 30),
    })
  }
  return posiciones
}

const POSICIONES_MONEDAS = posicionesMonedas()

function formatoPesos(monto: number): string {
  return `$${Math.round(monto).toLocaleString('es-CO')}`
}

/** Cuenta desde 0 hasta `valorFinal` en `duracionMs` — el "movimiento" del número, no solo del dibujo. */
function useContadorAnimado(valorFinal: number, activo: boolean, duracionMs = 1400): number {
  const [valor, setValor] = useState(activo ? 0 : valorFinal)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    if (!activo) {
      setValor(valorFinal)
      return
    }
    const inicio = performance.now()
    function paso(ahora: number) {
      const progreso = Math.min(1, (ahora - inicio) / duracionMs)
      // ease-out cúbico: arranca rápido, frena suave — se siente premium, no lineal/robótico.
      const suavizado = 1 - Math.pow(1 - progreso, 3)
      setValor(valorFinal * suavizado)
      if (progreso < 1) frameRef.current = requestAnimationFrame(paso)
    }
    frameRef.current = requestAnimationFrame(paso)
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valorFinal, activo, duracionMs])

  return valor
}

export function GraficoAhorroMeta({ metas, animado }: { metas: MetaAhorro[]; animado: boolean }) {
  const objetivoTotal = metas.reduce((acc, m) => acc + m.montoObjetivo, 0)
  const ahorradoTotal = metas.reduce((acc, m) => acc + Math.max(m.saldoActual, 0), 0)
  const porcentajeReal = objetivoTotal > 0 ? (ahorradoTotal / objetivoTotal) * 100 : 0
  const porcentajeTrazo = Math.max(0, Math.min(100, porcentajeReal))
  const cumplida = objetivoTotal > 0 && ahorradoTotal >= objetivoTotal

  const porcentajeAnimado = useContadorAnimado(porcentajeTrazo, animado)
  const montoAnimado = useContadorAnimado(ahorradoTotal, animado)
  // El líquido sube EN VIVO junto con el número (no salta directo al final) — mismo contador, recortado 0-100 por seguridad.
  const porcentajeVisual = Math.max(0, Math.min(100, porcentajeAnimado))

  if (metas.length === 0) {
    return (
      <div className="balance-ahorro balance-ahorro--vacio">
        <div className="balance-ahorro__vacio-icono">🫙</div>
        <p className="texto-mute" style={{ margin: 0, textAlign: 'center' }}>
          Todavía no tienes una meta de ahorro. Creá una en el panel Ahorro y acá van a ir apareciendo las monedas.
        </p>
      </div>
    )
  }

  // Al menos 1 moneda visible apenas hay algo ahorrado, aunque el % redondee a 0 (una meta grande con un aporte chico).
  const cantidadMonedas =
    ahorradoTotal <= 0 ? 0 : Math.max(1, Math.min(MONEDA_TOTAL, Math.round((porcentajeVisual / 100) * MONEDA_TOTAL)))

  const etiquetaMeta =
    metas.length === 1 ? metas[0].nombre : `${metas.length} metas de ahorro`

  return (
    <div className={`balance-ahorro${animado ? '' : ' balance-ahorro--estatico'}${cumplida ? ' balance-ahorro--cumplida' : ''}`}>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} width="100%" style={{ maxWidth: 240, display: 'block', margin: '0 auto' }} role="img" aria-label={`Ahorro: ${porcentajeTrazo.toFixed(0)}% de la meta`}>
        <defs>
          <clipPath id="balanceAhorroClip">
            <rect x={FRASCO_X} y={FRASCO_Y} width={FRASCO_ANCHO} height={FRASCO_ALTO} rx={FRASCO_RADIO} />
          </clipPath>
          {/* Moneda de oro — luz arriba-izquierda (35%/30%), sombra abajo-derecha, mismo criterio de "una sola fuente de luz" que el resto de la app. */}
          <radialGradient id="balanceAhorroMoneda" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#fff2c4" />
            <stop offset="45%" stopColor="#f3c34d" />
            <stop offset="100%" stopColor="#b9812a" />
          </radialGradient>
          <linearGradient id="balanceAhorroVidrio" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          {/*
            2026-09-15, pedido explícito del usuario: "me gustaría que el
            tarro fuera más cristalino, negro, transparentoso... no que sea
            negro, sino no se llenaría la barra" — vidrio ahumado, no vidrio
            blanco/claro como antes, pero MUY transparente en el medio (12%
            de opacidad) para que las monedas de adentro se sigan viendo
            clarísimas a cualquier nivel; solo se oscurece un poco
            arriba/abajo, como el reflejo real de un vidrio oscuro grueso.
          */}
          <linearGradient id="balanceAhorroVidrioCuerpo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#04060a" stopOpacity="0.55" />
            <stop offset="18%" stopColor="#04060a" stopOpacity="0.12" />
            <stop offset="82%" stopColor="#04060a" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#04060a" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        {/* Tapa, decorativa — no forma parte del recorte de las monedas. Metal oscuro, a tono con el vidrio ahumado del cuerpo. */}
        <rect x={ANCHO / 2 - 34} y={10} width={68} height={16} rx={6} fill="#2c3040" opacity={0.75} />
        <rect x={ANCHO / 2 - 30} y={18} width={60} height={16} rx={5} fill="#1a1d27" opacity={0.7} />

        {/* Cuerpo del frasco: vidrio ahumado transparente, con un borde brillante para que se lea "cristal", no una silueta plana. */}
        <rect x={FRASCO_X} y={FRASCO_Y} width={FRASCO_ANCHO} height={FRASCO_ALTO} rx={FRASCO_RADIO} fill="url(#balanceAhorroVidrioCuerpo)" stroke="rgba(255,255,255,0.32)" strokeWidth={2} />

        <g clipPath="url(#balanceAhorroClip)">
          {/*
            Cada moneda es un <g> estático (posición/rotación por atributo SVG,
            fijas) que envuelve al elemento con la clase animada — mismo criterio
            que ya usaba esta gráfica para las olas: el atributo SVG `transform`
            (estático) y una animación CSS de `transform` en el MISMO elemento se
            pisan entre sí, así que cada uno vive en su propio nivel. La animación
            de "aparecer" (ver tokens.css) solo escala/desvanece — nunca mueve —
            así que no le hace falta un nivel propio, alcanza con `transform-box:
            fill-box` para que escale sobre su propio centro sin pisar el translate
            del padre.
          */}
          {POSICIONES_MONEDAS.slice(0, cantidadMonedas).map((pos, i) => (
            <g key={i} transform={`translate(${pos.x}, ${pos.y}) rotate(${pos.rotacion})`}>
              <g className="balance-ahorro__moneda">
                <circle r={MONEDA_RADIO} fill="url(#balanceAhorroMoneda)" stroke="#8a6a1f" strokeWidth={1.2} />
                <circle r={MONEDA_RADIO - 3.5} fill="none" stroke="#f4d68a" strokeWidth={1} opacity={0.5} />
                <ellipse cx={-3} cy={-3} rx={4} ry={2.4} fill="#fff4d6" opacity={0.6} />
              </g>
            </g>
          ))}
        </g>

        {/* Brillo de vidrio, fijo — recortado al mismo contorno del frasco. */}
        <rect x={FRASCO_X} y={FRASCO_Y} width={FRASCO_ANCHO} height={FRASCO_ALTO} rx={FRASCO_RADIO} fill="url(#balanceAhorroVidrio)" clipPath="url(#balanceAhorroClip)" />
        <rect x={FRASCO_X + 10} y={FRASCO_Y + 10} width={16} height={FRASCO_ALTO - 20} rx={8} fill="rgba(255,255,255,0.22)" />
      </svg>

      <div className="balance-ahorro__texto">
        <strong className="balance-ahorro__porcentaje">{Math.round(porcentajeAnimado)}%</strong>
        <span className="texto-mute">{cumplida ? '¡Meta cumplida!' : etiquetaMeta}</span>
        <span className="texto-mute" style={{ fontSize: '0.78rem' }}>
          {formatoPesos(montoAnimado)} de {formatoPesos(objetivoTotal)}
        </span>
      </div>

      {cumplida && (
        <div className="balance-ahorro__chispas" aria-hidden="true">
          <span>✦</span><span>✦</span><span>✦</span><span>✦</span><span>✦</span>
        </div>
      )}
    </div>
  )
}
