import { useState } from 'react'
import { solicitarNotificaciones, solicitarUbicacion, solicitarBurbuja, solicitarMicrofono } from '../../domain/onboarding/permisos'
import { useTema, previsualizarTema } from '../../domain/tema/store'
import { TEMAS_DISPONIBLES } from '../../domain/tema/types'
import type { Tema } from '../../domain/tema/types'
import { useVehiculo } from '../../domain/vehiculo/store'
import { VEHICULOS_DISPONIBLES } from '../../domain/vehiculo/types'

type Paso = 'bienvenida' | 'notificaciones' | 'ubicacion' | 'burbuja' | 'microfono' | 'tema' | 'vehiculo'

const ORDEN: Paso[] = ['bienvenida', 'notificaciones', 'ubicacion', 'burbuja', 'microfono', 'tema', 'vehiculo']

/**
 * Se muestra mientras falte tema o vehículo por elegir (App.tsx decide esto
 * mirando `useTema().yaElegido` y `useVehiculo().yaElegido`). El paso inicial
 * arranca en 'vehiculo' cuando el tema ya está elegido pero el vehículo no
 * (2026-09-15, pedido explícito del usuario: "elegir vehículo" se agrega
 * como paso nuevo DESPUÉS de que ya existían usuarios con tema elegido — a
 * esos no hay que volver a pedirles permisos ni tema, solo el paso nuevo).
 *
 * Cada paso de permiso sigue el mismo patrón: explicar en una frase por qué
 * hace falta, un botón que pide el permiso de verdad (domain/onboarding/permisos.ts),
 * y avanza al siguiente paso pase lo que pase (conceda o no) — nunca bloquea.
 */
export function OnboardingScreen() {
  const { yaElegido: temaYaElegido, elegirTema } = useTema()
  const { elegirVehiculo } = useVehiculo()
  const [paso, setPaso] = useState<Paso>(temaYaElegido ? 'vehiculo' : 'bienvenida')
  const [pidiendo, setPidiendo] = useState(false)
  /** Tema que se está VIENDO ahora mismo (repintado real, ver previsualizarTema) — todavía no confirmado. */
  const [temaPrevia, setTemaPrevia] = useState<Tema>('verde')

  function siguiente() {
    const i = ORDEN.indexOf(paso)
    setPaso(ORDEN[i + 1] ?? 'vehiculo')
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

  function manejarPrevisualizar(tema: Tema) {
    setTemaPrevia(tema)
    previsualizarTema(tema)
  }

  function manejarConfirmarTema() {
    elegirTema(temaPrevia)
    // 2026-09-15: antes 'tema' era el último paso, así que no hacía falta
    // avanzar acá — App.tsx desmontaba OnboardingScreen apenas `yaElegido`
    // pasaba a true. Ahora hay un paso más (vehiculo) después, así que este
    // mismo componente sigue montado y hay que avanzar explícitamente.
    siguiente()
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
            Tocá uno para verlo de verdad en esta pantalla — recién cuando confirmes queda guardado. Podés cambiarlo cuando quieras desde Ajustes.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {TEMAS_DISPONIBLES.map((t) => (
              <button
                key={t.valor}
                type="button"
                onClick={() => manejarPrevisualizar(t.valor)}
                style={{
                  textAlign: 'left',
                  padding: 16,
                  border: t.valor === temaPrevia ? '2px solid var(--color-acento)' : '1px solid var(--color-borde)',
                }}
              >
                <strong style={{ display: 'block', marginBottom: 4 }}>
                  {t.nombre} {t.valor === temaPrevia ? '· Viendo' : ''}
                </strong>
                <span className="texto-mute">{t.descripcion}</span>
              </button>
            ))}
          </div>

          {/* Muestra real del tema en vivo — no una foto, la tarjeta usa las mismas clases que ya usa el resto de la app. */}
          <div className="tarjeta-viaje" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6, marginBottom: 20 }}>
            <span className="texto-mute">Vista previa</span>
            <strong style={{ fontSize: '1.4rem' }}>$48.200</strong>
            <span className="texto-mute">3 viajes · 22.4 km</span>
            <button type="button" style={{ marginTop: 8 }}>Botón de ejemplo</button>
          </div>

          <button type="button" onClick={manejarConfirmarTema}>Confirmar {TEMAS_DISPONIBLES.find((t) => t.valor === temaPrevia)?.nombre}</button>
        </>
      )}

      {paso === 'vehiculo' && (
        <>
          <h1 className="titulo-pantalla">¿Qué vehículo manejas?</h1>
          <p className="texto-mute" style={{ marginBottom: 20 }}>
            Así te mostramos el catálogo de mantenimiento correcto. Podés cambiarlo cuando quieras desde Ajustes.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {VEHICULOS_DISPONIBLES.map((v) => (
              <button
                key={v.valor}
                type="button"
                onClick={() => elegirVehiculo(v.valor)}
                style={{ textAlign: 'left', padding: 16, border: '1px solid var(--color-borde)' }}
              >
                <strong style={{ display: 'block', marginBottom: 4 }}>{v.nombre}</strong>
                <span className="texto-mute">{v.descripcion}</span>
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
