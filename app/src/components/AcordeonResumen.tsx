import type { ReactNode } from 'react'

/**
 * 2026-09-15, pedido explícito del usuario: "botones desplegables para que
 * ahí se haga el resumen de deudas... de gastos del hogar... de la
 * moto/carro... para que la gente no esté haciendo scroll" — usado por
 * BalanceScreen.tsx, una vez por resumen (deudas/hogar/vehículo). Pidió
 * explícitamente que no sea "solo letras y números" al abrirse — por eso
 * el contenido (`children`) se envuelve en una "papeletica" con borde
 * punteado (efecto recibo/ticket) que aparece con una animación propia, no
 * solo un `<ul>` plano.
 *
 * La animación de alto (`grid-template-rows: 0fr → 1fr`) es CSS puro, sin
 * medir con JS — funciona porque el contenido interior tiene `overflow:
 * hidden` (truco estándar para animar a "auto" sin conocer el alto real).
 */
export function AcordeonResumen({
  icono,
  titulo,
  resumen,
  colorAcento,
  abierto,
  onToggle,
  children,
}: {
  icono: string
  titulo: string
  resumen: string
  colorAcento: string
  abierto: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className="acordeon-resumen">
      <button type="button" className="acordeon-resumen__cabecera" onClick={onToggle} aria-expanded={abierto}>
        <span className="acordeon-resumen__icono" style={{ background: `${colorAcento}22`, color: colorAcento }}>
          {icono}
        </span>
        <span className="acordeon-resumen__titulos">
          <strong>{titulo}</strong>
          <span className="texto-mute">{resumen}</span>
        </span>
        <span className={`acordeon-resumen__chevron${abierto ? ' acordeon-resumen__chevron--abierto' : ''}`} aria-hidden="true">
          ⌄
        </span>
      </button>
      <div className={`acordeon-resumen__panel${abierto ? ' acordeon-resumen__panel--abierto' : ''}`}>
        <div className="acordeon-resumen__panel-interior">
          <div className="acordeon-resumen__papeleta" style={{ borderColor: `${colorAcento}55` }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
