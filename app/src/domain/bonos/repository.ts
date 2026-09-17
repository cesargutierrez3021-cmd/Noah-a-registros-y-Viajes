import type { Bono } from './types'

/** Único punto de entrada/salida para leer o guardar bonos — mismo patrón que RepositorioGastos (D-8). Append-only. */
export interface RepositorioBonos {
  listar(): Promise<Bono[]>
  guardar(bono: Bono): Promise<void>
  marcarSincronizado(id: string): Promise<void>
  pendientesDeSync(): Promise<Bono[]>
}

class RepositorioBonosLocal implements RepositorioBonos {
  private clave = 'mia:bonos'

  private leer(): Bono[] {
    const crudo = localStorage.getItem(this.clave)
    return crudo ? (JSON.parse(crudo) as Bono[]) : []
  }

  private escribir(valores: Bono[]): void {
    localStorage.setItem(this.clave, JSON.stringify(valores))
  }

  async listar(): Promise<Bono[]> {
    return this.leer()
  }

  async guardar(bono: Bono): Promise<void> {
    const actuales = this.leer()
    actuales.push(bono)
    this.escribir(actuales)
  }

  async marcarSincronizado(id: string): Promise<void> {
    const actuales = this.leer()
    this.escribir(actuales.map((b) => (b.id === id ? { ...b, pendienteDeSync: false } : b)))
  }

  async pendientesDeSync(): Promise<Bono[]> {
    return this.leer().filter((b) => b.pendienteDeSync)
  }
}

export const repositorioBonos: RepositorioBonos = new RepositorioBonosLocal()
