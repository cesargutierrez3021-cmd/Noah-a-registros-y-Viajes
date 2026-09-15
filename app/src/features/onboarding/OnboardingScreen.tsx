import { useState } from 'react'
import { solicitarNotificaciones, solicitarUbicacion, solicitarBurbuja, solicitarMicrofono } from '../../domain/onboarding/permisos'
import { useTema } from '../../domain/tema/store'
import { TEMAS_DISPONIBLES } from '../../domain/tema/types'
import type { Tema } from '../../domain/tema/types'

type Paso = 'bienvenida' | 'notificaciones' | 'ubicacion' | 'burbuja' | 'microfono' | 'tema'

const ORDEN: Paso[] = ['bienvenida', 'notificaciones', 'ubicacion', 'burbuja', 'microfono', 'tema']

/**
 * Se muestra UNA sola vez, la primera vez que se abre la app (App.tsx decide
 * esto mirando `useTema().yaElegido` — elegir un tema es a propósito el
 * último paso, así que "ya eligió tema" y "ya completó el onboarding" son
 * la misma pregunta, sin necesitar una segunda bandera guardada aparte).
 *
 * Cada paso de permiso sigue el mismo patrón: explicar en una frase por qué
 * hace falta, un botón que pide el permiso de verdad (domain/onboarding/permisos.ts),
 * y avanza al siguiente paso pase lo que pase (conceda o no) — nunca bloquea.
 */
export function OnboardingScreen() {
  const { elegirTema } = useTema()
  const [paso, setPaso] = useState<Paso>('bienvenida')
  const [pidiendo, setPidiendo] = useState(false)

  function siguiente() {
    const i = ORDEN.indexOf(paso)
    setPaso(ORDEN[i + 1] ?? 'tema')
  }

  async function manejarPermiso(solicitar: () => Promise<boolean>) {
    setPidiendo(true)
    try {
      await solicitar()
    } finally {
      setPidiendo(false)
      siguiente()
    }
  }

  function manejarElegirTema(tema: Tema) {
    elegirTema(tema)
    // No hace falta navegar a ningún lado — App.tsx re-renderiza a los
    // paneles normales apenas `yaElegido` pasa a true.
  }

  return (
    <div className="pantalla" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh', textAlign: 'center' }}>
      {paso === 'bienvenida' && (
        <>
          <h1 className="titulo-pantalla">Bienvenido a MIA</h1>
          <p className="texto-mute" style={{ marginBottom: 24 }}>
            Antes de empezar, te vamos a pedir 4 permisos — cada uno con una razón concreta, ninguno es obligatorio para seguir.
          </p>
          <button type="button" onClick={siguiente}>Empezar</button>
        </>
      )}

      {paso === 'notificaciones' && (
        <PasoPermiso
          titulo="Notificaciones"
          detalle="Para avisarte de mantenimientos próximos a vencer y del estado de tu jornada."
          pidiendo={pidiendo}
          onPermitir={() => void manejarPermiso(solicitarNotificaciones)}
          onOmitir={siguiente}
        />
      )}

      {paso === 'ubicacion' && (
        <PasoPermiso
          titulo="Ubicación en tiempo real"
          detalle="Precisa y siempre activa — así MIA mide tus kilómetros reales aunque guardes el teléfono a mitad de un viaje."
          pidiendo={pidiendo}
          onPermitir={() => void manejarPermiso(solicitarUbicacion)}
          onOmitir={siguiente}
        />
      )}

      {paso === 'burbuja' && (
        <PasoPermiso
          titulo="Burbuja flotante"
          detalle="Para mostrar tu jornada encima de otras apps (como el mapa de la plataforma) mientras trabajas."
          pidiendo={pidiendo}
          onPermitir={() => void manejarPermiso(solicitarBurbuja)}
          onOmitir={siguiente}
        />
      )}

      {paso === 'microfono' && (
        <PasoPermiso
          titulo="Micrófono"
          detalle="Para poder hablarle a MIA y que te responda por voz mientras manejas."
          pidiendo={pidiendo}
          onPermitir={() => void manejarPermiso(solicitarMicrofono)}
          onOmitir={siguiente}
        />
      )}

      {paso === 'tema' && (
        <>
          <h1 className="titulo-pantalla">Elige tu tema</h1>
          <p className="texto-mute" style={{ marginBottom: 20 }}>
            Puedes cambiarlo cuando quieras desde Ajustes.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {TEMAS_DISPONIBLES.map((t) => (
              <button
                key={t.valor}
                type="button"
                onClick={() => manejarElegirTema(t.valor)}
                style={{ textAlign: 'left', padding: 16 }}
              >
                <strong style={{ display: 'block', marginBottom: 4 }}>{t.nombre}</strong>
                <span className="texto-mute">{t.descripcion}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function PasoPermiso({
  titulo,
  detalle,
  pidiendo,
  onPermitir,
  onOmitir,
}: {
  titulo: string
  detalle: string
  pidiendo: boolean
  onPermitir: () => void
  onOmitir: () => void
}) {
  return (
    <>
      <h1 className="titulo-pantalla">{titulo}</h1>
      <p className="texto-mute" style={{ marginBottom: 24 }}>{detalle}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button type="button" onClick={onPermitir} disabled={pidiendo}>
          {pidiendo ? 'Un momento…' : 'Permitir'}
        </button>
        <button type="button" onClick={onOmitir} disabled={pidiendo} style={{ background: 'transparent' }}>
          Ahora no
        </button>
      </div>
    </>
  )
}
