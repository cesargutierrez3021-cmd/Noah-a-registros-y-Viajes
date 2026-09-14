import { useEffect } from 'react'
import { usePlanes } from '../../domain/planes/store'
import { useAuth } from '../../domain/auth/store'

/**
 * Pantalla de planes (Fase 11). A propósito NO tiene un botón de "Comprar"
 * que haga algo — D-6 exige Google Play Billing Library para cualquier cobro
 * dentro de la app, y eso todavía no está integrado del lado nativo (ver
 * "Estado real de Fase 11" en PLAN-MAESTRO). Un botón que no complete una
 * compra real sería fingir un flujo de cobro, algo que el propio proyecto
 * decidió no hacer (ver comentario histórico en domain/plans/types.ts del
 * backend). Por ahora esta pantalla solo informa: qué plan tiene el
 * conductor hoy y qué otros planes existen en el catálogo.
 */
export function PlanesScreen() {
  const { planes, planActual, cargando, error, cargar } = usePlanes()
  const { autenticado } = useAuth()

  useEffect(() => {
    void cargar(autenticado())
    // Solo debe recargarse si cambia el estado de sesión, no en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section className="pantalla"><div className="app-panel">
      <h1 className="titulo-pantalla">Planes</h1>

      {cargando && <p className="texto-mute">Cargando…</p>}
      {error && (
        <p className="texto-mute" style={{ color: '#f04646', marginBottom: 12 }}>
          {error}
        </p>
      )}

      {!autenticado() && (
        <p className="texto-mute" style={{ marginBottom: 16 }}>
          Inicia sesión para ver tu plan actual.
        </p>
      )}

      {planActual && (
        <div className="tarjeta-viaje" style={{ flexDirection: 'column', alignItems: 'stretch', marginBottom: 16 }}>
          <span className="texto-mute">Tu plan actual</span>
          <strong>{planActual.nombre}</strong>
          <span>{planActual.limiteConsultasIA === null ? 'Consultas a MIA ilimitadas' : `${planActual.limiteConsultasIA} consultas a MIA por mes`}</span>
        </div>
      )}

      <div className="lista-viajes">
        {planes.map((plan) => (
          <div key={plan.clave} className="tarjeta-viaje" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
            <strong>{plan.nombre}</strong>
            <span className="texto-mute">{plan.limiteConsultasIA === null ? 'Consultas a MIA ilimitadas' : `${plan.limiteConsultasIA} consultas a MIA por mes`}</span>
            {plan.clave !== 'gratis' && (
              <span className="texto-mute">La compra dentro de la app todavía no está disponible (Fase 11 en curso).</span>
            )}
          </div>
        ))}
      </div>
    </div></section>
  )
}
