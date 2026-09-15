import { Link } from 'react-router-dom'
import { useTema } from '../../domain/tema/store'
import { TEMAS_DISPONIBLES } from '../../domain/tema/types'
import { sincronizarAparienciaBurbuja } from '../../domain/viajes/burbuja'
import { useEstiloGrafico } from '../../domain/estiloGrafico/store'
import { ESTILOS_DISPONIBLES } from '../../domain/estiloGrafico/types'
import type { ItemDistribucion } from '../../domain/estiloGrafico/types'
import { useVehiculo } from '../../domain/vehiculo/store'
import { VEHICULOS_DISPONIBLES } from '../../domain/vehiculo/types'
import { AnillosOrbitales } from '../../components/graficos/AnillosOrbitales'
import { Cristal3D } from '../../components/graficos/Cristal3D'
import { Prisma } from '../../components/graficos/Prisma'

/** Muestra de ejemplo para los 3 estilos — mismas proporciones que las capturas de referencia del usuario (Hogar 28% / Deudas 19% / Ahorro 18% / Libre 35%). */
const ITEMS_MUESTRA: ItemDistribucion[] = [
  { clave: 'hogar', etiqueta: 'Hogar', monto: 1_260_000, porcentaje: 28, color: '#c98500' },
  { clave: 'deudas', etiqueta: 'Deudas', monto: 855_000, porcentaje: 19, color: '#d95926' },
  { clave: 'ahorro', etiqueta: 'Ahorro', monto: 810_000, porcentaje: 18, color: '#199e70' },
  { clave: 'libre', etiqueta: 'Libre', monto: 1_575_000, porcentaje: 35, color: '#3987e5' },
]
const TOTAL_MUESTRA = 4_500_000

/**
 * Ajustes (2026-09-15, pedido explícito del usuario): "en ajustes... de
 * poder cambiar el tono más adelante si el cliente quiere cambiarlo" — el
 * tema ya no se elige solo una vez en el Onboarding, acá se puede cambiar
 * cuando sea. Reusa el mismo store/lista que OnboardingScreen (D-18): no
 * hay una segunda fuente de temas disponibles.
 */
export function AjustesScreen() {
  const { tema, elegirTema } = useTema()
  const { estilo, elegirEstilo } = useEstiloGrafico()
  const { tipoVehiculo, elegirVehiculo } = useVehiculo()
  const animado = tema !== 'papel'

  function manejarElegirTema(nuevo: typeof tema) {
    elegirTema(nuevo)
    // Si la burbuja está visible en este momento (jornada abierta), se repinta con el tema nuevo sin esperar el próximo mostrar()/actualizar().
    void sincronizarAparienciaBurbuja()
  }

  return (
    <div className="pantalla">
      <h1 className="titulo-pantalla">Ajustes</h1>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 4 }}>Vehículo</h2>
        <p className="texto-mute" style={{ marginBottom: 16 }}>
          Qué manejas — decide qué catálogo de mantenimiento te aparece en Trabajo.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {VEHICULOS_DISPONIBLES.map((v) => (
            <button
              key={v.valor}
              type="button"
              onClick={() => elegirVehiculo(v.valor)}
              style={{
                textAlign: 'left',
                padding: 16,
                border: v.valor === tipoVehiculo ? '2px solid var(--color-acento)' : '1px solid var(--color-borde)',
              }}
            >
              <strong style={{ display: 'block', marginBottom: 4 }}>
                {v.nombre} {v.valor === tipoVehiculo ? '· Actual' : ''}
              </strong>
              <span className="texto-mute">{v.descripcion}</span>
            </button>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ marginBottom: 4 }}>Tema</h2>
        <p className="texto-mute" style={{ marginBottom: 16 }}>
          Cambia el estilo visual de toda la app cuando quieras.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {TEMAS_DISPONIBLES.map((t) => (
            <button
              key={t.valor}
              type="button"
              onClick={() => manejarElegirTema(t.valor)}
              style={{
                textAlign: 'left',
                padding: 16,
                border: t.valor === tema ? '2px solid var(--color-acento)' : '1px solid var(--color-borde)',
              }}
            >
              <strong style={{ display: 'block', marginBottom: 4 }}>
                {t.nombre} {t.valor === tema ? '· Actual' : ''}
              </strong>
              <span className="texto-mute">{t.descripcion}</span>
            </button>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ marginBottom: 4 }}>Diseño de estadísticas</h2>
        <p className="texto-mute" style={{ marginBottom: 16 }}>
          Así se ve la distribución de dinero en Balance con cada estilo — elegí el que más te guste, con datos de ejemplo reales (no son los tuyos).
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {ESTILOS_DISPONIBLES.map((e) => (
            <div
              key={e.valor}
              className="tarjeta-viaje"
              style={{
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: 12,
                padding: 16,
                border: e.valor === estilo ? '2px solid var(--color-acento)' : '1px solid var(--color-borde)',
              }}
            >
              <div>
                <strong>{e.nombre} {e.valor === estilo ? '· Actual' : ''}</strong>
                <p className="texto-mute" style={{ fontSize: '0.8rem', margin: '2px 0 0' }}>{e.descripcion}</p>
              </div>

              <div style={{ padding: '8px 0' }}>
                {e.valor === 'anillos' && <AnillosOrbitales items={ITEMS_MUESTRA} animado={animado} />}
                {e.valor === 'cristal3d' && <Cristal3D items={ITEMS_MUESTRA} animado={animado} />}
                {e.valor === 'cristal3d_ejecutivo' && <Cristal3D items={ITEMS_MUESTRA} animado={animado} variante="ejecutivo" />}
                {e.valor === 'prisma' && <Prisma items={ITEMS_MUESTRA} total={TOTAL_MUESTRA} animado={animado} />}
                {e.valor === 'prisma_ejecutivo' && <Prisma items={ITEMS_MUESTRA} total={TOTAL_MUESTRA} animado={animado} variante="ejecutivo" />}
              </div>

              <button type="button" onClick={() => elegirEstilo(e.valor)} disabled={e.valor === estilo}>
                {e.valor === estilo ? 'Este es el que usás' : 'Usar este estilo'}
              </button>
            </div>
          ))}
        </div>
      </section>

      <Link to="/" style={{ display: 'inline-block', marginTop: 24 }}>
        ← Volver
      </Link>
    </div>
  )
}
