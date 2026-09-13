import { prisma } from '../../lib/prisma'
import { PLANES_BASE } from './types'

export const repositorioPlanes = {
  async listarPlanes() {
    return prisma.plan.findMany({ orderBy: { nombre: 'asc' } })
  },

  async buscarPlanPorClave(clave: string) {
    return prisma.plan.findUnique({ where: { clave } })
  },

  /** Fase 11: mapea el SKU de Google Play de una compra al Plan correspondiente. */
  async buscarPlanPorProductoGoogle(productIdGooglePlay: string) {
    return prisma.plan.findUnique({ where: { productIdGooglePlay } })
  },

  /**
   * Se llama una vez al arrancar el server (ver index.ts) — idempotente.
   * Reemplaza a la antigua `asegurarPlanGratisExiste` (Fase 7): ahora
   * garantiza TODO el catálogo de `PLANES_BASE` (Fase 11 agregó los planes
   * pagos), no solo el gratis.
   */
  async asegurarPlanesBaseExisten() {
    for (const plan of PLANES_BASE) {
      await prisma.plan.upsert({
        where: { clave: plan.clave },
        update: { nombre: plan.nombre, limiteConsultasIA: plan.limiteConsultasIA, productIdGooglePlay: plan.productIdGooglePlay },
        create: plan,
      })
    }
  },

  async asignarPlanAUsuario(
    usuarioId: string,
    planId: string,
    opciones: { purchaseToken?: string; finISO?: Date | null } = {},
  ) {
    return prisma.planDeUsuario.create({
      data: { usuarioId, planId, activo: true, purchaseToken: opciones.purchaseToken, finISO: opciones.finISO },
    })
  },

  async obtenerPlanActivoDeUsuario(usuarioId: string) {
    return prisma.planDeUsuario.findFirst({
      where: { usuarioId, activo: true },
      orderBy: { inicioISO: 'desc' },
      include: { plan: true },
    })
  },

  /** Fase 11: al activar un plan nuevo (por compra), el/los anteriores dejan de contar como activos. No los borra — queda el historial. */
  async desactivarPlanesActivosDeUsuario(usuarioId: string) {
    await prisma.planDeUsuario.updateMany({ where: { usuarioId, activo: true }, data: { activo: false } })
  },

  /** Fase 11 — idempotencia: si este `purchaseToken` ya generó una fila, `validarCompra` no debe duplicarla. */
  async buscarPlanDeUsuarioPorTokenDeCompra(purchaseToken: string) {
    return prisma.planDeUsuario.findUnique({ where: { purchaseToken }, include: { plan: true } })
  },
}
