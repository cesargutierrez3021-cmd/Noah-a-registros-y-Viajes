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
 * Al lograr sesión, vuelve a la pantalla de conversación (Fase 10) — es la
 * única pantalla que hoy necesita estar autenticado, así que tiene sentido
 * que sea el destino por defecto después de loguearse. Si en el futuro más
 * pantallas necesitan sesión, esto se generaliza a "volver a la última
 * pantalla protegida que se intentó abrir".
 */
export function CuentaScreen() {
  const { cargando, error, registrarse, iniciarSesion, cerrarSesion, autenticado } = useAuth()
  const [modo, setModo] = useState<'login' | 'registro'>('login')
  const [email, setEmail] = useState('')
  const [contrasena, setContrasena] = useState('')
  const navegar = useNavigate()

  async function manejarEnviar(evento: React.FormEvent) {
    evento.preventDefault()
    const exito = modo === 'login' ? await iniciarSesion(email, contrasena) : await registrarse(email, contrasena)
    if (exito) navegar('/') // antes iba a /conversacion — esa ruta ya no existe, MIA ahora es <MiaBurbuja/> visible desde cualquier panel (Bloque 4)
  }

  if (autenticado()) {
    return (
      <section className="pantalla"><div className="app-panel">
        <h1 className="titulo-pantalla">Cuenta</h1>
        <p className="texto-mute" style={{ marginBottom: 16 }}>Ya iniciaste sesión.</p>
        <button type="button" onClick={cerrarSesion}>Cerrar sesión</button>
      </section>
    )
  }

  return (
    <section className="pantalla">
      <h1 className="titulo-pantalla">{modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h1>

      <form onSubmit={manejarEnviar} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
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

      {error && (
        <p className="texto-mute" style={{ color: '#f04646', marginBottom: 16 }}>
          {error}
        </p>
      )}

      <button type="button" onClick={() => setModo(modo === 'login' ? 'registro' : 'login')}>
        {modo === 'login' ? '¿No tienes cuenta? Crear una' : '¿Ya tienes cuenta? Iniciar sesión'}
      </button>
    </div></section>
  )
}
