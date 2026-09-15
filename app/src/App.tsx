import { useEffect } from 'react'
import { HashRouter, Link, NavLink, Route, Routes } from 'react-router-dom'
import { TrabajoScreen } from './features/trabajo/TrabajoScreen'
import { AgregarViajeManualScreen } from './features/viajes/AgregarViajeManualScreen'
import { CasaYDeudasScreen } from './features/casaYDeudas/CasaYDeudasScreen'
import { BalanceScreen } from './features/balance/BalanceScreen'
import { MiaBurbuja } from './features/mia/MiaBurbuja'
import { CuentaScreen } from './features/auth/CuentaScreen'
import { PlanesScreen } from './features/planes/PlanesScreen'
import { AjustesScreen } from './features/ajustes/AjustesScreen'
import { OnboardingScreen } from './features/onboarding/OnboardingScreen'
import { AvisoBanner } from './features/avisos/AvisoBanner'
import { AvisosScreen } from './features/avisos/AvisosScreen'
import { useTema } from './domain/tema/store'
import { sincronizarViajesPendientes } from './domain/viajes/sync'
import { sincronizarJornadasPendientes } from './domain/jornada/sync'
import { sincronizarRegistrosMantenimientoPendientes } from './domain/mantenimiento/sync'
import { sincronizarGastosPendientes } from './domain/gastos/sync'
import { sincronizarDeudasPendientes } from './domain/deudas/sync'
import { sincronizarHogarPendiente } from './domain/hogar/sync'
import { sincronizarAhorroPendiente } from './domain/ahorro/sync'
import { registrarEscuchaBurbuja } from './domain/viajes/burbujaOrquestacion'
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
 *   - "/planes"           → utilidad aparte, no es "zona de trabajo"
 * MIA deja de ser una ruta/pestaña — ahora es <MiaBurbuja/>, una burbuja
 * flotante renderizada acá afuera de <Routes>, visible en cualquier panel.
 * Ningún store se tocó: todo esto es solo reacomodar features/ y App.tsx.
 *
 * "Cuenta" (2026-09-15, pedido explícito del usuario) dejó de tener pestaña
 * propia en la barra — la app se usa gratis y offline sin cuenta, así que
 * una pestaña "Cuenta" siempre visible no tenía sentido ("¿para qué la toco
 * si no necesito nada?"). La ruta /cuenta sigue existiendo tal cual, pero
 * ahora se llega ahí SOLO desde el punto donde hace falta una cuenta de
 * verdad: MiaBurbuja (hablarle a MIA ya pedía login, sin cambios acá),
 * PlanesScreen (suscribirte a un plan pago) y BalanceScreen (guardar tus
 * datos para no perderlos). Mismo patrón en los tres: <Link to="/cuenta">.
 *
 * Onboarding + temas (2026-09-15, pedido explícito del usuario): antes de
 * mostrar cualquier panel, la primera vez que se abre la app se debe pedir
 * los 4 permisos y elegir tema (OnboardingScreen). `useTema().yaElegido` es
 * la misma bandera que ya usa el store para saber si aplicar el tema
 * guardado — se reusa acá para decidir si el onboarding ya se completó
 * (D-18: no se agrega una segunda bandera separada). El tema se puede
 * volver a cambiar después desde /ajustes (ícono ⚙ en la barra).
 */
export function App() {
  const { yaElegido } = useTema()

  useEffect(() => {
    registrarSincronizacionAutomatica('viajes', sincronizarViajesPendientes)
    registrarSincronizacionAutomatica('jornadas', sincronizarJornadasPendientes)
    registrarSincronizacionAutomatica('mantenimiento', sincronizarRegistrosMantenimientoPendientes)
    registrarSincronizacionAutomatica('gastos', sincronizarGastosPendientes)
    registrarSincronizacionAutomatica('deudas', sincronizarDeudasPendientes)
    registrarSincronizacionAutomatica('hogar', sincronizarHogarPendiente)
    registrarSincronizacionAutomatica('ahorro', sincronizarAhorroPendiente)
    registrarEscuchaBurbuja()
  }, [])

  if (!yaElegido) {
    return <OnboardingScreen />
  }

  return (
    <HashRouter>
      {/* Pedido explícito del usuario: "el recordatorio tiene que aparecerme como un mensajito en la parte de arriba... en todas las pantallas" — afuera de <Routes>, mismo criterio que <MiaBurbuja/>. */}
      <AvisoBanner />

      <div className="app-shell">
        <Routes>
          <Route path="/" element={<TrabajoScreen />} />
          <Route path="/viajes/manual" element={<AgregarViajeManualScreen />} />
          <Route path="/casa-y-deudas" element={<CasaYDeudasScreen />} />
          <Route path="/balance" element={<BalanceScreen />} />
          <Route path="/cuenta" element={<CuentaScreen />} />
          <Route path="/planes" element={<PlanesScreen />} />
          <Route path="/ajustes" element={<AjustesScreen />} />
          <Route path="/avisos" element={<AvisosScreen />} />
        </Routes>
      </div>

      <MiaBurbuja />

      <div style={{ position: 'fixed', top: 'calc(env(safe-area-inset-top, 0px) + 12px)', right: 12, zIndex: 20, display: 'flex', gap: 8 }}>
        <Link
          to="/avisos"
          aria-label="Avisos"
          style={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: 'var(--color-superficie)',
            border: '1px solid var(--color-borde)',
            fontSize: 18,
            textDecoration: 'none',
          }}
        >
          🔔
        </Link>
        <Link
          to="/ajustes"
          aria-label="Ajustes"
          style={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: 'var(--color-superficie)',
            border: '1px solid var(--color-borde)',
            fontSize: 18,
            textDecoration: 'none',
          }}
        >
          ⚙
        </Link>
      </div>

      <nav className="barra-navegacion">
        <NavLink to="/" end className={({ isActive }) => `barra-navegacion__item${isActive ? ' barra-navegacion__item--activo' : ''}`}>
          ◉ Trabajo
        </NavLink>
        <NavLink to="/casa-y-deudas" className={({ isActive }) => `barra-navegacion__item${isActive ? ' barra-navegacion__item--activo' : ''}`}>
          Casa
        </NavLink>
        <NavLink to="/balance" className={({ isActive }) => `barra-navegacion__item${isActive ? ' barra-navegacion__item--activo' : ''}`}>
          Balance
        </NavLink>
        <NavLink to="/planes" className={({ isActive }) => `barra-navegacion__item${isActive ? ' barra-navegacion__item--activo' : ''}`}>
          Planes
        </NavLink>
      </nav>
    </HashRouter>
  )
}
