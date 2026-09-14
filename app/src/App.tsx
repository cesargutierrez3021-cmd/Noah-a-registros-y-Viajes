import { useEffect } from 'react'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { TrabajoScreen } from './features/trabajo/TrabajoScreen'
import { AgregarViajeManualScreen } from './features/viajes/AgregarViajeManualScreen'
import { CasaYDeudasScreen } from './features/casaYDeudas/CasaYDeudasScreen'
import { BalanceScreen } from './features/balance/BalanceScreen'
import { MiaBurbuja } from './features/mia/MiaBurbuja'
import { CuentaScreen } from './features/auth/CuentaScreen'
import { PlanesScreen } from './features/planes/PlanesScreen'
import { sincronizarViajesPendientes } from './domain/viajes/sync'
import { sincronizarJornadasPendientes } from './domain/jornada/sync'
import { sincronizarRegistrosMantenimientoPendientes } from './domain/mantenimiento/sync'
import { sincronizarGastosPendientes } from './domain/gastos/sync'
import { sincronizarDeudasPendientes } from './domain/deudas/sync'
import { sincronizarHogarPendiente } from './domain/hogar/sync'
import { registrarSincronizacionAutomatica } from './lib/autoSync'

/**
 * Raíz de la app.
 *
 * Bloque 4, ítem 11/12 (parte NO visual — el tema/vestido sigue pendiente,
 * ver PLAN-MAESTRO): la barra de navegación pasa de 9 rutas a 4 paneles
 * reales, siguiendo el pedido explícito del usuario ("toda la zona de
 * trabajo de Uber en un solo panel, no en seis o siete"):
 *   - "/"                → Panel Trabajo (Viajes+Jornada+Mantenimiento+Gastos+Estadísticas fusionados)
 *   - "/casa-y-deudas"    → Panel Casa y Deudas (Deudas+Hogar, con sub-tabs)
 *   - "/balance"          → Panel Balance (cruza los dos anteriores, ya existía así)
 *   - "/cuenta", "/planes"→ utilidades aparte, no son "zona de trabajo"
 * MIA deja de ser una ruta/pestaña — ahora es <MiaBurbuja/>, una burbuja
 * flotante renderizada acá afuera de <Routes>, visible en cualquier panel.
 * Ningún store se tocó: todo esto es solo reacomodar features/ y App.tsx.
 */
export function App() {
  useEffect(() => {
    registrarSincronizacionAutomatica('viajes', sincronizarViajesPendientes)
    registrarSincronizacionAutomatica('jornadas', sincronizarJornadasPendientes)
    registrarSincronizacionAutomatica('mantenimiento', sincronizarRegistrosMantenimientoPendientes)
    registrarSincronizacionAutomatica('gastos', sincronizarGastosPendientes)
    registrarSincronizacionAutomatica('deudas', sincronizarDeudasPendientes)
    registrarSincronizacionAutomatica('hogar', sincronizarHogarPendiente)
  }, [])

  return (
    <HashRouter>
      <div style={{ paddingBottom: 64 }}>
        <Routes>
          <Route path="/" element={<TrabajoScreen />} />
          <Route path="/viajes/manual" element={<AgregarViajeManualScreen />} />
          <Route path="/casa-y-deudas" element={<CasaYDeudasScreen />} />
          <Route path="/balance" element={<BalanceScreen />} />
          <Route path="/cuenta" element={<CuentaScreen />} />
          <Route path="/planes" element={<PlanesScreen />} />
        </Routes>
      </div>

      <MiaBurbuja />

      <nav className="barra-navegacion">
        <NavLink to="/" end className={({ isActive }) => `barra-navegacion__item${isActive ? ' barra-navegacion__item--activo' : ''}`}>
          Trabajo
        </NavLink>
        <NavLink to="/casa-y-deudas" className={({ isActive }) => `barra-navegacion__item${isActive ? ' barra-navegacion__item--activo' : ''}`}>
          Casa y Deudas
        </NavLink>
        <NavLink to="/balance" className={({ isActive }) => `barra-navegacion__item${isActive ? ' barra-navegacion__item--activo' : ''}`}>
          Balance
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
