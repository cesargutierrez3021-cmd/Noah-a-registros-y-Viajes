import { useEffect } from 'react'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { ViajesScreen } from './features/viajes/ViajesScreen'
import { MantenimientoScreen } from './features/mantenimiento/MantenimientoScreen'
import { EstadisticasScreen } from './features/estadisticas/EstadisticasScreen'
import { ConversacionScreen } from './features/conversacion/ConversacionScreen'
import { CuentaScreen } from './features/auth/CuentaScreen'
import { PlanesScreen } from './features/planes/PlanesScreen'
import { sincronizarViajesPendientes } from './domain/viajes/sync'
import { sincronizarJornadasPendientes } from './domain/jornada/sync'
import { sincronizarRegistrosMantenimientoPendientes } from './domain/mantenimiento/sync'
import { registrarSincronizacionAutomatica } from './lib/autoSync'

/**
 * Raíz de la app. Fase 6 agrega navegación real (react-router-dom, ya estaba
 * en package.json sin usar). HashRouter porque es una app empaquetada en
 * Capacitor (file://), no un sitio con rutas de servidor.
 *
 * Fase 7/10: se agrega /cuenta (login/registro) — es la única pantalla que
 * habla con el backend hoy, junto con /conversacion que la necesita.
 * Fase 11: se agrega /planes (solo lectura — ver PlanesScreen.tsx sobre por
 * qué no hay botón de compra todavía).
 * Fase 13: al abrir la app, registra la sincronización automática de viajes,
 * jornadas y registros de mantenimiento pendientes (`lib/autoSync.ts`) — no
 * es una sola pasada como antes: reintenta con backoff si algo falla y
 * vuelve a intentar apenas el dispositivo recupera internet (evento
 * `online`). Sigue siendo best-effort — si no hay sesión, no hace nada ni
 * molesta al usuario. No bloquea el render: la app se ve y se usa igual
 * haya o no conexión.
 */
export function App() {
  useEffect(() => {
    registrarSincronizacionAutomatica('viajes', sincronizarViajesPendientes)
    registrarSincronizacionAutomatica('jornadas', sincronizarJornadasPendientes)
    registrarSincronizacionAutomatica('mantenimiento', sincronizarRegistrosMantenimientoPendientes)
  }, [])

  return (
    <HashRouter>
      <div style={{ paddingBottom: 64 }}>
        <Routes>
          <Route path="/" element={<ViajesScreen />} />
          <Route path="/mantenimiento" element={<MantenimientoScreen />} />
          <Route path="/estadisticas" element={<EstadisticasScreen />} />
          <Route path="/conversacion" element={<ConversacionScreen />} />
          <Route path="/cuenta" element={<CuentaScreen />} />
          <Route path="/planes" element={<PlanesScreen />} />
        </Routes>
      </div>
      <nav className="barra-navegacion">
        <NavLink to="/" end className={({ isActive }) => `barra-navegacion__item${isActive ? ' barra-navegacion__item--activo' : ''}`}>
          Viajes
        </NavLink>
        <NavLink to="/mantenimiento" className={({ isActive }) => `barra-navegacion__item${isActive ? ' barra-navegacion__item--activo' : ''}`}>
          Mantenimiento
        </NavLink>
        <NavLink to="/estadisticas" className={({ isActive }) => `barra-navegacion__item${isActive ? ' barra-navegacion__item--activo' : ''}`}>
          Estadísticas
        </NavLink>
        <NavLink to="/conversacion" className={({ isActive }) => `barra-navegacion__item${isActive ? ' barra-navegacion__item--activo' : ''}`}>
          MIA
        </NavLink>
        <NavLink to="/cuenta" className={({ isActive }) => `barra-navegacion__item${isActive ? ' barra-navegacion__item--activo' : ''}`}>
          Cuenta
        </NavLink>
        <NavLink to="/planes" className={({ isActive }) => `barra-navegacion__item${isActive ? ' barra-navegacion__item--activo' : ''}`}>
          Planes
        </NavLink>
      </nav>
    </HashRouter>
  )
}
