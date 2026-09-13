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
  localidad: z.string().nullable(),
  zona: z.string().nullable(),
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
