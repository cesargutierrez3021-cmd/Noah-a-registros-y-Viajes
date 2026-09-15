import { useEffect, useState } from 'react'
import { useViajes } from '../../domain/viajes/store'
import { useMantenimiento } from '../../domain/mantenimiento/store'
import { sincronizarRegistrosMantenimientoPendientes } from '../../domain/mantenimiento/sync'
import { calcularResumen } from '../../domain/estadisticas/calculos'
import { CATALOGO_MANTENIMIENTO } from '../../domain/mantenimiento/reglas'
import { useTema } from '../../domain/tema/store'
import { useVehiculo } from '../../domain/vehiculo/store'
import { VEHICULOS_DISPONIBLES } from '../../domain/vehiculo/types'
import { TarjetaMantenimiento } from './TarjetaMantenimiento'
import { IMAGENES_MANTENIMIENTO } from './tarjetasMantenimiento'
import type { CriterioIntervalo, PlantillaItemMantenimiento } from '../../domain/mantenimiento/types'

/**
 * 2026-09-15, pedido explícito del usuario: "cuando entra al catálogo y yo
 * pongo, cambio de aceite y selecciono... me parezca la opción de a
 * cuántos kilómetros lo cambio o a cuánto tiempo" — antes tocar un ítem
 * del catálogo lo agregaba tal cual, con el km/días fijo de la plantilla,
 * sin poder ajustarlo. Ahora abre este paso intermedio: elegir criterio
 * (km / tiempo / los dos) y su(s) valor(es), pre-llenados con lo sugerido
 * del catálogo pero editables, antes de confirmar.
 */
export function SeccionMantenimiento() {
  const { viajes, cargar: cargarViajes } = useViajes()
  const { items, cargando, cargar, agregarDesdeCatalogo, agregarPersonalizado, eliminarItem, marcarRealizado, alertas } =
    useMantenimiento()
  const { tema } = useTema()
  const animado = tema !== 'papel'
  const { tipoVehiculo } = useVehiculo()
  const nombreVehiculo = VEHICULOS_DISPONIBLES.find((v) => v.valor === tipoVehiculo)?.nombre ?? tipoVehiculo

  const [mostrarCatalogo, setMostrarCatalogo] = useState(false)
  const [editandoPlantilla, setEditandoPlantilla] = useState<PlantillaItemMantenimiento | null>(null)
  const [criterioEdicion, setCriterioEdicion] = useState<CriterioIntervalo>('km_o_dias')
  const [kmEdicion, setKmEdicion] = useState('')
  const [diasEdicion, setDiasEdicion] = useState('')

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
  const catalogoDelVehiculo = CATALOGO_MANTENIMIENTO.filter((p) => p.vehiculo === tipoVehiculo)

  function abrirEdicionCatalogo(plantilla: PlantillaItemMantenimiento) {
    setEditandoPlantilla(plantilla)
    setCriterioEdicion(plantilla.criterio)
    setKmEdicion(plantilla.intervaloKm !== null ? String(plantilla.intervaloKm) : '')
    setDiasEdicion(plantilla.intervaloDias !== null ? String(plantilla.intervaloDias) : '')
  }

  async function confirmarAgregarDesdeCatalogo() {
    if (!editandoPlantilla) return
    await agregarDesdeCatalogo(
      editandoPlantilla,
      {
        criterio: criterioEdicion,
        intervaloKm: criterioEdicion === 'dias' ? null : Number(kmEdicion) || null,
        intervaloDias: criterioEdicion === 'km' ? null : Number(diasEdicion) || null,
      },
      kmActual,
    )
    setEditandoPlantilla(null)
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {listaAlertas.map((estado) => (
            <TarjetaMantenimiento
              key={estado.item.id}
              estado={estado}
              animado={animado}
              onMarcarRealizado={() => {
                void marcarRealizado(estado.item.id, kmActual, null, null)
                void sincronizarRegistrosMantenimientoPendientes()
              }}
              onEliminar={estado.item.origen === 'personalizado' ? () => void eliminarItem(estado.item.id) : undefined}
            />
          ))}
        </div>
      )}

      <div className="tarjeta-viaje" style={{ marginBottom: 12, flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
        <button type="button" onClick={() => setMostrarCatalogo((v) => !v)}>
          {mostrarCatalogo ? 'Ocultar catálogo' : 'Agregar del catálogo'}
        </button>
        {mostrarCatalogo && (
          <>
            <p className="texto-mute" style={{ fontSize: '0.78rem', margin: 0 }}>
              Catálogo de {nombreVehiculo}. ¿Manejas otro vehículo? Cambialo en Ajustes.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {catalogoDelVehiculo.filter((p) => !nombresYaAgregados.has(p.nombre)).map((plantilla) => (
                <button
                  key={plantilla.nombre}
                  type="button"
                  onClick={() => abrirEdicionCatalogo(plantilla)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {plantilla.imagen && (
                    <img src={IMAGENES_MANTENIMIENTO[plantilla.imagen]} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
                  )}
                  {plantilla.nombre}
                </button>
              ))}
              {catalogoDelVehiculo.every((p) => nombresYaAgregados.has(p.nombre)) && (
                <p className="texto-mute">Ya agregaste todo el catálogo.</p>
              )}
            </div>
          </>
        )}
      </div>

      {editandoPlantilla && (
        <div className="tarjeta-viaje" style={{ marginBottom: 12, flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
          <strong>{editandoPlantilla.nombre}</strong>
          <p className="texto-mute" style={{ fontSize: '0.8rem', margin: 0 }}>
            ¿A cuántos km lo cambiás, a cuánto tiempo, o los dos? Esto es solo una sugerencia — tu moto puede ser distinta.
          </p>
          <select value={criterioEdicion} onChange={(e) => setCriterioEdicion(e.target.value as CriterioIntervalo)}>
            <option value="km_o_dias">Por km o por tiempo (lo que pase primero)</option>
            <option value="km">Solo por km</option>
            <option value="dias">Solo por tiempo</option>
          </select>
          {criterioEdicion !== 'dias' && (
            <input type="number" placeholder="Cada cuántos km" value={kmEdicion} onChange={(e) => setKmEdicion(e.target.value)} />
          )}
          {criterioEdicion !== 'km' && (
            <input type="number" placeholder="Cada cuántos días" value={diasEdicion} onChange={(e) => setDiasEdicion(e.target.value)} />
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => void confirmarAgregarDesdeCatalogo()}>Agregar</button>
            <button type="button" onClick={() => setEditandoPlantilla(null)} style={{ background: 'transparent' }}>Cancelar</button>
          </div>
        </div>
      )}

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
