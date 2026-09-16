import { create } from 'zustand'
import type { AbonoAhorro, MetaAhorro } from './types'
import { repositorioAhorro } from './repository'

interface EstadoAhorro {
  metas: MetaAhorro[]
  abonos: AbonoAhorro[]
  cargando: boolean
  cargar: () => Promise<void>
  agregarMeta: (nombre: string, montoObjetivo: number, aporteMensualObjetivo: number | null) => Promise<MetaAhorro>
  /** Crea el abono Y actualiza saldoActual de la meta — misma transacción lógica que Deudas.abonar. */
  abonar: (metaId: string, monto: number) => Promise<void>
  /** Cambia SOLO el aporte mensual planeado — mismo patrón que Deudas.actualizarFechaLimite. */
  actualizarAporteMensual: (metaId: string, aporteMensualObjetivo: number | null) => Promise<void>
  /** Metas con saldoActual < montoObjetivo. Mismo criterio que Deudas.deudasActivas, invertido. */
  metasEnProgreso: () => MetaAhorro[]
}

function generarId(): string {
  return crypto.randomUUID()
}

export const useAhorro = create<EstadoAhorro>((set, get) => ({
  metas: [],
  abonos: [],
  cargando: false,

  cargar: async () => {
    set({ cargando: true })
    const [metas, abonos] = await Promise.all([repositorioAhorro.listarMetas(), repositorioAhorro.listarAbonos()])
    set({ metas, abonos, cargando: false })
  },

  agregarMeta: async (nombre, montoObjetivo, aporteMensualObjetivo) => {
    const meta: MetaAhorro = {
      id: generarId(),
      nombre,
      montoObjetivo,
      saldoActual: 0,
      aporteMensualObjetivo,
      creadaEnISO: new Date().toISOString(),
      pendienteDeSync: true,
    }
    await repositorioAhorro.guardarMeta(meta)
    set({ metas: [...get().metas, meta] })
    return meta
  },

  actualizarAporteMensual: async (metaId, aporteMensualObjetivo) => {
    const meta = get().metas.find((m) => m.id === metaId)
    if (!meta) return
    const metaActualizada: MetaAhorro = { ...meta, aporteMensualObjetivo, pendienteDeSync: true }
    await repositorioAhorro.guardarMeta(metaActualizada)
    set({ metas: get().metas.map((m) => (m.id === metaId ? metaActualizada : m)) })
  },

  abonar: async (metaId, monto) => {
    const meta = get().metas.find((m) => m.id === metaId)
    if (!meta) return

    const abono: AbonoAhorro = {
      id: generarId(),
      metaId,
      monto,
      fechaISO: new Date().toISOString(),
      pendienteDeSync: true,
    }
    await repositorioAhorro.guardarAbono(abono)

    // No se deja pasar del objetivo aunque el usuario abone de más — el
    // abono en sí queda registrado completo (nunca se recorta), solo el
    // saldo visible no sube de montoObjetivo (mismo criterio que Deudas.abonar, invertido).
    const metaActualizada: MetaAhorro = { ...meta, saldoActual: Math.min(meta.montoObjetivo, meta.saldoActual + monto), pendienteDeSync: true }
    await repositorioAhorro.guardarMeta(metaActualizada)

    set({
      metas: get().metas.map((m) => (m.id === metaId ? metaActualizada : m)),
      abonos: [...get().abonos, abono],
    })
  },

  metasEnProgreso: () => get().metas.filter((m) => m.saldoActual < m.montoObjetivo),
}))
