import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTema } from '../../domain/tema/store'
import { TEMAS_DISPONIBLES } from '../../domain/tema/types'
import { sincronizarAparienciaBurbuja } from '../../domain/viajes/burbuja'
import { useEstiloGrafico } from '../../domain/estiloGrafico/store'
import { ESTILOS_DISPONIBLES } from '../../domain/estiloGrafico/types'
import type { ItemDistribucion } from '../../domain/estiloGrafico/types'
import { useVehiculo } from '../../domain/vehiculo/store'
import { VEHICULOS_DISPONIBLES } from '../../domain/vehiculo/types'
import { useViajes } from '../../domain/viajes/store'
import { PLATAFORMAS_DISPONIBLES } from '../../domain/viajes/types'
import { useMetaDiaria } from '../../domain/metaDiaria/store'
import { useAuth } from '../../domain/auth/store'
import { borrarHistorialLocal } from '../../domain/restauracion/borrarHistorial'
import { CampoMonto } from '../../components/CampoMonto'
import { AnillosOrbitales } from '../../components/graficos/AnillosOrbitales'
import { Cristal3D } from '../../components/graficos/Cristal3D'
import { Prisma } from '../../components/graficos/Prisma'
import { SeccionDesplegable } from '../../components/SeccionDesplegable'

/** Muestra de ejemplo para los 3 estilos — mismas proporciones que las capturas de referencia del usuario (Hogar 28% / Deudas 19% / Ahorro 18% / Libre 35%). */
// Mismos 4 colores que BalanceScreen.tsx (D-18: una sola fuente del "set validado de Balance" — ver el comentario ahí).
const ITEMS_MUESTRA: ItemDistribucion[] = [
  { clave: 'hogar', etiqueta: 'Hogar', monto: 1_260_000, porcentaje: 28, color: '#55e3a0' },
  { clave: 'deudas', etiqueta: 'Deudas', monto: 855_000, porcentaje: 19, color: '#ff9d83' },
  { clave: 'ahorro', etiqueta: 'Ahorro', monto: 810_000, porcentaje: 18, color: '#b7a4ff' },
  { clave: 'libre', etiqueta: 'Libre', monto: 1_575_000, porcentaje: 35, color: '#78c8ff' },
]
/**
 * 2026-09-16: antes esto era "TOTAL_MUESTRA" y era exactamente la suma de
 * los 4 ítems de arriba (coincidencia que ocultaba el bug real — ver el
 * comentario largo en Cristal3D.tsx) — un ingreso real no tiene por qué
 * coincidir con esa suma, así que acá se usa un valor distinto a propósito,
 * para que la vista previa muestre la diferencia real entre "ingreso" y
 * "total repartido entre las 4 categorías".
 */
const INGRESO_MUESTRA = 5_800_000

/**
 * Ajustes (2026-09-15, pedido explícito del usuario): "en ajustes... de
 * poder cambiar el tono más adelante si el cliente quiere cambiarlo" — el
 * tema ya no se elige solo una vez en el Onboarding, acá se puede cambiar
 * cuando sea. Reusa el mismo store/lista que OnboardingScreen (D-18): no
 * hay una segunda fuente de temas disponibles.
 */
type SeccionAjustes = 'vehiculo' | 'plataforma' | 'tema' | 'estadisticas' | 'metaDiaria' | 'datos'

export function AjustesScreen() {
  const { tema, elegirTema } = useTema()
  const { estilo, elegirEstilo } = useEstiloGrafico()
  const { tipoVehiculo, elegirVehiculo } = useVehiculo()
  const { plataformaPreferida, elegirPlataformaPreferida } = useViajes()
  const { presupuestoGasolinaMensual, cargar: cargarMetaDiaria, actualizarPresupuestoGasolina } = useMetaDiaria()
  const { autenticado } = useAuth()
  const animado = tema !== 'papel'

  const [gasolinaTexto, setGasolinaTexto] = useState('')
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const [borradoListo, setBorradoListo] = useState(false)

  async function manejarBorrarHistorial() {
    setBorrando(true)
    await borrarHistorialLocal()
    setBorrando(false)
    setConfirmandoBorrado(false)
    setBorradoListo(true)
  }

  useEffect(() => {
    cargarMetaDiaria()
  }, [cargarMetaDiaria])

  useEffect(() => {
    setGasolinaTexto(presupuestoGasolinaMensual ? String(presupuestoGasolinaMensual) : '')
  }, [presupuestoGasolinaMensual])

  /**
   * 2026-09-15, pedido explícito del usuario: "todo lo que esté en ajustes
   * tiene que ser menú desplegable... si estamos en la sección de temas, se
   * espicha y me abre. Si vuelvo a las [otras], se cierra" — UNA sola
   * sección abierta a la vez (a diferencia de los acordeones de Balance,
   * que sí permiten varios abiertos). Un solo `useState` con la clave de
   * cuál está abierta (o `null`, todas cerradas) alcanza para eso.
   */
  const [seccionAbierta, setSeccionAbierta] = useState<SeccionAjustes | null>(null)
  function alternar(seccion: SeccionAjustes) {
    setSeccionAbierta((actual) => (actual === seccion ? null : seccion))
  }

  function manejarElegirTema(nuevo: typeof tema) {
    elegirTema(nuevo)
    // Si la burbuja está visible en este momento (jornada abierta), se repinta con el tema nuevo sin esperar el próximo mostrar()/actualizar().
    void sincronizarAparienciaBurbuja()
  }

  return (
    <div className="pantalla">
      <h1 className="titulo-pantalla">Ajustes</h1>

      <SeccionDesplegable titulo="Vehículo" abierta={seccionAbierta === 'vehiculo'} onToggle={() => alternar('vehiculo')}>
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
      </SeccionDesplegable>

      <SeccionDesplegable titulo="Plataforma preferida" abierta={seccionAbierta === 'plataforma'} onToggle={() => alternar('plataforma')}>
        <p className="texto-mute" style={{ marginBottom: 16 }}>
          Con qué plataforma trabajas más seguido — cuando inicias un viaje desde la burbuja flotante (sin abrir la app), se usa esta en vez de
          "Particular". Siempre la puedes cambiar a mano en cada viaje.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {PLATAFORMAS_DISPONIBLES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => elegirPlataformaPreferida(p)}
              style={{
                textAlign: 'left',
                padding: 16,
                border: p === plataformaPreferida ? '2px solid var(--color-acento)' : '1px solid var(--color-borde)',
              }}
            >
              <strong>{p} {p === plataformaPreferida ? '· Preferida' : ''}</strong>
            </button>
          ))}
        </div>
      </SeccionDesplegable>

      <SeccionDesplegable titulo="Meta diaria" abierta={seccionAbierta === 'metaDiaria'} onToggle={() => alternar('metaDiaria')}>
        <p className="texto-mute" style={{ marginBottom: 16 }}>
          En Trabajo, "Estado del sistema" te muestra cuánto llevas de tu meta del día — se calcula sola con tus gastos fijos del hogar, cuotas de deudas, aportes de ahorro planeados y mantenimientos marcados como fijos. Lo único que falta es un aproximado de cuánto gastas en gasolina al mes (esto NO es un gasto real, solo un estimado para el cálculo — tus cargas de gasolina de siempre se siguen registrando igual en Gastos).
        </p>
        <label className="texto-mute">
          Gasolina aproximada al mes
          <CampoMonto valor={gasolinaTexto} onValorCambia={setGasolinaTexto} placeholder="Ej. 400.000" />
        </label>
        <button
          type="button"
          style={{ marginTop: 12 }}
          onClick={() => actualizarPresupuestoGasolina(Number(gasolinaTexto) || null)}
        >
          Guardar
        </button>
      </SeccionDesplegable>

      <SeccionDesplegable titulo="Tema" abierta={seccionAbierta === 'tema'} onToggle={() => alternar('tema')}>
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
      </SeccionDesplegable>

      <SeccionDesplegable titulo="Diseño de estadísticas" abierta={seccionAbierta === 'estadisticas'} onToggle={() => alternar('estadisticas')}>
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
                {e.valor === 'cristal3d' && <Cristal3D items={ITEMS_MUESTRA} ingresoReal={INGRESO_MUESTRA} animado={animado} />}
                {e.valor === 'cristal3d_ejecutivo' && <Cristal3D items={ITEMS_MUESTRA} ingresoReal={INGRESO_MUESTRA} animado={animado} variante="ejecutivo" />}
                {e.valor === 'prisma' && <Prisma items={ITEMS_MUESTRA} ingresoReal={INGRESO_MUESTRA} animado={animado} />}
                {e.valor === 'prisma_ejecutivo' && <Prisma items={ITEMS_MUESTRA} ingresoReal={INGRESO_MUESTRA} animado={animado} variante="ejecutivo" />}
              </div>

              <button type="button" onClick={() => elegirEstilo(e.valor)} disabled={e.valor === estilo}>
                {e.valor === estilo ? 'Este es el que usás' : 'Usar este estilo'}
              </button>
            </div>
          ))}
        </div>
      </SeccionDesplegable>

      <SeccionDesplegable titulo="Datos" abierta={seccionAbierta === 'datos'} onToggle={() => alternar('datos')}>
        <p className="texto-mute" style={{ marginBottom: 16 }}>
          Borra el historial de viajes, jornadas, gastos, deudas, hogar, ahorro, mantenimiento y bonos guardado en este teléfono — para
          empezar de cero, por ejemplo si tienes datos de prueba mezclados con los reales. No borra tus preferencias (tema, vehículo,
          plataforma preferida, cuenta) ni te impide seguir guardando cosas nuevas después.
        </p>

        {autenticado() && (
          <p className="texto-mute" style={{ marginBottom: 16, color: '#f0c987' }}>
            Tienes cuenta creada: esto borra los datos de ESTE teléfono, pero todavía no existe forma de borrarlos también de la nube — si
            más adelante cierras sesión y vuelves a entrar (o reinstalas la app e inicias sesión), estos mismos datos pueden volver a
            aparecer desde la nube.
          </p>
        )}

        {borradoListo ? (
          <p className="texto-mute" style={{ color: '#4caf50' }}>Listo — el historial quedó en cero. Puedes seguir usando la app normal.</p>
        ) : confirmandoBorrado ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: 0, fontWeight: 600 }}>
              ¿Seguro? Esto borra TODOS los viajes, jornadas, gastos, deudas, hogar, ahorro, mantenimiento y bonos guardados hasta ahora en
              este teléfono. No se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => void manejarBorrarHistorial()} disabled={borrando} style={{ color: '#ff6b6b' }}>
                {borrando ? 'Borrando…' : 'Sí, borrar todo'}
              </button>
              <button type="button" onClick={() => setConfirmandoBorrado(false)} disabled={borrando}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmandoBorrado(true)} style={{ color: '#ff6b6b' }}>
            Borrar historial
          </button>
        )}
      </SeccionDesplegable>

      <Link to="/" style={{ display: 'inline-block', marginTop: 24 }}>
        ← Volver
      </Link>
    </div>
  )
}
