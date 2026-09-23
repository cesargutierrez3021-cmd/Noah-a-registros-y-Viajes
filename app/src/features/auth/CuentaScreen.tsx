import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../domain/auth/store'

/**
 * Pantalla de cuenta: login y registro en una sola pantalla con un toggle,
 * en vez de dos pantallas separadas — son casi el mismo formulario (email +
 * contraseña) y el backend ya distingue el error de cada caso
 * (server/src/modules/auth/service.ts: "Ya existe una cuenta con ese email"
 * al registrar, "Email o contraseña incorrectos" al iniciar sesión).
 *
 * Al lograr sesión, vuelve al panel de Trabajo ("/") — es a donde se vuelve
 * siempre, sea cual sea el panel desde el que se llegó acá (MiaBurbuja,
 * Planes o Balance, ver App.tsx). Si en el futuro hace falta volver
 * exactamente a donde se estaba, esto se generaliza a "volver a la última
 * pantalla protegida que se intentó abrir".
 *
 * Ya no tiene pestaña propia en la barra de navegación (2026-09-15, ver
 * App.tsx) — se llega acá solo desde un punto que de verdad necesita una
 * cuenta, así que lleva su propio "Volver" (mismo patrón que
 * AgregarViajeManualScreen.tsx, la otra pantalla fuera de la barra).
 *
 * "Olvidé mi contraseña" es un tercer modo del mismo toggle (no una pantalla
 * aparte, mismo criterio que login/registro) con dos pasos adentro: pedir el
 * código por email, y teclearlo junto con la contraseña nueva
 * (server/src/modules/auth/routes.ts: /auth/olvide-contrasena y
 * /auth/restablecer-contrasena — código de 6 dígitos, no un link, porque la
 * app no tiene deep-link configurado).
 */
export function CuentaScreen() {
  const { cargando, error, registrarse, iniciarSesion, cerrarSesion, autenticado, solicitarRecuperacion, restablecerContrasena } = useAuth()
  const [modo, setModo] = useState<'login' | 'registro' | 'recuperar'>('login')
  const [pasoRecuperacion, setPasoRecuperacion] = useState<'pedirCodigo' | 'restablecer'>('pedirCodigo')
  const [email, setEmail] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [codigo, setCodigo] = useState('')
  const [contrasenaNueva, setContrasenaNueva] = useState('')
  const [avisoRecuperacion, setAvisoRecuperacion] = useState<string | null>(null)
  const navegar = useNavigate()

  async function manejarEnviar(evento: React.FormEvent) {
    evento.preventDefault()

    if (modo === 'recuperar') {
      if (pasoRecuperacion === 'pedirCodigo') {
        const exito = await solicitarRecuperacion(email)
        if (exito) {
          setAvisoRecuperacion('Si el email existe, te enviamos un código de 6 dígitos. Revisa tu bandeja de entrada.')
          setPasoRecuperacion('restablecer')
        }
        return
      }
      const exito = await restablecerContrasena(email, codigo, contrasenaNueva)
      if (exito) {
        // Vuelve a login con el email ya cargado — el usuario tiene que iniciar sesión con la contraseña nueva.
        setModo('login')
        setPasoRecuperacion('pedirCodigo')
        setContrasena('')
        setCodigo('')
        setContrasenaNueva('')
        setAvisoRecuperacion('Contraseña actualizada. Inicia sesión de nuevo.')
      }
      return
    }

    const exito = modo === 'login' ? await iniciarSesion(email, contrasena) : await registrarse(email, contrasena)
    if (exito) navegar('/') // antes iba a /conversacion — esa ruta ya no existe, MIA ahora es <MiaBurbuja/> visible desde cualquier panel (Bloque 4)
  }

  function cambiarModo(nuevo: 'login' | 'registro' | 'recuperar') {
    setModo(nuevo)
    setPasoRecuperacion('pedirCodigo')
    setAvisoRecuperacion(null)
  }

  if (autenticado()) {
    return (
      <section className="pantalla"><div className="app-panel">
        <button type="button" onClick={() => navegar('/')} style={{ marginBottom: 16 }}>← Volver</button>
        <h1 className="titulo-pantalla">Cuenta</h1>
        <p className="texto-mute" style={{ marginBottom: 16 }}>Ya iniciaste sesión.</p>
        <button type="button" onClick={cerrarSesion}>Cerrar sesión</button>
      </div></section>
    )
  }

  const titulo =
    modo === 'login' ? 'Iniciar sesión' : modo === 'registro' ? 'Crear cuenta' : pasoRecuperacion === 'pedirCodigo' ? 'Recuperar contraseña' : 'Ingresa el código'

  return (
    <section className="pantalla"><div className="app-panel">
      <button type="button" onClick={() => navegar('/')} style={{ marginBottom: 16 }}>← Volver</button>
      <h1 className="titulo-pantalla">{titulo}</h1>

      {avisoRecuperacion && (
        <p className="texto-mute" style={{ marginBottom: 16 }}>
          {avisoRecuperacion}
        </p>
      )}

      <form onSubmit={manejarEnviar} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {(modo !== 'recuperar' || pasoRecuperacion === 'pedirCodigo') && (
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        )}

        {modo !== 'recuperar' && (
          <input
            type="password"
            placeholder="Contraseña (mínimo 8 caracteres)"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
            minLength={8}
            required
          />
        )}

        {modo === 'recuperar' && pasoRecuperacion === 'restablecer' && (
          <>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Código de 6 dígitos"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
              autoComplete="one-time-code"
              pattern="\d{6}"
              required
            />
            <input
              type="password"
              placeholder="Contraseña nueva (mínimo 8 caracteres)"
              value={contrasenaNueva}
              onChange={(e) => setContrasenaNueva(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </>
        )}

        <button type="submit" disabled={cargando}>
          {cargando
            ? 'Un momento…'
            : modo === 'login'
              ? 'Entrar'
              : modo === 'registro'
                ? 'Crear cuenta'
                : pasoRecuperacion === 'pedirCodigo'
                  ? 'Enviar código'
                  : 'Cambiar contraseña'}
        </button>
      </form>

      {error && (
        <p className="texto-mute" style={{ color: '#f04646', marginBottom: 16 }}>
          {error}
        </p>
      )}

      {modo === 'login' && (
        <button type="button" onClick={() => cambiarModo('recuperar')} style={{ marginBottom: 8 }}>
          ¿Olvidaste tu contraseña?
        </button>
      )}

      <button type="button" onClick={() => cambiarModo(modo === 'login' ? 'registro' : 'login')}>
        {modo === 'login' ? '¿No tienes cuenta? Crear una' : modo === 'registro' ? '¿Ya tienes cuenta? Iniciar sesión' : 'Volver a iniciar sesión'}
      </button>
    </div></section>
  )
}
