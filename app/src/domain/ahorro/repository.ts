import type { AbonoAhorro, MetaAhorro } from './types'

/** Mismo patrón exacto que RepositorioDeudas: dos colas de sync independientes. */
export interface RepositorioAhorro {
  listarMetas(): Promise<MetaAhorro[]>
  guardarMeta(meta: MetaAhorro): Promise<void>
  marcarMetaSincronizada(id: string): Promise<void>
  metasPendientesDeSync(): Promise<MetaAhorro[]>

  listarAbonos(): Promise<AbonoAhorro[]>
  guardarAbono(abono: AbonoAhorro): Promise<void>
  marcarAbonoSincronizado(id: string): Promise<void>
  abonosPendientesDeSync(): Promise<AbonoAhorro[]>
}

class RepositorioAhorroLocal implements RepositorioAhorro {
  private claveMetas = 'mia:ahorro'
  private claveAbonos = 'mia:ahorro:abonos'

  private leer<T>(clave: string): T[] {
    const crudo = localStorage.getItem(clave)
    return crudo ? (JSON.parse(crudo) as T[]) : []
  }

  private escribir<T>(clave: string, valores: T[]): void {
    localStorage.setItem(clave, JSON.stringify(valores))
  }

  async listarMetas(): Promise<MetaAhorro[]> {
    return this.leer<MetaAhorro>(this.claveMetas)
  }

  async guardarMeta(meta: MetaAhorro): Promise<void> {
    const actuales = this.leer<MetaAhorro>(this.claveMetas)
    const indice = actuales.findIndex((m) => m.id === meta.id)
    if (indice === -1) actuales.push(meta)
    else actuales[indice] = meta
    this.escribir(this.claveMetas, actuales)
  }

  async marcarMetaSincronizada(id: string): Promise<void> {
    const actuales = this.leer<MetaAhorro>(this.claveMetas)
    this.escribir(
      this.claveMetas,
      actuales.map((m) => (m.id === id ? { ...m, pendienteDeSync: false } : m)),
    )
  }

  async metasPendientesDeSync(): Promise<MetaAhorro[]> {
    return this.leer<MetaAhorro>(this.claveMetas).filter((m) => m.pendienteDeSync)
  }

  async listarAbonos(): Promise<AbonoAhorro[]> {
    return this.leer<AbonoAhorro>(this.claveAbonos)
  }

  async guardarAbono(abono: AbonoAhorro): Promise<void> {
    const actuales = this.leer<AbonoAhorro>(this.claveAbonos)
    actuales.push(abono)
    this.escribir(this.claveAbonos, actuales)
  }

  async marcarAbonoSincronizado(id: string): Promise<void> {
    const actuales = this.leer<AbonoAhorro>(this.claveAbonos)
    this.escribir(
      this.claveAbonos,
      actuales.map((a) => (a.id === id ? { ...a, pendienteDeSync: false } : a)),
    )
  }

  async abonosPendientesDeSync(): Promise<AbonoAhorro[]> {
    return this.leer<AbonoAhorro>(this.claveAbonos).filter((a) => a.pendienteDeSync)
  }
}

export const repositorioAhorro: RepositorioAhorro = new RepositorioAhorroLocal()
