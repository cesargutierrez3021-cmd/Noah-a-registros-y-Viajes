import { repositorioAuth } from './repository'
import { hashearContrasena, verificarContrasena } from './password'
import { firmarTokenAcceso, verificarTokenAcceso } from './jwt'
import { generarTokenRefrescoCrudo, hashearTokenRefresco } from './refreshTokens'
import { servicioPlanes } from '../plans/service'
import { env } from '../../config/env'
import type { ParDeTokens, UsuarioPublico } from './types'

export class ErrorAuth extends Error {
  constructor(
    message: string,
    public codigoHttp: number,
  ) {
    super(message)
  }
}

function aUsuarioPublico(usuario: { id: string; email: string; creadoEnISO: Date }): UsuarioPublico {
  return { id: usuario.id, email: usuario.email, creadoEnISO: usuario.creadoEnISO.toISOString() }
}

async function emitirParDeTokens(usuarioId: string, email: string): Promise<ParDeTokens> {
  const tokenAcceso = firmarTokenAcceso({ sub: usuarioId, email })

  const tokenRefrescoCrudo = generarTokenRefrescoCrudo()
  const expiraEnISO = new Date(Date.now() + env.jwtExpiracionRefrescoDias * 24 * 60 * 60 * 1000)
  await repositorioAuth.guardarTokenRefresco(usuarioId, hashearTokenRefresco(tokenRefrescoCrudo), expiraEnISO)

  return { tokenAcceso, tokenRefresco: tokenRefrescoCrudo }
}

export const servicioAuth = {
  async registrar(email: string, contrasena: string): Promise<{ usuario: UsuarioPublico; tokens: ParDeTokens }> {
    const yaExiste = await repositorioAuth.buscarUsuarioPorEmail(email)
    if (yaExiste) throw new ErrorAuth('Ya existe una cuenta con ese email', 409)

    const contrasenaHash = await hashearContrasena(contrasena)
    const usuario = await repositorioAuth.crearUsuario(email, contrasenaHash)
    await servicioPlanes.asignarPlanGratisPorDefecto(usuario.id)

    const tokens = await emitirParDeTokens(usuario.id, usuario.email)
    return { usuario: aUsuarioPublico(usuario), tokens }
  },

  async iniciarSesion(email: string, contrasena: string): Promise<{ usuario: UsuarioPublico; tokens: ParDeTokens }> {
    const usuario = await repositorioAuth.buscarUsuarioPorEmail(email)
    // Mensaje idéntico si el email no existe o si la contraseña es incorrecta —
    // así no se puede usar este endpoint para averiguar qué emails están registrados.
    if (!usuario) throw new ErrorAuth('Email o contraseña incorrectos', 401)

    const contrasenaValida = await verificarContrasena(contrasena, usuario.contrasenaHash)
    if (!contrasenaValida) throw new ErrorAuth('Email o contraseña incorrectos', 401)

    const tokens = await emitirParDeTokens(usuario.id, usuario.email)
    return { usuario: aUsuarioPublico(usuario), tokens }
  },

  async refrescarSesion(tokenRefrescoCrudo: string): Promise<ParDeTokens> {
    const hash = hashearTokenRefresco(tokenRefrescoCrudo)
    const registro = await repositorioAuth.buscarTokenRefrescoVigente(hash)
    if (!registro) throw new ErrorAuth('Sesión inválida o expirada, inicia sesión de nuevo', 401)

    const usuario = await repositorioAuth.buscarUsuarioPorId(registro.usuarioId)
    if (!usuario) throw new ErrorAuth('Sesión inválida o expirada, inicia sesión de nuevo', 401)

    // Rotación: el refresh token usado se revoca y se emite uno nuevo — si alguien
    // más lo reutiliza después de esto, ya no sirve (mitiga robo de token).
    await repositorioAuth.revocarTokenRefresco(registro.id)
    return emitirParDeTokens(usuario.id, usuario.email)
  },

  /** Usado por el middleware de rutas protegidas — no repite verificación en cada ruta. */
  verificarAcceso: verificarTokenAcceso,
}
