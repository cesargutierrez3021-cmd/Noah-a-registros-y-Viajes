import { create } from 'zustand'
import type { AbonoDeuda, CuotaProgramada, Deuda } from './types'
import { repositorioDeudas } from './repository'

interface EstadoDeudas {
  deudas: Deuda[]
  abonos: AbonoDeuda[]
  cargando: boolean
  cargar: () => Promise<void>
  agregarDeuda: (nombre: string, saldoInicial: number, cuotaProgramada: CuotaProgramada | null, fechaLimiteISO: string | null) => Promise<Deuda>
  /** Crea el abono Y actualiza saldoActual de la deuda — misma transacción lógica, ver comentario adentro. */
  abonar: (deudaId: string, monto: number) => Promise<void>
  /** Cambia SOLO la fecha límite (ej. "ya pagué esta cuota, la próxima es en un mes") — mismo patrón que `actualizarMontoConceptoFijo` en domain/hogar. */
  actualizarFechaLimite: (deudaId: string, fechaLimiteISO: string | null) => Promise<void>
  /** Deudas con saldoActual > 0. `alertas`/pantallas usan esto para no mostrar deudas ya pagadas mezcladas con las activas. */
  deudasActivas: () => Deuda[]
}

function generarId(): string {
  return crypto.randomUUID()
}

export const useDeudas = create<EstadoDeudas>((set, get) => ({
  deudas: [],
  abonos: [],
  cargando: false,

  cargar: async () => {
    set({ cargando: true })
    const [deudas, abonos] = await Promise.all([repositorioDeudas.listarDeudas(), repositorioDeudas.listarAbonos()])
    set({ deudas, abonos, cargando: false })
  },

  agregarDeuda: async (nombre, saldoInicial, cuotaProgramada, fechaLimiteISO) => {
    const deuda: Deuda = {
      id: generarId(),
      nombre,
      saldoInicial,
      saldoActual: saldoInicial,
      cuotaProgramada,
      fechaLimiteISO,
      creadaEnISO: new Date().toISOString(),
      pendienteDeSync: true,
    }
    await repositorioDeudas.guardarDeuda(deuda)
    set({ deudas: [...get().deudas, deuda] })
    return deuda
  },

  actualizarFechaLimite: async (deudaId, fechaLimiteISO) => {
    const deuda = get().deudas.find((d) => d.id === deudaId)
    if (!deuda) return
    const deudaActualizada: Deuda = { ...deuda, fechaLimiteISO, pendienteDeSync: true }
    await repositorioDeudas.guardarDeuda(deudaActualizada)
    set({ deudas: get().deudas.map((d) => (d.id === deudaId ? deudaActualizada : d)) })
  },

  abonar: async (deudaId, monto) => {
    const deuda = get().deudas.find((d) => d.id === deudaId)
    if (!deuda) return

    const abono: AbonoDeuda = {
      id: generarId(),
      deudaId,
      monto,
      fechaISO: new Date().toISOString(),
      pendienteDeSync: true,
    }
    await repositorioDeudas.guardarAbono(abono)

    // No se deja el saldo negativo aunque el usuario abone de más (ej. pagó
    // el resto redondeando hacia arriba) — el abono en sí queda registrado
    // completo (nunca se recorta), solo el saldo visible no baja de 0.
    const deudaActualizada: Deuda = { ...deuda, saldoActual: Math.max(0, deuda.saldoActual - monto), pendienteDeSync: true }
    await repositorioDeudas.guardarDeuda(deudaActualizada)

    set({
      deudas: get().deudas.map((d) => (d.id === deudaId ? deudaActualizada : d)),
      abonos: [...get().abonos, abono],
    })
  },

  deudasActivas: () => get().deudas.filter((d) => d.saldoActual > 0),
}))
