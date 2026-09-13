export interface UsuarioPublico {
  id: string
  email: string
  creadoEnISO: string
}

export interface ParDeTokens {
  tokenAcceso: string
  tokenRefresco: string
}

export interface CargaTokenAcceso {
  sub: string // id del usuario
  email: string
}
