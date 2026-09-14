import { registerPlugin } from '@capacitor/core'

interface BurbujaPlugin {
  tienePermiso(): Promise<{concedido:boolean}>
  solicitarPermiso(): Promise<{concedido:boolean}>
  mostrar(args:{km:string;tiempo:string;enViaje:boolean;totalViajes:number}): Promise<void>
  actualizar(args:{km:string;tiempo:string;enViaje:boolean;totalViajes:number}): Promise<void>
  ocultar(): Promise<void>
}
const Burbuja = registerPlugin<BurbujaPlugin>('Burbuja')
export async function mostrarBurbuja(km:string, tiempo:string, enViaje:boolean, totalViajes:number){
  const permiso=await Burbuja.tienePermiso()
  if(!permiso.concedido){ await Burbuja.solicitarPermiso(); return }
  await Burbuja.mostrar({km,tiempo,enViaje,totalViajes})
}
export async function actualizarBurbuja(km:string, tiempo:string, enViaje:boolean, totalViajes:number){
  const permiso=await Burbuja.tienePermiso().catch(()=>({concedido:false}))
  if(!permiso.concedido) return
  await Burbuja.actualizar({km,tiempo,enViaje,totalViajes})
}
export async function ocultarBurbuja(){ await Burbuja.ocultar().catch(()=>undefined) }
