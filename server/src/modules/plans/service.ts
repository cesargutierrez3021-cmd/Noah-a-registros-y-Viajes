import { repositorioPlanes } from './repository'
import { CLAVE_PLAN_GRATIS, type PlanPublico } from './types'

function aPlanPublico(plan: { clave: string; nombre: string; limiteConsultasIA: number | null }): PlanPublico {
  return { clave: plan.clave, nombre: plan.nombre, limiteConsultasIA: plan.limiteConsultasIA }
}

export const servicioPlanes = {
  async listarPlanesPublicos(): Promise<PlanPublico[]> {
    const planes = await repositorioPlanes.listarPlanes()
    return planes.map(aPlanPublico)
  },

  /**
   * Se llama justo después de crear el usuario (ver auth/service.ts). Todo
   * usuario nuevo arranca en gratis. Ya no llama a "asegurar" el plan
   * (eso se hace una sola vez al arrancar el server, ver index.ts) — acá
   * solo lo busca; si no existe es un bug de arranque, no algo que este
   * método deba corregir en cada registro.
   */
  async asignarPlanGratisPorDefecto(usuarioId: string): Promise<void> {
    const planGratis = await repositorioPlanes.buscarPlanPorClave(CLAVE_PLAN_GRATIS)
    if (!planGratis) {
      throw new Error(`El plan "${CLAVE_PLAN_GRATIS}" no existe — ¿el server arrancó sin correr asegurarPlanesBaseExisten()?`)
    }
    await repositorioPlanes.asignarPlanAUsuario(usuarioId, planGratis.id)
  },

  async obtenerPlanActualDeUsuario(usuarioId: string): Promise<PlanPublico> {
    const activo = await repositorioPlanes.obtenerPlanActivoDeUsuario(usuarioId)
    if (!activo) {
      // No debería pasar (todo usuario recibe gratis al registrarse), pero si pasa
      // es mejor decirlo explícito que asumir un plan silenciosamente.
      throw new Error(`Usuario ${usuarioId} no tiene ningún plan activo asignado`)
    }
    return aPlanPublico(activo.plan)
  },
}

export { CLAVE_PLAN_GRATIS }
