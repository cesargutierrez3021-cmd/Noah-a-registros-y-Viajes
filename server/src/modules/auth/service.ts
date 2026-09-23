import { repositorioAuth } from './repository.js'
import { hashearContrasena, verificarContrasena } from './password.js'
import { firmarTokenAcceso, verificarTokenAcceso } from './jwt.js'
import { generarTokenRefrescoCrudo, hashearTokenRefresco } from './refreshTokens.js'
import { generarCodigoRecuperacion, hashearCodigoRecuperacion } from './recuperacion.js'
import { servicioPlanes } from '../plans/service.js'
import { enviarEmail } from '../../lib/email.js'
import { env } from '../../config/env.js'
import type { ParDeTokens, UsuarioPublico } from './types.js'

const RECUPERACION_VIGENCIA_MIN = 15

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

  /**
   * Paso 1 de "olvidé mi contraseña". Mismo criterio de no-enumeración que
   * iniciarSesion: si el email no existe, esta función simplemente no hace
   * nada — la ruta responde el mismo mensaje genérico en los dos casos, así
   * que desde afuera no se puede distinguir "no existe" de "sí te mandamos
   * el código".
   */
  async solicitarRecuperacion(email: string): Promise<void> {
    const usuario = await repositorioAuth.buscarUsuarioPorEmail(email)
    if (!usuario) return

    const codigo = generarCodigoRecuperacion()
    const expiraEnISO = new Date(Date.now() + RECUPERACION_VIGENCIA_MIN * 60 * 1000)
    await repositorioAuth.crearCodigoRecuperacion(usuario.id, hashearCodigoRecuperacion(codigo), expiraEnISO)

    await enviarEmail(
      usuario.email,
      'Tu código para recuperar tu contraseña de MIA',
      `Tu código de recuperación es: ${codigo}\n\nVence en ${RECUPERACION_VIGENCIA_MIN} minutos. Si no pediste esto, ignora este mensaje — tu contraseña sigue igual.`,
    )
  },

  /**
   * Paso 2. El mismo mensaje de error ("Código inválido o expirado") cubre
   * email inexistente, código incorrecto y código vencido — no darle a un
   * atacante ninguna pista de cuál de los tres fue.
   */
  async restablecerContrasena(email: string, codigo: string, contrasenaNueva: string): Promise<void> {
    const usuario = await repositorioAuth.buscarUsuarioPorEmail(email)
    if (!usuario) throw new ErrorAuth('Código inválido o expirado', 400)

    const registro = await repositorioAuth.buscarCodigoRecuperacionVigente(usuario.id, hashearCodigoRecuperacion(codigo))
    if (!registro) throw new ErrorAuth('Código inválido o expirado', 400)

    await repositorioAuth.marcarCodigoRecuperacionUsado(registro.id)
    await repositorioAuth.actualizarContrasena(usuario.id, await hashearContrasena(contrasenaNueva))
    // Restablecer la contraseña cierra todas las sesiones activas — mismo
    // criterio que la rotación de refresh token al detectar reuso.
    await repositorioAuth.revocarTodosLosTokensDeUsuario(usuario.id)
  },

  /** Usado por el middleware de rutas protegidas — no repite verificación en cada ruta. */
  verificarAcceso: verificarTokenAcceso,
}
