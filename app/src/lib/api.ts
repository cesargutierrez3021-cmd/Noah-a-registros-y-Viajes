const CLAVE_TOKEN_ACCESO = 'mia:tokenAcceso'
const CLAVE_TOKEN_REFRESCO = 'mia:tokenRefresco'
export const URL_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'
export function obtenerTokenAcceso(){return localStorage.getItem(CLAVE_TOKEN_ACCESO)}
export function obtenerTokenRefresco(){return localStorage.getItem(CLAVE_TOKEN_REFRESCO)}
export function guardarTokens(a:string,r:string){localStorage.setItem(CLAVE_TOKEN_ACCESO,a);localStorage.setItem(CLAVE_TOKEN_REFRESCO,r)}
export function borrarTokens(){localStorage.removeItem(CLAVE_TOKEN_ACCESO);localStorage.removeItem(CLAVE_TOKEN_REFRESCO)}
export function haySesion(){return obtenerTokenAcceso()!==null}
export class ErrorSinSesion extends Error { constructor(){super('Todavía no hay sesión iniciada.')} }
export class ErrorApi extends Error { constructor(message:string, public codigoHttp:number){super(message)} }
async function procesarRespuesta<T>(r:Response):Promise<T>{const d=await r.json().catch(()=>null);if(!r.ok)throw new ErrorApi((d as {error?:string}|null)?.error??`Error del backend (${r.status})`,r.status);return d as T}
export async function post<T>(ruta:string,cuerpo:unknown){return procesarRespuesta<T>(await fetch(`${URL_BASE}${ruta}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(cuerpo)}))}
export async function get<T>(ruta:string){return procesarRespuesta<T>(await fetch(`${URL_BASE}${ruta}`))}
let refrescando: Promise<boolean>|null=null
async function refrescarToken():Promise<boolean>{if(refrescando)return refrescando;refrescando=(async()=>{const refresh=obtenerTokenRefresco();if(!refresh)return false;try{const r=await fetch(`${URL_BASE}/auth/refrescar`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tokenRefresco:refresh})});if(!r.ok){borrarTokens();return false}const d=await r.json() as {tokenAcceso:string;tokenRefresco:string};guardarTokens(d.tokenAcceso,d.tokenRefresco);return true}catch{return false}finally{refrescando=null}})();return refrescando}
async function autenticado<T>(ruta:string, method:'GET'|'POST', cuerpo?:unknown):Promise<T>{let token=obtenerTokenAcceso();if(!token)throw new ErrorSinSesion();const opciones:RequestInit={method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}};if(method==='POST')opciones.body=JSON.stringify(cuerpo);let r=await fetch(`${URL_BASE}${ruta}`,opciones);if(r.status===401 && await refrescarToken()){token=obtenerTokenAcceso()!;opciones.headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};r=await fetch(`${URL_BASE}${ruta}`,opciones)}return procesarRespuesta<T>(r)}
export function getAutenticado<T>(ruta:string){return autenticado<T>(ruta,'GET')}
export function postAutenticado<T>(ruta:string,cuerpo:unknown){return autenticado<T>(ruta,'POST',cuerpo)}
