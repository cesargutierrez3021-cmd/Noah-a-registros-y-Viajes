import { z } from 'zod'

const esquemaPunto = z.object({
  lat: z.number(),
  lng: z.number(),
  timestampISO: z.string(),
})

export const esquemaViajeSync = z.object({
  id: z.string().uuid('El id del viaje debe ser el UUID generado en el cliente'),
  plataforma: z.string().min(1),
  estado: z.enum(['en_curso', 'finalizado']),
  inicioISO: z.string(),
  finISO: z.string().nullable(),
  recorrido: z.array(esquemaPunto),
  kmHastaRecoger: z.number().nonnegative(),
  kmConPasajero: z.number().nonnegative(),
  kmTotalesReales: z.number().nonnegative(),
  distanciaReportadaPlataforma: z.number().nullable(),
  ingreso: z.number().nonnegative(),
  ingresoPendiente: z.boolean().optional().default(false),
  localidad: z.string().nullable(),
  zona: z.string().nullable(),
  localidadInicio: z.string().nullable().optional(),
  zonaInicio: z.string().nullable().optional(),
  localidadFin: z.string().nullable().optional(),
  zonaFin: z.string().nullable().optional(),
})

export const esquemaJornadaSync = z.object({
  id: z.string().uuid('El id de la jornada debe ser el UUID generado en el cliente'),
  inicioISO: z.string(),
  finISO: z.string().nullable(),
  viajesIds: z.array(z.string()),
})

export const esquemaRegistroMantenimientoSync = z.object({
  id: z.string().uuid('El id del registro debe ser el UUID generado en el cliente'),
  itemId: z.string().min(1),
  fechaISO: z.string(),
  km: z.number().nonnegative(),
  costo: z.number().nonnegative().nullable(),
  notas: z.string().nullable(),
})

export const esquemaGastoSync = z.object({
  id: z.string().uuid('El id del gasto debe ser el UUID generado en el cliente'),
  categoria: z.enum([
    'gasolina',
    'aceite',
    'llantas',
    'mantenimiento',
    'otro',
    'balanceo',
    'pastillas_freno',
    'liquido_frenos',
    'lavado',
    'comida',
    'pinchazo',
    'grua',
    'multa',
    'soat',
    'tecnomecanica',
  ]),
  monto: z.number().positive(),
  fechaISO: z.string(),
  litros: z.number().positive().nullable(),
  notas: z.string().nullable(),
})

const esquemaCuotaProgramada = z.object({
  monto: z.number().positive(),
  frecuencia: z.enum(['semanal', 'quincenal', 'mensual']),
})

export const esquemaDeudaSync = z.object({
  id: z.string().uuid('El id de la deuda debe ser el UUID generado en el cliente'),
  nombre: z.string().min(1),
  saldoInicial: z.number().positive(),
  saldoActual: z.number().nonnegative(),
  cuotaProgramada: esquemaCuotaProgramada.nullable(),
  creadaEnISO: z.string(),
})

export const esquemaAbonoDeudaSync = z.object({
  id: z.string().uuid('El id del abono debe ser el UUID generado en el cliente'),
  deudaId: z.string().uuid('deudaId debe ser el UUID de una deuda ya creada'),
  monto: z.number().positive(),
  fechaISO: z.string(),
})

export const esquemaMetaAhorroSync = z.object({
  id: z.string().uuid('El id de la meta debe ser el UUID generado en el cliente'),
  nombre: z.string().min(1),
  montoObjetivo: z.number().positive(),
  saldoActual: z.number().nonnegative(),
  creadaEnISO: z.string(),
})

export const esquemaAbonoAhorroSync = z.object({
  id: z.string().uuid('El id del abono debe ser el UUID generado en el cliente'),
  metaId: z.string().uuid('metaId debe ser el UUID de una meta ya creada'),
  monto: z.number().positive(),
  fechaISO: z.string(),
})

export const esquemaConceptoFijoSync = z.object({
  id: z.string().uuid('El id del concepto fijo debe ser el UUID generado en el cliente'),
  nombre: z.string().min(1),
  montoEsperado: z.number().positive(),
  diaDelMes: z.number().int().min(1).max(31),
  activo: z.boolean(),
  creadoEnISO: z.string(),
})

export const esquemaGastoHogarSync = z.object({
  id: z.string().uuid('El id del gasto debe ser el UUID generado en el cliente'),
  nombre: z.string().min(1),
  monto: z.number().positive(),
  tipo: z.enum(['unico', 'fijo']),
  fechaISO: z.string(),
  conceptoFijoId: z.string().uuid('conceptoFijoId debe ser el UUID de un concepto fijo ya creado').nullable(),
})
