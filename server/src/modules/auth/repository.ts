import { prisma } from '../../lib/prisma.js'

export const repositorioAuth = {
  async buscarUsuarioPorEmail(email: string) {
    return prisma.usuario.findUnique({ where: { email } })
  },

  async buscarUsuarioPorId(id: string) {
    return prisma.usuario.findUnique({ where: { id } })
  },

  async crearUsuario(email: string, contrasenaHash: string) {
    return prisma.usuario.create({ data: { email, contrasenaHash } })
  },

  async guardarTokenRefresco(usuarioId: string, tokenHash: string, expiraEnISO: Date) {
    return prisma.tokenRefresco.create({ data: { usuarioId, tokenHash, expiraEnISO } })
  },

  async buscarTokenRefrescoVigente(tokenHash: string) {
    return prisma.tokenRefresco.findFirst({
      where: { tokenHash, revocadoEnISO: null, expiraEnISO: { gt: new Date() } },
    })
  },

  async revocarTokenRefresco(id: string) {
    return prisma.tokenRefresco.update({ where: { id }, data: { revocadoEnISO: new Date() } })
  },

  /** Logout de todas las sesiones (ej. si se sospecha robo de token, o tras restablecer contraseña — ver service.ts). */
  async revocarTodosLosTokensDeUsuario(usuarioId: string) {
    return prisma.tokenRefresco.updateMany({
      where: { usuarioId, revocadoEnISO: null },
      data: { revocadoEnISO: new Date() },
    })
  },

  async actualizarContrasena(usuarioId: string, contrasenaHash: string) {
    return prisma.usuario.update({ where: { id: usuarioId }, data: { contrasenaHash } })
  },

  async crearCodigoRecuperacion(usuarioId: string, codigoHash: string, expiraEnISO: Date) {
    return prisma.codigoRecuperacionContrasena.create({ data: { usuarioId, codigoHash, expiraEnISO } })
  },

  async buscarCodigoRecuperacionVigente(usuarioId: string, codigoHash: string) {
    return prisma.codigoRecuperacionContrasena.findFirst({
      where: { usuarioId, codigoHash, usadoEnISO: null, expiraEnISO: { gt: new Date() } },
    })
  },

  async marcarCodigoRecuperacionUsado(id: string) {
    return prisma.codigoRecuperacionContrasena.update({ where: { id }, data: { usadoEnISO: new Date() } })
  },
}
