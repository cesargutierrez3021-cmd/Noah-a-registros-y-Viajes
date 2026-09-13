import type { Jornada } from './types'

/**
 * Fase 13 (continuación): jornada no tenía repository.ts — la persistencia
 * vivía directo en store.ts, única excepción al patrón de D-8. Se extrae acá
 * ahora porque sincronizar necesita `pendientesDeSync`/`marcarSincronizado`,
 * y meter eso dentro del store hubiera mezclado "estado de UI" con "cola de
 * sync", que es justo la separación que este patrón evita en los demás
 * dominios.
 */
export interface RepositorioJornadas {
  listar(): Promise<Jornada[]>
  guardar(jornada: Jornada): Promise<void>
  marcarSincronizado(id: string): Promise<void>
  pendientesDeSync(): Promise<Jornada[]>
}

class RepositorioJornadasLocal implements RepositorioJornadas {
  private clave = 'mia:jornadas'

  private leerTodas(): Jornada[] {
    const crudo = localStorage.getItem(this.clave)
    return crudo ? (JSON.parse(crudo) as Jornada[]) : []
  }

  private escribirTodas(jornadas: Jornada[]): void {
    localStorage.setItem(this.clave, JSON.stringify(jornadas))
  }

  async listar(): Promise<Jornada[]> {
    return this.leerTodas()
  }

  async guardar(jornada: Jornada): Promise<void> {
    const actuales = this.leerTodas()
    const indice = actuales.findIndex((j) => j.id === jornada.id)
    if (indice === -1) actuales.push(jornada)
    else actuales[indice] = jornada
    this.escribirTodas(actuales)
  }

  async marcarSincronizado(id: string): Promise<void> {
    const actuales = this.leerTodas()
    const actualizadas = actuales.map((j) => (j.id === id ? { ...j, pendienteDeSync: false } : j))
    this.escribirTodas(actualizadas)
  }

  async pendientesDeSync(): Promise<Jornada[]> {
    return this.leerTodas().filter((j) => j.pendienteDeSync)
  }
}

export const repositorioJornadas: RepositorioJornadas = new RepositorioJornadasLocal()
