import type { ItemDistribucion } from '../../domain/estiloGrafico/types'
import type { VarianteGrafico } from './paletaEjecutiva'

import imgColorIngreso from '../../assets/cristal3d/A-color-ingreso.webp'
import imgColorHogar from '../../assets/cristal3d/A-color-hogar.webp'
import imgColorDeudas from '../../assets/cristal3d/A-color-deudas.webp'
import imgColorAhorro from '../../assets/cristal3d/A-color-ahorro.webp'
import imgColorLibre from '../../assets/cristal3d/A-color-libre.webp'
import imgColorVehiculo from '../../assets/cristal3d/A-color-vehiculo.webp'
import imgMatteIngreso from '../../assets/cristal3d/B-matte-ingreso.webp'
import imgMatteHogar from '../../assets/cristal3d/B-matte-hogar.webp'
import imgMatteDeudas from '../../assets/cristal3d/B-matte-deudas.webp'
import imgMatteAhorro from '../../assets/cristal3d/B-matte-ahorro.webp'
import imgMatteLibre from '../../assets/cristal3d/B-matte-libre.webp'
import imgMatteVehiculo from '../../assets/cristal3d/B-matte-vehiculo.webp'

function formatoPesosCorto(monto: number): string {
  if (Math.abs(monto) >= 1_000_000) return `$${(monto / 1_000_000).toFixed(1)}M`
  if (Math.abs(monto) >= 1_000) return `$${Math.round(monto / 1000)}K`
  return `$${Math.round(monto)}`
}

const IMAGENES_COLOR: Record<string, string> = { ingreso: imgColorIngreso, hogar: imgColorHogar, deudas: imgColorDeudas, ahorro: imgColorAhorro, libre: imgColorLibre, vehiculo: imgColorVehiculo }
const IMAGENES_MATTE: Record<string, string> = { ingreso: imgMatteIngreso, hogar: imgMatteHogar, deudas: imgMatteDeudas, ahorro: imgMatteAhorro, libre: imgMatteLibre, vehiculo: imgMatteVehiculo }
/** Tono dorado único de la variante ejecutiva — el mismo del grabado en las fotos B-matte-*. */
const COLOR_TEXTO_EJECUTIVO = '#e6d9b1'

/**
 * Posición en cruz calcada de la referencia real (paquete "pulse-finance-
 * final-assets" — 5 placas de cristal fotografiadas: INGRESO al centro,
 * las 4 categorías alrededor). `left`/`top` son el punto central de cada
 * placa en % del stage; `rot` es su inclinación fija (la misma con la que
 * salió fotografiada, no inventada).
 *
 * 2026-09-16, pedido explícito del usuario ("me gustaría la de cristal que
 * se pueda ver esa quinta gráfica"): se agregó una 6ta placa, "VEHÍCULO"
 * (BalanceScreen.tsx) — sin una foto nueva del mismo fotógrafo/IA que las
 * otras 5 (no hay forma de generar una en este entorno), se editó la placa
 * "LIBRE" existente: se borró el texto grabado con relleno del degradado
 * del propio cristal (interpolación fila por fila entre los bordes sanos
 * de la placa, sin tocar los broches de las esquinas) y se dibujó
 * "VEHÍCULO" encima con el mismo estilo (bisel cromado en la versión color,
 * brillo ámbar en la ejecutiva) — mismo archivo base, mismo material,
 * misma luz, así que encaja sin desentonar. El layout pasa de cruz (4
 * satélites) a pentágono (5 satélites) alrededor de "INGRESO", mismo radio
 * aproximado que la cruz original.
 */
const POSICIONES: Record<string, { left: number; top: number; width: number; rot: number; z: number; delay: number }> = {
  ingreso:  { left: 50,   top: 50,   width: 30, rot: 1, z: 6, delay: 1.8 },
  hogar:    { left: 50,   top: 15,   width: 23, rot: -3, z: 2, delay: 0 },
  deudas:   { left: 82.3, top: 39.2, width: 23, rot: 3, z: 3, delay: 0.35 },
  vehiculo: { left: 70,   top: 78.3, width: 23, rot: -4, z: 4, delay: 0.7 },
  libre:    { left: 30,   top: 78.3, width: 23, rot: 4, z: 3, delay: 1.05 },
  ahorro:   { left: 17.7, top: 39.2, width: 23, rot: -5, z: 2, delay: 1.4 },
}

/**
 * Estilo "Cristal 3D" — 2026-09-16 (segunda corrección, misma sesión): ya
 * no es un panel dibujado en CSS. El usuario mandó fotos reales generadas
 * por IA (5 placas de vidrio grabado, fotografía de producto 3D real —
 * "que también se dejen configurar bien sin problema") y, tras varias
 * rondas donde el recorte/transparencia que devolvía esa IA salía roto
 * (esquinas cortadas, fondo no transparente), terminé recortando las 10
 * piezas yo mismo con Python (segmentación por diferencia de fondo +
 * envolvente convexa — ver PLAN-MAESTRO para el detalle del proceso).
 *
 * Cada placa trae su nombre grabado en la imagen (HOGAR/DEUDAS/AHORRO/
 * LIBRE/VEHÍCULO/INGRESO — VEHÍCULO editada de LIBRE, ver el comentario de
 * `POSICIONES` más abajo) pero el número queda vacío a propósito — el dato
 * real (porcentaje o el monto total en INGRESO) se superpone acá como
 * texto, para que siempre sea el dato del usuario, nunca uno fijo horneado
 * en la imagen (ver el aviso que se le dio al usuario sobre esto).
 *
 * `variante`: 'ejecutivo' usa el segundo lote de fotos (vidrio ahumado
 * negro + bronce/dorado mate, la misma escena pero en ese material) en vez
 * de swapear colores por CSS — son fotos distintas, no un filtro.
 *
 * 2026-09-16, bug real reportado por el usuario ("cuando pongo deudas, en
 * ingreso me suma cualquier cosa"): la placa central, con "INGRESO" grabado
 * en la foto, mostraba `total` — que en BalanceScreen.tsx es `sumaCuatro`
 * (Hogar+Deudas+Ahorro+Libre, el denominador para que esas 4 porciones
 * sumen 100% entre sí), NO el ingreso real de los viajes. Agregar una deuda
 * sube `sumaCuatro` y por lo tanto ese número — exactamente el bug
 * reportado. Ahora recibe `ingresoReal` aparte (domain/estadisticas,
 * `calcularResumen(viajes).ingresos` vía `balance.ingresosTotales`) para
 * esa placa — `total` se sigue usando solo para lo que ya usaba antes de
 * esto (nada más, era su único uso).
 */
export function Cristal3D({
  items,
  ingresoReal,
  animado = true,
  variante = 'clasico',
}: {
  items: ItemDistribucion[]
  ingresoReal: number
  animado?: boolean
  variante?: VarianteGrafico
}) {
  const ejecutivo = variante === 'ejecutivo'
  const imagenes = ejecutivo ? IMAGENES_MATTE : IMAGENES_COLOR

  const placas = [
    { clave: 'ingreso', color: COLOR_TEXTO_EJECUTIVO, texto: formatoPesosCorto(ingresoReal) },
    ...items.slice(0, 5).map((item) => ({ clave: item.clave, color: ejecutivo ? COLOR_TEXTO_EJECUTIVO : item.color, texto: `${Math.round(item.porcentaje)}%` })),
  ]

  return (
    <div className="cristal3d__stage">
      {placas.map((placa) => {
        const pos = POSICIONES[placa.clave]
        if (!pos) return null
        const src = imagenes[placa.clave]
        return (
          <div
            key={placa.clave}
            style={{ position: 'absolute', left: `${pos.left}%`, top: `${pos.top}%`, width: `${pos.width}%`, transform: 'translate(-50%, -50%)', zIndex: pos.z }}
          >
            <div
              className={animado ? 'cristal3d__placa cristal3d__placa--animada' : 'cristal3d__placa'}
              style={{ ['--rot' as string]: `${pos.rot}deg`, animationDelay: `${pos.delay}s` }}
            >
              <img src={src} alt="" style={{ width: '100%', display: 'block' }} />
              <span className="cristal3d__dato" style={{ color: placa.color, textShadow: `0 0 9px ${placa.color}99` }}>
                {placa.texto}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
