import { Link } from 'react-router-dom'
import { useTema } from '../../domain/tema/store'
import { TEMAS_DISPONIBLES } from '../../domain/tema/types'

/**
 * Ajustes (2026-09-15, pedido explícito del usuario): "en ajustes... de
 * poder cambiar el tono más adelante si el cliente quiere cambiarlo" — el
 * tema ya no se elige solo una vez en el Onboarding, acá se puede cambiar
 * cuando sea. Reusa el mismo store/lista que OnboardingScreen (D-18): no
 * hay una segunda fuente de temas disponibles.
 */
export function AjustesScreen() {
  const { tema, elegirTema } = useTema()

  return (
    <div className="pantalla">
      <h1 className="titulo-pantalla">Ajustes</h1>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 4 }}>Tema</h2>
        <p className="texto-mute" style={{ marginBottom: 16 }}>
          Cambia el estilo visual de toda la app cuando quieras.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {TEMAS_DISPONIBLES.map((t) => (
            <button
              key={t.valor}
              type="button"
              onClick={() => elegirTema(t.valor)}
              style={{
                textAlign: 'left',
                padding: 16,
                border: t.valor === tema ? '2px solid var(--color-acento)' : '1px solid var(--color-borde)',
              }}
            >
              <strong style={{ display: 'block', marginBottom: 4 }}>
                {t.nombre} {t.valor === tema ? '· Actual' : ''}
              </strong>
              <span className="texto-mute">{t.descripcion}</span>
            </button>
          ))}
        </div>
      </section>

      <Link to="/" style={{ display: 'inline-block', marginTop: 24 }}>
        ← Volver
      </Link>
    </div>
  )
}
