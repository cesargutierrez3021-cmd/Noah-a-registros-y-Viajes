import { ViajesScreen } from './features/viajes/ViajesScreen'

/**
 * Raíz de la app. Por ahora solo monta la pantalla de Viajes (único feature
 * construido hasta la Fase 5). Cuando arranque la Fase 6 (mantenimiento +
 * estadísticas) y se necesite navegación entre pantallas, aquí es donde se
 * agrega react-router-dom (ya está en package.json, sin usar todavía).
 */
export function App() {
  return <ViajesScreen />
}
