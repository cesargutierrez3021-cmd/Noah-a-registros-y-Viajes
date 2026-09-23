import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useViajes } from '../../domain/viajes/store'
import { useMantenimiento } from '../../domain/mantenimiento/store'
import { useDeudas } from '../../domain/deudas/store'
import { useHogar } from '../../domain/hogar/store'
import { calcularResumen } from '../../domain/estadisticas/calculos'
import { calcularAvisosMantenimiento, calcularAvisosDeudas, calcularAvisosHogar } from '../../domain/avisos/calculos'
import type { Aviso } from '../../domain/avisos/types'

const ETIQUETA_TIPO: Record<Aviso['tipo'], string> = {
  mantenimiento: 'Mantenimiento',
  deuda: 'Deuda',
  hogar: 'Gasto fijo de casa',
}

/** Pantalla completa de avisos — a donde lleva tocar el banner o el botón 🔔 de App.tsx. Ver AvisoBanner.tsx para el "mensajito" que se ve en todas las pantallas. */
export function AvisosScreen() {
  const { viajes, cargar: cargarViajes } = useViajes()
  const { items: itemsMantenimiento, cargar: cargarMantenimiento, alertas } = useMantenimiento()
  const { deudas, cargar: cargarDeudas } = useDeudas()
  const { conceptos, cargar: cargarHogar } = useHogar()

  useEffect(() => {
    void cargarViajes()
    void cargarMantenimiento()
    void cargarDeudas()
    void cargarHogar()
  }, [cargarViajes, cargarMantenimiento, cargarDeudas, cargarHogar])

  const kmActual = calcularResumen(viajes).kmTotales
  const avisos = useMemo(() => {
    return [
      ...calcularAvisosMantenimiento(alertas(kmActual)),
      ...calcularAvisosDeudas(deudas),
      ...calcularAvisosHogar(conceptos),
    ].sort((a, b) => (a.severidad === b.severidad ? 0 : a.severidad === 'vencido' ? -1 : 1))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsMantenimiento, kmActual, deudas, conceptos])

  return (
    <div className="pantalla">
      <h1 className="titulo-pantalla">Avisos</h1>
      <p className="texto-mute" style={{ marginBottom: 16 }}>
        Mantenimientos, deudas y gastos fijos de casa que están vencidos o por vencerse.
      </p>

      {avisos.length === 0 ? (
        <p className="texto-mute">Todo al día — no hay nada vencido ni por vencer.</p>
      ) : (
        <ul className="lista-viajes" style={{ marginBottom: 16 }}>
          {avisos.map((a) => (
            <li key={a.id} className="tarjeta-viaje" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{a.titulo}</span>
                <span className={`insignia ${a.severidad === 'vencido' ? 'insignia--vencido' : 'insignia--proximo'}`}>
                  {a.severidad === 'vencido' ? 'Vencido' : 'Próximo'}
                </span>
              </div>
              <span className="texto-mute">{ETIQUETA_TIPO[a.tipo]} · {a.detalle}</span>
            </li>
          ))}
        </ul>
      )}

      <Link to="/" style={{ display: 'inline-block', marginTop: 8 }}>
        ← Volver
      </Link>
    </div>
  )
}
