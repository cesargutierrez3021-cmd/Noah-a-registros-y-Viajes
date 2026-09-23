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
 * siempre (nada del vidrio cambió).
 *
 * 2026-09-23, dos correcciones reales pedidas por el usuario:
 * 1. "Si yo pongo dos metas, ¿me aparecen dos alcancías o solo una? Tiene
 *    que poderse poner hasta tres ahorros, para que aparezcan tres
 *    alcancías" — antes esto SIEMPRE dibujaba un solo frasco combinando el
 *    total de TODAS las metas entre sí. Ahora `GraficoAhorroMeta` dibuja un
 *    frasco POR meta (componente `FrascoMeta` de abajo, uno por cada
 *    `MetaAhorro`), en fila con `flex-wrap` — 1, 2, 3 o más caben todas,
 *    cada una con su propio % y sus propias monedas.
 * 2. "Lo que pusiste fue una bola... tiene que ser monedas, son planas, y
 *    tiene que estar una encima de la otra de forma natural. No paradas...
 *    no van a ir simétricas, van asimétricas" — cada moneda era un
 *    `<circle>` con un degradado radial fuerte (luz arriba-izquierda,
 *    sombra abajo-derecha), que de frente se lee como una esfera 3D, no
 *    como una moneda plana. Ahora cada moneda es una `<ellipse>` achatada
 *    (una moneda vista de frente, acostada, no una bola) con un degradado
 *    más plano tipo metal, apiladas con un paso vertical MENOR que su
 *    propio alto — se solapan de verdad, como una pila real de monedas, no
 *    una grilla con huecos — y con más variación de posición/rotación por
 *    moneda para que la pila se vea desordenada/asimétrica, no perfecta.
 */

const ANCHO = 200
const ALTO = 260
const FRASCO_X = 30
const FRASCO_Y = 34
const FRASCO_ANCHO = 140
const FRASCO_ALTO = 196
const FRASCO_RADIO = 42

const MONEDA_PAD = 14
const MONEDA_COLUMNAS = 3
const MONEDA_FILAS = 14
const MONEDA_TOTAL = MONEDA_COLUMNAS * MONEDA_FILAS
const MONEDA_RX = 14
const MONEDA_RY = 6
/** Menor que 2×MONEDA_RY a propósito: las monedas de una misma columna se solapan (se ve la pila), no quedan separadas en una grilla. */
const MONEDA_PASO_VERTICAL = 8

interface PosicionMoneda { x: number; y: number; rotacion: number }

/** Pseudo-aleatorio determinístico (misma semilla → mismo valor siempre) — nada de Math.random en render, se vería "saltando" en cada re-render. */
function jitter(semilla: number, rango: number): number {
  const bruto = Math.sin(semilla * 12.9898) * 43758.5453
  return ((bruto - Math.floor(bruto)) - 0.5) * 2 * rango
}

function posicionesMonedas(): PosicionMoneda[] {
  const interiorAncho = FRASCO_ANCHO - MONEDA_PAD * 2
  const colAncho = interiorAncho / MONEDA_COLUMNAS
  const posiciones: PosicionMoneda[] = []
  for (let i = 0; i < MONEDA_TOTAL; i++) {
    const col = i % MONEDA_COLUMNAS
    const fila = Math.floor(i / MONEDA_COLUMNAS)
    // fila 0 = la de más abajo, para que la pila "crezca" desde el fondo del frasco hacia arriba.
    const xBase = FRASCO_X + MONEDA_PAD + colAncho * col + colAncho / 2
    const yBase = FRASCO_Y + FRASCO_ALTO - MONEDA_PAD - MONEDA_PASO_VERTICAL * fila
    posiciones.push({
      // Jitter horizontal más ancho que el vertical a propósito: una pila real de monedas se
      // "desparrama" más de lado a lado que verticalmente (cada una sigue apoyada en la de abajo).
      x: xBase + jitter(i * 3, 7),
      y: yBase + jitter(i * 3 + 1, 1.6),
      rotacion: jitter(i * 3 + 2, 9),
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

/** Un solo frasco, para UNA meta — ver el punto 1 del comentario de arriba. */
function FrascoMeta({ meta, animado, chico }: { meta: MetaAhorro; animado: boolean; chico: boolean }) {
  const objetivo = meta.montoObjetivo
  const ahorrado = Math.max(meta.saldoActual, 0)
  const porcentajeReal = objetivo > 0 ? (ahorrado / objetivo) * 100 : 0
  const porcentajeTrazo = Math.max(0, Math.min(100, porcentajeReal))
  const cumplida = objetivo > 0 && ahorrado >= objetivo

  const porcentajeAnimado = useContadorAnimado(porcentajeTrazo, animado)
  const montoAnimado = useContadorAnimado(ahorrado, animado)
  const porcentajeVisual = Math.max(0, Math.min(100, porcentajeAnimado))

  // Al menos 1 moneda visible apenas hay algo ahorrado, aunque el % redondee a 0 (una meta grande con un aporte chico).
  const cantidadMonedas = ahorrado <= 0 ? 0 : Math.max(1, Math.min(MONEDA_TOTAL, Math.round((porcentajeVisual / 100) * MONEDA_TOTAL)))
  const idClip = `balanceAhorroClip-${meta.id}`
  const idMoneda = `balanceAhorroMoneda-${meta.id}`
  const idVidrio = `balanceAhorroVidrio-${meta.id}`
  const idVidrioCuerpo = `balanceAhorroVidrioCuerpo-${meta.id}`

  return (
    <div
      className={`balance-ahorro__item${animado ? '' : ' balance-ahorro--estatico'}${cumplida ? ' balance-ahorro--cumplida' : ''}`}
    >
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        width="100%"
        style={{ maxWidth: chico ? 150 : 240, display: 'block', margin: '0 auto' }}
        role="img"
        aria-label={`Ahorro de ${meta.nombre}: ${porcentajeTrazo.toFixed(0)}% de la meta`}
      >
        <defs>
          <clipPath id={idClip}>
            <rect x={FRASCO_X} y={FRASCO_Y} width={FRASCO_ANCHO} height={FRASCO_ALTO} rx={FRASCO_RADIO} />
          </clipPath>
          {/*
            2026-09-23: degradado más PLANO que antes (menos contraste centro→borde, luz arriba
            en vez de arriba-izquierda) — el radial fuerte de antes es justo lo que hacía leer
            cada moneda como una esfera de frente. Combinado con la forma achatada (`<ellipse>`
            abajo), esto lee como una moneda de metal acostada, no una bola.
          */}
          <linearGradient id={idMoneda} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffe9ae" />
            <stop offset="55%" stopColor="#e8b64a" />
            <stop offset="100%" stopColor="#a8781f" />
          </linearGradient>
          <linearGradient id={idVidrio} x1="0" y1="0" x2="1" y2="1">
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
          <linearGradient id={idVidrioCuerpo} x1="0" y1="0" x2="0" y2="1">
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
        <rect x={FRASCO_X} y={FRASCO_Y} width={FRASCO_ANCHO} height={FRASCO_ALTO} rx={FRASCO_RADIO} fill={`url(#${idVidrioCuerpo})`} stroke="rgba(255,255,255,0.32)" strokeWidth={2} />

        <g clipPath={`url(#${idClip})`}>
          {/*
            Cada moneda es un <g> estático (posición/rotación por atributo SVG,
            fijas) que envuelve al elemento con la clase animada — el atributo SVG
            `transform` (estático) y una animación CSS de `transform` en el MISMO
            elemento se pisan entre sí, así que cada uno vive en su propio nivel.
            La animación de "aparecer" (ver tokens.css) solo escala/desvanece —
            nunca mueve — así que le alcanza con `transform-box: fill-box` para
            escalar sobre su propio centro sin pisar el translate del padre.
          */}
          {POSICIONES_MONEDAS.slice(0, cantidadMonedas).map((pos, i) => (
            <g key={i} transform={`translate(${pos.x}, ${pos.y}) rotate(${pos.rotacion})`}>
              <g className="balance-ahorro__moneda">
                {/* Canto de la moneda (aro fino abajo) — refuerza que es un disco con grosor, no una figura plana sin volumen. */}
                <ellipse cy={1.4} rx={MONEDA_RX} ry={MONEDA_RY} fill="#7a5a17" opacity={0.9} />
                <ellipse rx={MONEDA_RX} ry={MONEDA_RY} fill={`url(#${idMoneda})`} stroke="#8a6a1f" strokeWidth={1} />
                <ellipse rx={MONEDA_RX - 3.2} ry={MONEDA_RY - 1.6} fill="none" stroke="#f4d68a" strokeWidth={0.8} opacity={0.5} />
                <ellipse cx={-2.5} cy={-1.6} rx={3.4} ry={1.3} fill="#fff4d6" opacity={0.65} />
              </g>
            </g>
          ))}
        </g>

        {/* Brillo de vidrio, fijo — recortado al mismo contorno del frasco. */}
        <rect x={FRASCO_X} y={FRASCO_Y} width={FRASCO_ANCHO} height={FRASCO_ALTO} rx={FRASCO_RADIO} fill={`url(#${idVidrio})`} clipPath={`url(#${idClip})`} />
        <rect x={FRASCO_X + 10} y={FRASCO_Y + 10} width={16} height={FRASCO_ALTO - 20} rx={8} fill="rgba(255,255,255,0.22)" />
      </svg>

      <div className="balance-ahorro__texto">
        <strong className="balance-ahorro__porcentaje" style={chico ? { fontSize: '1.6rem' } : undefined}>
          {Math.round(porcentajeAnimado)}%
        </strong>
        <span className="texto-mute">{cumplida ? '¡Meta cumplida!' : meta.nombre}</span>
        <span className="texto-mute" style={{ fontSize: '0.78rem' }}>
          {formatoPesos(montoAnimado)} de {formatoPesos(objetivo)}
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

export function GraficoAhorroMeta({ metas, animado }: { metas: MetaAhorro[]; animado: boolean }) {
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

  // 2026-09-23: más de una meta = un frasco por cada una, más chicos para que quepan en fila (flex-wrap se encarga si son muchas).
  const chico = metas.length > 1

  return (
    <div className="balance-ahorro balance-ahorro-grupo">
      {metas.map((meta) => (
        <FrascoMeta key={meta.id} meta={meta} animado={animado} chico={chico} />
      ))}
    </div>
  )
}
