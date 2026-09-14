import { useEffect, useState } from 'react'
import { useViajes } from '../../domain/viajes/store'
import { useMantenimiento } from '../../domain/mantenimiento/store'
import { sincronizarRegistrosMantenimientoPendientes } from '../../domain/mantenimiento/sync'
import { calcularResumen } from '../../domain/estadisticas/calculos'
import { CATALOGO_MANTENIMIENTO } from '../../domain/mantenimiento/reglas'
import type { CriterioIntervalo } from '../../domain/mantenimiento/types'

export function SeccionMantenimiento() {
  const { viajes, cargar: cargarViajes } = useViajes()
  const { items, cargando, cargar, agregarDesdeCatalogo, agregarPersonalizado, eliminarItem, marcarRealizado, alertas } =
    useMantenimiento()

  const [mostrarCatalogo, setMostrarCatalogo] = useState(false)
  const [mostrarFormPersonalizado, setMostrarFormPersonalizado] = useState(false)
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [criterioNuevo, setCriterioNuevo] = useState<CriterioIntervalo>('km_o_dias')
  const [intervaloKmNuevo, setIntervaloKmNuevo] = useState('')
  const [intervaloDiasNuevo, setIntervaloDiasNuevo] = useState('')

  useEffect(() => {
    void cargarViajes()
    void cargar()
  }, [cargarViajes, cargar])

  const kmActual = calcularResumen(viajes).kmTotales
  const listaAlertas = alertas(kmActual)
  const nombresYaAgregados = new Set(items.map((i) => i.nombre))

  function claseParaEstado(vencido: boolean, proximo: boolean): string {
    if (vencido) return 'insignia insignia--vencido'
    if (proximo) return 'insignia insignia--proximo'
    return 'insignia insignia--ok'
  }

  function textoParaEstado(kmFaltantes: number | null, diasFaltantes: number | null): string {
    const partes: string[] = []
    if (kmFaltantes !== null) {
      partes.push(kmFaltantes <= 0 ? `${Math.abs(Math.round(kmFaltantes))} km pasado` : `${Math.round(kmFaltantes)} km`)
    }
    if (diasFaltantes !== null) {
      partes.push(diasFaltantes <= 0 ? `${Math.abs(diasFaltantes)} días pasado` : `${diasFaltantes} días`)
    }
    return partes.join(' · ') || '—'
  }

  async function manejarAgregarPersonalizado() {
    if (!nombreNuevo.trim()) return
    await agregarPersonalizado(
      {
        nombre: nombreNuevo.trim(),
        criterio: criterioNuevo,
        intervaloKm: criterioNuevo === 'dias' ? null : Number(intervaloKmNuevo) || null,
        intervaloDias: criterioNuevo === 'km' ? null : Number(intervaloDiasNuevo) || null,
      },
      kmActual,
    )
    setNombreNuevo('')
    setIntervaloKmNuevo('')
    setIntervaloDiasNuevo('')
    setMostrarFormPersonalizado(false)
  }

  return (
    <div id="seccion-mantenimiento">
      <h2 className="tt-titulo-seccion">Mantenimiento</h2>
      <p className="texto-mute" style={{ marginBottom: 12 }}>
        Km actual: <strong>{kmActual.toFixed(0)} km</strong>
      </p>

      {cargando ? (
        <p className="texto-mute">Cargando…</p>
      ) : listaAlertas.length === 0 ? (
        <p className="texto-mute">Todavía no tienes mantenimientos configurados.</p>
      ) : (
        <ul className="lista-viajes" style={{ marginBottom: 16 }}>
          {listaAlertas.map(({ item, kmFaltantes, diasFaltantes, vencido, proximoAVencer }) => (
            <li key={item.id} className="tarjeta-viaje" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{item.nombre}</span>
                <span className={claseParaEstado(vencido, proximoAVencer)}>{textoParaEstado(kmFaltantes, diasFaltantes)}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    void marcarRealizado(item.id, kmActual, null, null)
                    void sincronizarRegistrosMantenimientoPendientes()
                  }}
                >
                  Marcar realizado hoy
                </button>
                {item.origen === 'personalizado' && (
                  <button type="button" onClick={() => void eliminarItem(item.id)}>Eliminar</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="tarjeta-viaje" style={{ marginBottom: 12, flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
        <button type="button" onClick={() => setMostrarCatalogo((v) => !v)}>
          {mostrarCatalogo ? 'Ocultar catálogo' : 'Agregar del catálogo'}
        </button>
        {mostrarCatalogo && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CATALOGO_MANTENIMIENTO.filter((p) => !nombresYaAgregados.has(p.nombre)).map((plantilla) => (
              <button key={plantilla.nombre} type="button" onClick={() => void agregarDesdeCatalogo(plantilla, kmActual)}>
                {plantilla.nombre}
              </button>
            ))}
            {CATALOGO_MANTENIMIENTO.every((p) => nombresYaAgregados.has(p.nombre)) && (
              <p className="texto-mute">Ya agregaste todo el catálogo.</p>
            )}
          </div>
        )}
      </div>

      <div className="tarjeta-viaje" style={{ marginBottom: 24, flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
        <button type="button" onClick={() => setMostrarFormPersonalizado((v) => !v)}>
          {mostrarFormPersonalizado ? 'Cancelar' : 'Agregar mantenimiento personalizado'}
        </button>
        {mostrarFormPersonalizado && (
          <>
            <input placeholder="Nombre (ej. Correa de accesorios)" value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} />
            <select value={criterioNuevo} onChange={(e) => setCriterioNuevo(e.target.value as CriterioIntervalo)}>
              <option value="km_o_dias">Por km o por tiempo (lo que pase primero)</option>
              <option value="km">Solo por km</option>
              <option value="dias">Solo por tiempo</option>
            </select>
            {criterioNuevo !== 'dias' && (
              <input type="number" placeholder="Cada cuántos km" value={intervaloKmNuevo} onChange={(e) => setIntervaloKmNuevo(e.target.value)} />
            )}
            {criterioNuevo !== 'km' && (
              <input type="number" placeholder="Cada cuántos días" value={intervaloDiasNuevo} onChange={(e) => setIntervaloDiasNuevo(e.target.value)} />
            )}
            <button type="button" onClick={() => void manejarAgregarPersonalizado()}>Guardar</button>
          </>
        )}
      </div>
    </div>
  )
}
