import { useViajes } from '../viajes/store'
import { useJornada } from '../jornada/store'
import { useGastos } from '../gastos/store'
import { useDeudas } from '../deudas/store'
import { useHogar } from '../hogar/store'
import { useAhorro } from '../ahorro/store'
import { useMantenimiento } from '../mantenimiento/store'
import { useBonos } from '../bonos/store'

/**
 * 2026-09-23, pedido explícito del usuario ("por lo que veo, figura como datos y cosas
 * anteriores, pruebas... hay que dejar todo en cero otra vez... sin dañar el tema de que se me
 * guarden las cosas a futuro"): borra el HISTORIAL de datos (viajes, jornadas, gastos, deudas,
 * hogar, ahorro, mantenimiento, bonos) para volver a arrancar en limpio, sin tocar preferencias
 * (tema, vehículo, cuenta, voz, plataforma preferida, presupuesto de gasolina) ni la capacidad de
 * seguir guardando cosas nuevas — cada store sigue funcionando normal después de esto, solo que
 * arranca de $0/sin registros otra vez.
 *
 * Deliberadamente NO toca el backend: el diseño de sync es push-only con upsert por id (D-16,
 * ver comentarios de domain/ahorro/types.ts y domain/deudas/types.ts) — no existe ningún endpoint
 * para borrar del lado del servidor. Si el conductor tiene cuenta y en algún momento cierra sesión
 * y vuelve a entrar (o reinstala), `restaurarTodoDesdeServidor()` (domain/restauracion/restaurar.ts)
 * va a volver a traer estos mismos registros desde la nube — este borrado es solo del teléfono.
 * AjustesScreen.tsx se lo avisa al conductor antes de confirmar si está autenticado.
 */
const CLAVES_HISTORIAL = [
  'mia:viajes',
  'mia:viaje-en-curso',
  'mia:jornadas',
  'mia:gastos',
  'mia:deudas',
  'mia:deudas:abonos',
  'mia:hogar:conceptos',
  'mia:hogar:gastos',
  'mia:ahorro',
  'mia:ahorro:abonos',
  'mia:mantenimiento:items',
  'mia:mantenimiento:registros',
  'mia:bonos',
]

export async function borrarHistorialLocal(): Promise<void> {
  for (const clave of CLAVES_HISTORIAL) localStorage.removeItem(clave)

  await Promise.all([
    useViajes.getState().cargar(),
    useJornada.getState().cargar(),
    useGastos.getState().cargar(),
    useDeudas.getState().cargar(),
    useHogar.getState().cargar(),
    useAhorro.getState().cargar(),
    useMantenimiento.getState().cargar(),
    useBonos.getState().cargar(),
  ])
}
