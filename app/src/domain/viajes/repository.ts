import type { Viaje, CierreViajeInput } from './types'
import { calcularDistanciaReal } from './distancia'
import { obtenerZona } from './geofencing'

/**
 * Repositorio de viajes. Esta es la ÚNICA puerta de entrada/salida para leer o
 * guardar viajes. Las pantallas nunca acceden a localStorage/API directamente,
 * siempre pasan por aquí — así, cuando exista el backend real (Fase 7/13),
 * solo se cambia la implementación de estas cuatro funciones, nada más.
 */
export interface RepositorioViajes {
  listar(): Promise<Viaje[]>
  guardar(viaje: Viaje): Promise<void>
  marcarSincronizado(id: string): Promise<void>
  pendientesDeSync(): Promise<Viaje[]>
}

/**
 * Implementación local (offline). Hoy usa localStorage como marcador de posición
 * simple; en Fase 4 se reemplaza por una base local real (ej. SQLite vía Capacitor)
 * sin tocar el resto del código, porque todo pasa por esta interfaz.
 */
class RepositorioViajesLocal implements RepositorioViajes {
  private clave = 'mia:viajes'

  private leerTodos(): Viaje[] {
    const crudo = localStorage.getItem(this.clave)
    return crudo ? (JSON.parse(crudo) as Viaje[]) : []
  }

  private escribirTodos(viajes: Viaje[]): void {
    localStorage.setItem(this.clave, JSON.stringify(viajes))
  }

  async listar(): Promise<Viaje[]> {
    return this.leerTodos()
  }

  async guardar(viaje: Viaje): Promise<void> {
    const actuales = this.leerTodos()
    const indice = actuales.findIndex((v) => v.id === viaje.id)
    if (indice === -1) {
      actuales.push(viaje)
    } else {
      actuales[indice] = viaje
    }
    this.escribirTodos(actuales)
  }

  async marcarSincronizado(id: string): Promise<void> {
    const actuales = this.leerTodos()
    const actualizados = actuales.map((v) => (v.id === id ? { ...v, pendienteDeSync: false } : v))
    this.escribirTodos(actualizados)
  }

  async pendientesDeSync(): Promise<Viaje[]> {
    return this.leerTodos().filter((v) => v.pendienteDeSync)
  }
}

export const repositorioViajes: RepositorioViajes = new RepositorioViajesLocal()

/**
 * Construye un Viaje completo a partir de lo que entrega el plugin nativo de GPS,
 * calculando la distancia real en un único lugar (ver distancia.ts).
 */
export function crearViajeDesdeCiere(id: string, input: CierreViajeInput): Viaje {
  // Fase 5 (D-7, resuelto): se resuelve contra el último punto del recorrido
  // (dónde terminó el viaje), no el primero — es el dato más útil para
  // estadísticas de "en qué zona estoy dejando más ingresos". Las 20
  // localidades de Bogotá ya están cargadas en zonasBogota.ts.
  //
  // localidad y zona reciben el mismo valor por ahora: el motor de
  // geofencing todavía no distingue "localidad" (ciudad/barrio) de "zona"
  // (agrupación más amplia, ej. para tarifas) como dos capas separadas.
  // Si esa distinción se vuelve necesaria, se resuelve con un segundo array
  // de polígonos en geofencing.ts en vez de tocar esto de nuevo.
  const puntoDeReferencia = input.recorrido[input.recorrido.length - 1] ?? null
  const zonaDetectada = puntoDeReferencia ? obtenerZona(puntoDeReferencia) : null

  return {
    id,
    plataforma: input.plataforma,
    estado: 'finalizado',
    inicioISO: input.inicioISO,
    finISO: input.finISO,
    recorrido: input.recorrido,
    distancia: calcularDistanciaReal(input),
    distanciaReportadaPlataforma: input.distanciaReportadaPlataforma,
    ingreso: input.ingreso,
    localidad: zonaDetectada,
    zona: zonaDetectada,
    pendienteDeSync: true,
  }
}
