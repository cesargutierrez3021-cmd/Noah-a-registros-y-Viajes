import type { AbonoDeuda, Deuda } from './types'

/**
 * Dos colas de sync independientes (mismo patrón que
 * RepositorioMantenimiento con items/registros): `Deuda` se actualiza en el
 * lugar (upsert), `AbonoDeuda` es append-only.
 */
export interface RepositorioDeudas {
  listarDeudas(): Promise<Deuda[]>
  guardarDeuda(deuda: Deuda): Promise<void>
  marcarDeudaSincronizada(id: string): Promise<void>
  deudasPendientesDeSync(): Promise<Deuda[]>

  listarAbonos(): Promise<AbonoDeuda[]>
  guardarAbono(abono: AbonoDeuda): Promise<void>
  marcarAbonoSincronizado(id: string): Promise<void>
  abonosPendientesDeSync(): Promise<AbonoDeuda[]>
}

class RepositorioDeudasLocal implements RepositorioDeudas {
  private claveDeudas = 'mia:deudas'
  private claveAbonos = 'mia:deudas:abonos'

  private leer<T>(clave: string): T[] {
    const crudo = localStorage.getItem(clave)
    return crudo ? (JSON.parse(crudo) as T[]) : []
  }

  private escribir<T>(clave: string, valores: T[]): void {
    localStorage.setItem(clave, JSON.stringify(valores))
  }

  async listarDeudas(): Promise<Deuda[]> {
    return this.leer<Deuda>(this.claveDeudas)
  }

  async guardarDeuda(deuda: Deuda): Promise<void> {
    const actuales = this.leer<Deuda>(this.claveDeudas)
    const indice = actuales.findIndex((d) => d.id === deuda.id)
    if (indice === -1) actuales.push(deuda)
    else actuales[indice] = deuda
    this.escribir(this.claveDeudas, actuales)
  }

  async marcarDeudaSincronizada(id: string): Promise<void> {
    const actuales = this.leer<Deuda>(this.claveDeudas)
    this.escribir(
      this.claveDeudas,
      actuales.map((d) => (d.id === id ? { ...d, pendienteDeSync: false } : d)),
    )
  }

  async deudasPendientesDeSync(): Promise<Deuda[]> {
    return this.leer<Deuda>(this.claveDeudas).filter((d) => d.pendienteDeSync)
  }

  async listarAbonos(): Promise<AbonoDeuda[]> {
    return this.leer<AbonoDeuda>(this.claveAbonos)
  }

  async guardarAbono(abono: AbonoDeuda): Promise<void> {
    const actuales = this.leer<AbonoDeuda>(this.claveAbonos)
    actuales.push(abono)
    this.escribir(this.claveAbonos, actuales)
  }

  async marcarAbonoSincronizado(id: string): Promise<void> {
    const actuales = this.leer<AbonoDeuda>(this.claveAbonos)
    this.escribir(
      this.claveAbonos,
      actuales.map((a) => (a.id === id ? { ...a, pendienteDeSync: false } : a)),
    )
  }

  async abonosPendientesDeSync(): Promise<AbonoDeuda[]> {
    return this.leer<AbonoDeuda>(this.claveAbonos).filter((a) => a.pendienteDeSync)
  }
}

export const repositorioDeudas: RepositorioDeudas = new RepositorioDeudasLocal()
