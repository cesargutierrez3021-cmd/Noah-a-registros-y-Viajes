import type { ConceptoFijo, GastoHogar } from './types'

/** Dos colas de sync independientes, mismo patrón que RepositorioDeudas (deudas/repository.ts): ConceptoFijo se actualiza en el lugar (upsert), GastoHogar es append-only. */
export interface RepositorioHogar {
  listarConceptos(): Promise<ConceptoFijo[]>
  guardarConcepto(concepto: ConceptoFijo): Promise<void>
  marcarConceptoSincronizado(id: string): Promise<void>
  conceptosPendientesDeSync(): Promise<ConceptoFijo[]>

  listarGastos(): Promise<GastoHogar[]>
  guardarGasto(gasto: GastoHogar): Promise<void>
  marcarGastoSincronizado(id: string): Promise<void>
  gastosPendientesDeSync(): Promise<GastoHogar[]>
}

class RepositorioHogarLocal implements RepositorioHogar {
  private claveConceptos = 'mia:hogar:conceptos'
  private claveGastos = 'mia:hogar:gastos'

  private leer<T>(clave: string): T[] {
    const crudo = localStorage.getItem(clave)
    return crudo ? (JSON.parse(crudo) as T[]) : []
  }

  private escribir<T>(clave: string, valores: T[]): void {
    localStorage.setItem(clave, JSON.stringify(valores))
  }

  async listarConceptos(): Promise<ConceptoFijo[]> {
    return this.leer<ConceptoFijo>(this.claveConceptos)
  }

  async guardarConcepto(concepto: ConceptoFijo): Promise<void> {
    const actuales = this.leer<ConceptoFijo>(this.claveConceptos)
    const indice = actuales.findIndex((c) => c.id === concepto.id)
    if (indice === -1) actuales.push(concepto)
    else actuales[indice] = concepto
    this.escribir(this.claveConceptos, actuales)
  }

  async marcarConceptoSincronizado(id: string): Promise<void> {
    const actuales = this.leer<ConceptoFijo>(this.claveConceptos)
    this.escribir(
      this.claveConceptos,
      actuales.map((c) => (c.id === id ? { ...c, pendienteDeSync: false } : c)),
    )
  }

  async conceptosPendientesDeSync(): Promise<ConceptoFijo[]> {
    return this.leer<ConceptoFijo>(this.claveConceptos).filter((c) => c.pendienteDeSync)
  }

  async listarGastos(): Promise<GastoHogar[]> {
    return this.leer<GastoHogar>(this.claveGastos)
  }

  async guardarGasto(gasto: GastoHogar): Promise<void> {
    const actuales = this.leer<GastoHogar>(this.claveGastos)
    actuales.push(gasto)
    this.escribir(this.claveGastos, actuales)
  }

  async marcarGastoSincronizado(id: string): Promise<void> {
    const actuales = this.leer<GastoHogar>(this.claveGastos)
    this.escribir(
      this.claveGastos,
      actuales.map((g) => (g.id === id ? { ...g, pendienteDeSync: false } : g)),
    )
  }

  async gastosPendientesDeSync(): Promise<GastoHogar[]> {
    return this.leer<GastoHogar>(this.claveGastos).filter((g) => g.pendienteDeSync)
  }
}

export const repositorioHogar: RepositorioHogar = new RepositorioHogarLocal()
