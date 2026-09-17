const ZONA_HORARIA_NEGOCIO = 'America/Bogota'

export function fechaNegocioISO(fecha: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA_NEGOCIO, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(fecha)
  const get=(tipo:string)=>partes.find(p=>p.type===tipo)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function fechaHoraBogota(fecha: Date = new Date()): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: ZONA_HORARIA_NEGOCIO, dateStyle: 'short', timeStyle: 'short',
  }).format(fecha)
}

function componentesBogota(fecha: Date = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', {timeZone: ZONA_HORARIA_NEGOCIO, year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'}).formatToParts(fecha)
  return {year:Number(p.find(x=>x.type==='year')!.value), month:Number(p.find(x=>x.type==='month')!.value), day:Number(p.find(x=>x.type==='day')!.value)}
}
export function limitesDiaBogotaISO(fecha: Date = new Date()) {
  const {year,month,day}=componentesBogota(fecha)
  const inicio=Date.UTC(year,month-1,day,5,0,0,0)
  return {desde:new Date(inicio).toISOString(),hasta:new Date(inicio+86400000).toISOString()}
}
export function limitesSemanaBogotaISO(fecha: Date = new Date()) {
  const {year,month,day}=componentesBogota(fecha)
  const d=new Date(Date.UTC(year,month-1,day,5,0,0,0)); const weekday=d.getUTCDay()||7
  d.setUTCDate(d.getUTCDate()-weekday+1)
  return {desde:d.toISOString(),hasta:new Date(d.getTime()+7*86400000).toISOString()}
}

export function limitesMesBogotaISO(fecha: Date = new Date()) { const {year,month}=componentesBogota(fecha); const inicio=Date.UTC(year,month-1,1,5); const fin=Date.UTC(year,month,1,5); return {desde:new Date(inicio).toISOString(),hasta:new Date(fin).toISOString()} }

/** Límites [desde, hasta) del día de negocio dado, en formato YYYY-MM-DD (Bogotá) — para el selector de día del Historial. */
export function limitesDiaBogotaISODesdeClave(claveDia: string) {
  const [year, month, day] = claveDia.split('-').map(Number)
  const inicio = Date.UTC(year, month - 1, day, 5, 0, 0, 0)
  return { desde: new Date(inicio).toISOString(), hasta: new Date(inicio + 86400000).toISOString() }
}

/**
 * Minutos transcurridos desde medianoche (0-1439) en Bogotá de un ISO dado —
 * para franjas horarias (domain/estadisticas). Con minutos, no solo hora
 * entera, porque los cortes de franja (2026-09-17, pedido explícito del
 * usuario) caen en medias horas ("11 y media de la mañana").
 */
export function minutosDelDiaLocalBogota(fechaISO: string): number {
  const partes = new Intl.DateTimeFormat('en-US', { timeZone: ZONA_HORARIA_NEGOCIO, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date(fechaISO))
  const hora = Number(partes.find((p) => p.type === 'hour')?.value ?? 0)
  const minuto = Number(partes.find((p) => p.type === 'minute')?.value ?? 0)
  return hora * 60 + minuto
}
