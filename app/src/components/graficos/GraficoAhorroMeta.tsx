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
 * Diseño: un frasco de vidrio con el líquido del ahorro subiendo hasta el
 * % de la meta, con olas de verdad (dos capas desfasadas, en loop),
 * burbujas subiendo y un brillo de vidrio fijo — mismo espíritu que
 * Cristal3D (SVG + CSS, sin librería de gráficos de terceros) pero
 * enteramente dibujado en código (acá no hay fotos que recortar: es un
 * frasco, no una placa física). El % y el monto se cuentan hacia arriba al
 * montar (`useContadorAnimado`) para que se sienta "vivo", no un texto
 * estático.
 */

const ANCHO = 200
const ALTO = 260
const FRASCO_X = 30
const FRASCO_Y = 34
const FRASCO_ANCHO = 140
const FRASCO_ALTO = 196
const FRASCO_RADIO = 42

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
          Todavía no tienes una meta de ahorro. Creá una en el panel Ahorro y acá va a ir subiendo el líquido.
        </p>
      </div>
    )
  }

  const alturaLiquido = (porcentajeVisual / 100) * FRASCO_ALTO
  const superficieY = FRASCO_Y + FRASCO_ALTO - alturaLiquido
  const mostrarBurbujas = animado && porcentajeTrazo > 8

  const etiquetaMeta =
    metas.length === 1 ? metas[0].nombre : `${metas.length} metas de ahorro`

  return (
    <div className={`balance-ahorro${animado ? '' : ' balance-ahorro--estatico'}${cumplida ? ' balance-ahorro--cumplida' : ''}`}>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} width="100%" style={{ maxWidth: 240, display: 'block', margin: '0 auto' }} role="img" aria-label={`Ahorro: ${porcentajeTrazo.toFixed(0)}% de la meta`}>
        <defs>
          <clipPath id="balanceAhorroClip">
            <rect x={FRASCO_X} y={FRASCO_Y} width={FRASCO_ANCHO} height={FRASCO_ALTO} rx={FRASCO_RADIO} />
          </clipPath>
          <linearGradient id="balanceAhorroLiquido" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d6c8ff" />
            <stop offset="45%" stopColor="#b7a4ff" />
            <stop offset="100%" stopColor="#7c5cd9" />
          </linearGradient>
          <linearGradient id="balanceAhorroVidrio" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          {/*
            2026-09-15, pedido explícito del usuario: "me gustaría que el
            tarro fuera más cristalino, negro, transparentoso... no que sea
            negro, sino no se llenaría la barra" — vidrio ahumado, no vidrio
            blanco/claro como antes, pero MUY transparente en el medio (12%
            de opacidad) para que el líquido se siga viendo clarísimo a
            cualquier nivel; solo se oscurece un poco arriba/abajo, como el
            reflejo real de un vidrio oscuro grueso.
          */}
          <linearGradient id="balanceAhorroVidrioCuerpo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#04060a" stopOpacity="0.55" />
            <stop offset="18%" stopColor="#04060a" stopOpacity="0.12" />
            <stop offset="82%" stopColor="#04060a" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#04060a" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        {/* Tapa, decorativa — no forma parte del recorte del líquido. Metal oscuro, a tono con el vidrio ahumado del cuerpo. */}
        <rect x={ANCHO / 2 - 34} y={10} width={68} height={16} rx={6} fill="#2c3040" opacity={0.75} />
        <rect x={ANCHO / 2 - 30} y={18} width={60} height={16} rx={5} fill="#1a1d27" opacity={0.7} />

        {/* Cuerpo del frasco: vidrio ahumado transparente, con un borde brillante para que se lea "cristal", no una silueta plana. */}
        <rect x={FRASCO_X} y={FRASCO_Y} width={FRASCO_ANCHO} height={FRASCO_ALTO} rx={FRASCO_RADIO} fill="url(#balanceAhorroVidrioCuerpo)" stroke="rgba(255,255,255,0.32)" strokeWidth={2} />

        <g clipPath="url(#balanceAhorroClip)">
          {/* Bloque de líquido — llega hasta bien abajo del viewBox para no dejar hueco cuando la ola se mueve. */}
          <rect x={FRASCO_X - 10} y={superficieY - 6} width={FRASCO_ANCHO + 20} height={ALTO - superficieY + 20} fill="url(#balanceAhorroLiquido)" />

          {/*
            Tres niveles de transform anidados, cada uno dueño de UNA sola cosa, para
            que no choquen entre sí: el atributo SVG `transform` (estático) y la
            propiedad CSS `transform` animada se pisan si conviven en el mismo
            elemento (la animación gana y borra el estático). Nivel 1: posición base
            de la ola cerca de la tapa del frasco (atributo, fijo). Nivel 2: cuánto
            sube el líquido según el % (estilo inline, cambia con el contador).
            Nivel 3 (en cada <path>, ver clases más abajo): el loop horizontal
            infinito, con `animation` en CSS — es el único que toca `transform` ahí.
          */}
          <g transform={`translate(0, ${FRASCO_Y - 6})`}>
            <g style={{ transform: `translateY(${superficieY - FRASCO_Y}px)` }}>
              <path
                className="balance-ahorro__ola balance-ahorro__ola--1"
                d="M-200,10 C-175,0 -125,20 -100,10 C-75,0 -25,20 0,10 C25,0 75,20 100,10 C125,0 175,20 200,10 C225,0 275,20 300,10 V40 H-200 Z"
                fill="#c7b8ff"
                opacity={0.55}
              />
              <path
                className="balance-ahorro__ola balance-ahorro__ola--2"
                d="M-200,14 C-166,26 -134,2 -100,14 C-66,26 -34,2 0,14 C34,26 66,2 100,14 C134,26 166,2 200,14 C234,26 266,2 300,14 V44 H-200 Z"
                fill="#9a86e8"
                opacity={0.6}
              />
            </g>
          </g>

          {mostrarBurbujas && (
            <g className="balance-ahorro__burbujas">
              <circle className="balance-ahorro__burbuja" cx={FRASCO_X + 26} cy={FRASCO_Y + FRASCO_ALTO - 20} r={3.4} style={{ animationDelay: '0s' }} />
              <circle className="balance-ahorro__burbuja" cx={FRASCO_X + 60} cy={FRASCO_Y + FRASCO_ALTO - 14} r={2.6} style={{ animationDelay: '1.1s' }} />
              <circle className="balance-ahorro__burbuja" cx={FRASCO_X + 92} cy={FRASCO_Y + FRASCO_ALTO - 26} r={3.8} style={{ animationDelay: '2.2s' }} />
              <circle className="balance-ahorro__burbuja" cx={FRASCO_X + 114} cy={FRASCO_Y + FRASCO_ALTO - 10} r={2.2} style={{ animationDelay: '0.6s' }} />
            </g>
          )}
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
