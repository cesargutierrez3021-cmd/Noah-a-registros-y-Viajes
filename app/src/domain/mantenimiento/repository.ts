import type { ItemMantenimiento, RegistroMantenimiento } from './types'

/**
 * Única puerta de entrada/salida para leer o guardar mantenimiento.
 * Mismo patrón que RepositorioViajes: cuando exista el backend real (Fase 13,
 * sync), solo cambia la implementación de estas funciones.
 */
export interface RepositorioMantenimiento {
  listarItems(): Promise<ItemMantenimiento[]>
  guardarItem(item: ItemMantenimiento): Promise<void>
  eliminarItem(id: string): Promise<void>
  listarRegistros(): Promise<RegistroMantenimiento[]>
  guardarRegistro(registro: RegistroMantenimiento): Promise<void>
  /** Fase 13 (continuación): solo aplica a registros — los ítems no se sincronizan, ver types.ts. */
  marcarRegistroSincronizado(id: string): Promise<void>
  registrosPendientesDeSync(): Promise<RegistroMantenimiento[]>
}

class RepositorioMantenimientoLocal implements RepositorioMantenimiento {
  private claveItems = 'mia:mantenimiento:items'
  private claveRegistros = 'mia:mantenimiento:registros'

  private leer<T>(clave: string): T[] {
    const crudo = localStorage.getItem(clave)
    return crudo ? (JSON.parse(crudo) as T[]) : []
  }

  private escribir<T>(clave: string, valores: T[]): void {
    localStorage.setItem(clave, JSON.stringify(valores))
  }

  async listarItems(): Promise<ItemMantenimiento[]> {
    return this.leer<ItemMantenimiento>(this.claveItems)
  }

  async guardarItem(item: ItemMantenimiento): Promise<void> {
    const actuales = this.leer<ItemMantenimiento>(this.claveItems)
    const indice = actuales.findIndex((i) => i.id === item.id)
    if (indice === -1) actuales.push(item)
    else actuales[indice] = item
    this.escribir(this.claveItems, actuales)
  }

  async eliminarItem(id: string): Promise<void> {
    const actuales = this.leer<ItemMantenimiento>(this.claveItems)
    this.escribir(
      this.claveItems,
      actuales.filter((i) => i.id !== id),
    )
  }

  async listarRegistros(): Promise<RegistroMantenimiento[]> {
    return this.leer<RegistroMantenimiento>(this.claveRegistros)
  }

  async guardarRegistro(registro: RegistroMantenimiento): Promise<void> {
    const actuales = this.leer<RegistroMantenimiento>(this.claveRegistros)
    actuales.push(registro)
    this.escribir(this.claveRegistros, actuales)
  }

  async marcarRegistroSincronizado(id: string): Promise<void> {
    const actuales = this.leer<RegistroMantenimiento>(this.claveRegistros)
    const actualizados = actuales.map((r) => (r.id === id ? { ...r, pendienteDeSync: false } : r))
    this.escribir(this.claveRegistros, actualizados)
  }

  async registrosPendientesDeSync(): Promise<RegistroMantenimiento[]> {
    return this.leer<RegistroMantenimiento>(this.claveRegistros).filter((r) => r.pendienteDeSync)
  }
}

export const repositorioMantenimiento: RepositorioMantenimiento = new RepositorioMantenimientoLocal()
