import { useEffect, useState, type ReactNode } from 'react'

/**
 * 2026-09-15, pedido explícito del usuario: "todo lo que esté en ajustes
 * tiene que ser menú desplegable, porque toca hacer scroll, scroll, scroll...
 * si estamos en la sección de temas, se escucha y me abre. Si vuelvo a las
 * [otras], se cierra la sección" — apertura ÚNICA: abrir una cierra
 * cualquier otra que estuviera abierta (a diferencia de `AcordeonResumen`,
 * que en Balance sí permite varias abiertas a la vez — ahí cada resumen es
 * independiente; acá el usuario pidió explícitamente lo contrario).
 * `AjustesScreen.tsx` controla eso con un solo `useState<string | null>`
 * (la clave de la sección abierta, o `null`), no un estado por sección.
 *
 * Reusa la misma mecánica CSS de `AcordeonResumen` (`grid-template-rows`
 * 0fr→1fr, sin medir nada con JS) — mismas clases `.acordeon-resumen__panel*`
 * (D-18), solo con una cabecera propia (título simple, sin ícono/chip/papeleta:
 * el contenido de Ajustes ya trae su propio diseño, como las tarjetas de tema
 * o los gráficos de muestra).
 */
export function SeccionDesplegable({
  titulo,
  abierta,
  onToggle,
  children,
}: {
  titulo: string
  abierta: boolean
  onToggle: () => void
  children: ReactNode
}) {
  // 2026-09-22, corrección de un bug real de batería/RAM encontrado en auditoría: el "cerrado"
  // de acá arriba era solo CSS (grid-template-rows 0fr) — React seguía montando `children`
  // siempre, sin importar si la sección estaba abierta. En Ajustes eso significaba renderizar
  // 5 gráficos pesados (anillos, cristal 3D, prisma) apenas se abría la pantalla, aunque el
  // conductor nunca hubiera tocado esa sección. Ahora se monta recién la primera vez que se
  // abre, y sigue montado después (no se vuelve a desmontar al cerrar) para no perder la
  // animación de cierre ni el estado interno si se vuelve a abrir.
  const [yaSeMostro, setYaSeMostro] = useState(abierta)
  useEffect(() => {
    if (abierta) setYaSeMostro(true)
  }, [abierta])

  return (
    <section className="seccion-desplegable">
      <button type="button" className="seccion-desplegable__cabecera" onClick={onToggle} aria-expanded={abierta}>
        <h2 style={{ margin: 0 }}>{titulo}</h2>
        <span className={`acordeon-resumen__chevron${abierta ? ' acordeon-resumen__chevron--abierto' : ''}`} aria-hidden="true">
          ⌄
        </span>
      </button>
      <div className={`acordeon-resumen__panel${abierta ? ' acordeon-resumen__panel--abierto' : ''}`}>
        <div className="acordeon-resumen__panel-interior">
          <div className="seccion-desplegable__contenido">{yaSeMostro ? children : null}</div>
        </div>
      </div>
    </section>
  )
}
