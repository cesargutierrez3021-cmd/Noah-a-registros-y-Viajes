import { Router } from 'express'
import { servicioAuth } from './service'
import { repositorioAuth } from './repository'
import { esquemaCredenciales, esquemaTokenRefresco } from './schemas'
import { requiereAutenticacion } from './middleware'
import { async } from '../../http/asyncHandler'
import { crearLimitadorDeTasa } from '../../http/rateLimit'
import { logEventoSeguridad } from '../../lib/logSeguridad'
import { ErrorAuth } from './service'

export const rutasAuth = Router()

// Fase 12: /login y /registro son las rutas más golpeadas por bots de fuerza
// bruta o de creación masiva de cuentas — límite más estricto que el resto
// del backend. 10 intentos por IP cada 15 minutos: generoso para un usuario
// real que se equivoca la contraseña un par de veces, duro para un script.
const limitadorAuth = crearLimitadorDeTasa(15 * 60 * 1000, 10, 'Demasiados intentos. Espera unos minutos y vuelve a intentar.')

rutasAuth.post(
  '/registro',
  limitadorAuth,
  async(async (req, res) => {
    const { email, contrasena } = esquemaCredenciales.parse(req.body)
    try {
      const { usuario, tokens } = await servicioAuth.registrar(email, contrasena)
      res.status(201).json({ usuario, ...tokens })
    } catch (err) {
      // Fase 12, pendiente #4: varios "ya existe una cuenta" seguidos desde la
      // misma IP es la señal de un script probando emails en serie.
      if (err instanceof ErrorAuth) {
        logEventoSeguridad({ tipo: 'registro_rechazado', ip: req.ip ?? 'desconocida', detalle: err.message })
      }
      throw err // el status/forma de la respuesta la sigue decidiendo http/errorHandler.ts, esto solo registra
    }
  }),
)

rutasAuth.post(
  '/login',
  limitadorAuth,
  async(async (req, res) => {
    const { email, contrasena } = esquemaCredenciales.parse(req.body)
    try {
      const { usuario, tokens } = await servicioAuth.iniciarSesion(email, contrasena)
      res.json({ usuario, ...tokens })
    } catch (err) {
      // No se registra el email en texto plano a propósito (evita que el log
      // termine siendo, en la práctica, una lista de emails válidos/inválidos).
      if (err instanceof ErrorAuth) {
        logEventoSeguridad({ tipo: 'login_fallido', ip: req.ip ?? 'desconocida' })
      }
      throw err
    }
  }),
)

rutasAuth.post(
  '/refrescar',
  limitadorAuth,
  async(async (req, res) => {
    const { tokenRefresco } = esquemaTokenRefresco.parse(req.body)
    const tokens = await servicioAuth.refrescarSesion(tokenRefresco)
    res.json(tokens)
  }),
)

/** Ruta de referencia para probar que el middleware de auth funciona end-to-end. */
rutasAuth.get(
  '/yo',
  requiereAutenticacion,
  async(async (req, res) => {
    const usuario = await repositorioAuth.buscarUsuarioPorId(req.usuarioId!)
    if (!usuario) {
      res.status(404).json({ error: 'Usuario no encontrado' })
      return
    }
    res.json({ id: usuario.id, email: usuario.email, creadoEnISO: usuario.creadoEnISO.toISOString() })
  }),
)
