import { useEffect, useState } from 'react'
import { useViajes } from '../../domain/viajes/store'
import { useJornada } from '../../domain/jornada/store'
import { sincronizarViajesPendientes } from '../../domain/viajes/sync'
import { sincronizarJornadasPendientes } from '../../domain/jornada/sync'
import { PLATAFORMAS_DISPONIBLES } from '../../domain/viajes/types'
import type { Plataforma } from '../../domain/viajes/types'

/**
 * 2026-09-15, pedido explícito del usuario: "cuando los viajes están
 * pendientes tiene que aparecer ahí abajito de estado del sistema... me toca
 * buscar hacia abajo, hacia abajo para buscarlos, no debería" — este bloque
 * vivía adentro de SeccionViajesYJornada.tsx (bien abajo, después de la
 * tarjeta de pulso completa); se sacó a su propio componente para que
 * SeccionPulso.tsx lo pueda renderizar justo debajo de "Estado del sistema",
 * sin duplicar el store/la lógica (D-18) — sigue siendo el mismo
 * `useViajes().completarIngreso`, ahora con la plataforma editable también
 * (ver el comentario de `completarIngreso` en domain/viajes/store.ts).
 */
export function TarjetaViajesPendientes() {
  const { viajes, cargar, completarIngreso } = useViajes()
  const { agregarViajeAJornadaAbierta } = useJornada()

  const [ingresosPendientes, setIngresosPendientes] = useState<Record<string, string>>({})
  const [plataformasPendientes, setPlataformasPendientes] = useState<Record<string, Plataforma>>({})
  const [kmPendientes, setKmPendientes] = useState<Record<string, string>>({})

  useEffect(() => {
    void cargar()
  }, [cargar])

  const viajesPendientesIngreso = viajes.filter((v) => v.ingresoPendiente)

  async function manejarCompletarIngreso(viajeId: string, plataformaOriginal: Plataforma) {
    const monto = Number(ingresosPendientes[viajeId]) || 0
    const plataforma = plataformasPendientes[viajeId] ?? plataformaOriginal
    const kmTexto = kmPendientes[viajeId]?.trim()
    const kmManual = kmTexto ? Number(kmTexto) : null
    await completarIngreso(viajeId, monto, plataforma, kmManual)
    await agregarViajeAJornadaAbierta(viajeId)
    setIngresosPendientes((prev) => {
      const siguiente = { ...prev }
      delete siguiente[viajeId]
      return siguiente
    })
    setKmPendientes((prev) => {
      const siguiente = { ...prev }
      delete siguiente[viajeId]
      return siguiente
    })
    // 2026-09-22, corrección de un bug real encontrado en auditoría: esto limpiaba el monto y
    // el km editados, pero no la plataforma editada — quedaba guardada en memoria sin usarse.
    setPlataformasPendientes((prev) => {
      const siguiente = { ...prev }
      delete siguiente[viajeId]
      return siguiente
    })
    void sincronizarViajesPendientes()
    void sincronizarJornadasPendientes()
  }

  if (viajesPendientesIngreso.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
      {viajesPendientesIngreso.length > 1 && (
        <p className="texto-mute">
          Tienes {viajesPendientesIngreso.length} viajes terminados desde la burbuja esperando el ingreso — complétalos uno por uno.
        </p>
      )}
      {viajesPendientesIngreso.map((v) => (
        <div key={v.id} className="tarjeta-viaje" style={{ flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
          <p className="texto-mute">
            Terminaste este viaje desde la burbuja flotante — {v.distancia.kmTotalesReales.toFixed(1)} km. Solo falta el ingreso para guardarlo.
          </p>
          <label className="texto-mute">
            Plataforma
            <select
              value={plataformasPendientes[v.id] ?? v.plataforma}
              onChange={(e) => setPlataformasPendientes((prev) => ({ ...prev, [v.id]: e.target.value as Plataforma }))}
              style={{ display: 'block', width: '100%' }}
            >
              {PLATAFORMAS_DISPONIBLES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <input
            type="number"
            placeholder="Ingreso del viaje"
            value={ingresosPendientes[v.id] ?? ''}
            onChange={(e) => setIngresosPendientes((prev) => ({ ...prev, [v.id]: e.target.value }))}
          />
          <label className="texto-mute">
            Km (opcional, corrige si el GPS midió mal)
            <input
              type="number"
              step="0.1"
              placeholder={`${v.distancia.kmTotalesReales.toFixed(1)} km medidos por GPS`}
              value={kmPendientes[v.id] ?? ''}
              onChange={(e) => setKmPendientes((prev) => ({ ...prev, [v.id]: e.target.value }))}
              style={{ display: 'block', width: '100%' }}
            />
          </label>
          <button type="button" onClick={() => void manejarCompletarIngreso(v.id, v.plataforma)}>Guardar viaje</button>
        </div>
      ))}
    </div>
  )
}
