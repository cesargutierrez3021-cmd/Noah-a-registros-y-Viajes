import { useState } from 'react'
import { solicitarNotificaciones, solicitarUbicacion, solicitarIgnorarOptimizacionBateria, solicitarBurbuja, solicitarMicrofono } from '../../domain/onboarding/permisos'
import { useOnboarding } from '../../domain/onboarding/store'
import { useTema, previsualizarTema } from '../../domain/tema/store'
import { TEMAS_DISPONIBLES } from '../../domain/tema/types'
import type { Tema } from '../../domain/tema/types'
import { useVehiculo } from '../../domain/vehiculo/store'
import { VEHICULOS_DISPONIBLES } from '../../domain/vehiculo/types'
import { useAuth } from '../../domain/auth/store'

type Paso = 'bienvenida' | 'notificaciones' | 'ubicacion' | 'bateria' | 'burbuja' | 'microfono' | 'tema' | 'vehiculo' | 'cuenta'

const ORDEN: Paso[] = ['bienvenida', 'notificaciones', 'ubicacion', 'bateria', 'burbuja', 'microfono', 'tema', 'vehiculo', 'cuenta']

/**
 * Se muestra mientras falte tema, vehículo o el paso de cuenta por resolver
 * (App.tsx decide esto mirando `useTema().yaElegido`, `useVehiculo().yaElegido`
 * y `useOnboarding().cuentaVista`). El paso inicial se calcula mirando qué
 * falta de verdad — no siempre 'bienvenida' — para no volver a pedirle
 * permisos ni tema a alguien que ya los tenía cuando se agregó un paso nuevo
 * (2026-09-15: 'vehiculo' se agregó así; 2026-09-17: 'cuenta' se agrega con
 * el mismo criterio).
 *
 * Cada paso de permiso sigue el mismo patrón: explicar en una frase por qué
 * hace falta, un botón que pide el permiso de verdad (domain/onboarding/permisos.ts),
 * y avanza al siguiente paso pase lo que pase (conceda o no) — nunca bloquea.
 *
 * 'cuenta' (2026-09-17, pedido explícito del usuario, tras reportar que
 * reinstalar la app le borraba todo): "obviamente también más tarde
 * omitir... que se solucione todo de una vez y siga" — mismo criterio de
 * "nunca bloquea" que los pasos de permiso: ofrece iniciar sesión o crear
 * cuenta ahí mismo (así los datos quedan respaldados, ver
 * domain/restauracion/restaurar.ts), pero un botón "Más tarde" lo saltea sin
 * fricción. Es el ÚLTIMO paso — no hace falta un `siguiente()` explícito
 * después, App.tsx desmonta este componente apenas `cuentaVista` pasa a true.
 */
export function OnboardingScreen() {
  const { yaElegido: temaYaElegido, elegirTema } = useTema()
  const { yaElegido: vehiculoYaElegido, elegirVehiculo } = useVehiculo()
  const [paso, setPaso] = useState<Paso>(!temaYaElegido ? 'bienvenida' : !vehiculoYaElegido ? 'vehiculo' : 'cuenta')
  const [pidiendo, setPidiendo] = useState(false)
  /** Tema que se está VIENDO ahora mismo (repintado real, ver previsualizarTema) — todavía no confirmado. */
  const [temaPrevia, setTemaPrevia] = useState<Tema>('verde')

  function siguiente() {
    const i = ORDEN.indexOf(paso)
    setPaso(ORDEN[i + 1] ?? 'cuenta')
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
            Antes de empezar, te vamos a pedir 5 permisos — cada uno con una razón concreta, ninguno es obligatorio para seguir.
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

      {paso === 'bateria' && (
        <PasoPermiso
          titulo="Sin restricciones de batería"
          detalle="En algunos celulares (Xiaomi, Samsung, Huawei, Oppo) el sistema puede parar la medición de GPS en segundo plano para ahorrar batería, aunque MIA siga corriendo. Excluir la app de esa optimización evita que tus kilómetros queden en cero."
          pidiendo={pidiendo}
          onPermitir={() => void manejarPermiso(solicitarIgnorarOptimizacionBateria)}
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
                onClick={() => { elegirVehiculo(v.valor); siguiente() }}
                style={{ textAlign: 'left', padding: 16, border: '1px solid var(--color-borde)' }}
              >
                <strong style={{ display: 'block', marginBottom: 4 }}>{v.nombre}</strong>
                <span className="texto-mute">{v.descripcion}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {paso === 'cuenta' && <PasoCuenta />}
    </div>
  )
}

/**
 * Ver el comentario largo de 'cuenta' más arriba. Formulario mínimo (email +
 * contraseña, login/registro en un toggle) — mismo patrón que
 * CuentaScreen.tsx pero sin "olvidé mi contraseña" (eso puede esperar a la
 * pantalla completa, no hace falta acá para no alargar el onboarding).
 */
function PasoCuenta() {
  const { cargando, error, registrarse, iniciarSesion } = useAuth()
  const { marcarCuentaVista } = useOnboarding()
  const [modo, setModo] = useState<'login' | 'registro'>('registro')
  const [email, setEmail] = useState('')
  const [contrasena, setContrasena] = useState('')

  async function manejarEnviar(evento: React.FormEvent) {
    evento.preventDefault()
    const exito = modo === 'login' ? await iniciarSesion(email, contrasena) : await registrarse(email, contrasena)
    if (exito) marcarCuentaVista()
  }

  return (
    <>
      <h1 className="titulo-pantalla">{modo === 'login' ? 'Inicia sesión' : 'Creá tu cuenta'}</h1>
      <p className="texto-mute" style={{ marginBottom: 24 }}>
        Así tus datos quedan guardados — si cambiás de teléfono o reinstalás la app, no se pierden. Podés hacerlo después desde Ajustes si preferís.
      </p>

      <form onSubmit={(e) => void manejarEnviar(e)} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        <input
          type="password"
          placeholder="Contraseña (mínimo 8 caracteres)"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
          minLength={8}
          required
        />
        <button type="submit" disabled={cargando}>
          {cargando ? 'Un momento…' : modo === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>
      </form>

      {error && <p className="texto-mute" style={{ color: '#f04646', marginBottom: 16 }}>{error}</p>}

      <button type="button" onClick={() => setModo(modo === 'login' ? 'registro' : 'login')} disabled={cargando} style={{ background: 'transparent', marginBottom: 8 }}>
        {modo === 'login' ? '¿No tenés cuenta? Crear una' : '¿Ya tenés cuenta? Iniciar sesión'}
      </button>
      <button type="button" onClick={marcarCuentaVista} disabled={cargando} style={{ background: 'transparent' }}>
        Más tarde
      </button>
    </>
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
