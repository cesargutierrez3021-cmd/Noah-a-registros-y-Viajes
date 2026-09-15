import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useViajes } from '../../domain/viajes/store'
import { useMantenimiento } from '../../domain/mantenimiento/store'
import { useDeudas } from '../../domain/deudas/store'
import { useHogar } from '../../domain/hogar/store'
import { calcularResumen } from '../../domain/estadisticas/calculos'
import { calcularAvisosMantenimiento, calcularAvisosDeudas, calcularAvisosHogar } from '../../domain/avisos/calculos'
import { notificarAvisosNuevos } from '../../domain/avisos/notificador'

/**
 * 2026-09-15, pedido explícito del usuario: "el recordatorio tiene que
 * aparecerme como un mensajito en la parte de arriba... en todas las
 * pantallas". Se renderiza una sola vez en App.tsx, afuera de <Routes>
 * (mismo lugar que <MiaBurbuja/>) — por eso se ve en cualquier panel.
 *
 * Carga los 3 dominios que le hacen falta (mismo criterio de orquestación
 * que BalanceScreen, D-10) y dispara notificaciones nativas reales para lo
 * nuevo (`notificarAvisosNuevos` — deduplicado, no repite en cada render).
 */
export function AvisoBanner() {
  const { viajes, cargar: cargarViajes } = useViajes()
  const { items: itemsMantenimiento, cargar: cargarMantenimiento, alertas } = useMantenimiento()
  const { deudas, cargar: cargarDeudas } = useDeudas()
  const { conceptos, cargar: cargarHogar } = useHogar()
  const [descartado, setDescartado] = useState<string | null>(null)

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
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsMantenimiento, kmActual, deudas, conceptos])

  useEffect(() => {
    void notificarAvisosNuevos(avisos)
  }, [avisos])

  if (avisos.length === 0) return null

  // El más urgente primero (vencido antes que próximo), y no se vuelve a mostrar el mismo una vez descartado en esta sesión.
  const ordenados = [...avisos].sort((a, b) => (a.severidad === b.severidad ? 0 : a.severidad === 'vencido' ? -1 : 1))
  const principal = ordenados.find((a) => a.id !== descartado)
  if (!principal) return null

  return (
    <Link
      to="/avisos"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: '8px 14px',
        paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))',
        // Deja libre la esquina donde flotan los botones ⚙/🔔 de App.tsx (fixed, encima de todo) — así el texto no queda tapado.
        paddingRight: 96,
        background: principal.severidad === 'vencido' ? 'var(--color-error-insignia, #f04646)' : 'var(--color-advertencia-insignia, #f0b428)',
        color: '#141310',
        fontSize: '0.82rem',
        textDecoration: 'none',
        position: 'relative',
        zIndex: 30,
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {principal.severidad === 'vencido' ? '⚠ ' : '🔔 '}
        {principal.titulo} — {principal.detalle}
        {avisos.length > 1 ? ` (+${avisos.length - 1} más)` : ''}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDescartado(principal.id)
        }}
        style={{ background: 'transparent', border: 'none', color: '#141310', fontWeight: 700, flex: 'none' }}
      >
        ✕
      </button>
    </Link>
  )
}
