import type { Gasto } from './types'

/**
 * Único punto de entrada/salida para leer o guardar gastos — mismo patrón
 * que RepositorioMantenimiento (D-8). Append-only a propósito (ver types.ts
 * sobre por qué no hay editar/eliminar): por eso no hace falta un método
 * "actualizar", solo agregar y listar.
 */
export interface RepositorioGastos {
  listar(): Promise<Gasto[]>
  guardar(gasto: Gasto): Promise<void>
  marcarSincronizado(id: string): Promise<void>
  pendientesDeSync(): Promise<Gasto[]>
}

class RepositorioGastosLocal implements RepositorioGastos {
  private clave = 'mia:gastos'

  private leer(): Gasto[] {
    const crudo = localStorage.getItem(this.clave)
    return crudo ? (JSON.parse(crudo) as Gasto[]) : []
  }

  private escribir(valores: Gasto[]): void {
    localStorage.setItem(this.clave, JSON.stringify(valores))
  }

  async listar(): Promise<Gasto[]> {
    return this.leer()
  }

  async guardar(gasto: Gasto): Promise<void> {
    const actuales = this.leer()
    actuales.push(gasto)
    this.escribir(actuales)
  }

  async marcarSincronizado(id: string): Promise<void> {
    const actuales = this.leer()
    this.escribir(actuales.map((g) => (g.id === id ? { ...g, pendienteDeSync: false } : g)))
  }

  async pendientesDeSync(): Promise<Gasto[]> {
    return this.leer().filter((g) => g.pendienteDeSync)
  }
}

export const repositorioGastos: RepositorioGastos = new RepositorioGastosLocal()
