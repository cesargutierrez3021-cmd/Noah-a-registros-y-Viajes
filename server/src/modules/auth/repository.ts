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

  /** Logout de todas las sesiones (ej. si se sospecha robo de token). No se usa todavía desde ninguna ruta, queda lista para Fase 12 (seguridad). */
  async revocarTodosLosTokensDeUsuario(usuarioId: string) {
    return prisma.tokenRefresco.updateMany({
      where: { usuarioId, revocadoEnISO: null },
      data: { revocadoEnISO: new Date() },
    })
  },
}
