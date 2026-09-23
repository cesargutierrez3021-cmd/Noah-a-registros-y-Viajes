export type ProveedorIA = (prompt: string) => Promise<string>

export class ErrorProveedorIA extends Error { codigoHttp = 503 }

/**
 * 2026-09-23, pedido explícito del usuario: le preguntó algo a MIA por voz que ninguna regla
 * reconoció, el camino de respaldo intentó el proxy de IA, no había `OPENAI_API_KEY`
 * configurada en este entorno, y el conductor vio ese 503 como "no hay agente conectado" — un
 * error de configuración del backend disfrazado de falla. Subclase específica para ESE caso
 * (falta la clave), distinta de una falla real del proveedor (HTTP no-ok, respuesta vacía,
 * etc.) — `conversacion.ts` atrapa solo esta subclase para /ai/conversacion y responde con un
 * mensaje local en vez de propagar el error; una falla real de la API sigue subiendo como
 * error de verdad, para no esconder un bug real detrás de un mensaje genérico.
 */
export class ErrorProveedorIASinConfigurar extends ErrorProveedorIA {}

/** Proveedor OpenAI-compatible. Si no hay clave, falla explícitamente: nunca inventa datos. */
export const proveedorSinImplementar: ProveedorIA = async (prompt) => {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new ErrorProveedorIASinConfigurar('El proveedor de IA no está configurado (OPENAI_API_KEY).')
  const model = process.env.OPENAI_MODEL ?? 'gpt-5-mini'
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        { role: 'system', content: 'Eres MIA, asistente de un conductor. Usa exclusivamente los datos proporcionados. Si falta un dato, dilo. Responde en español colombiano, directo y breve.' },
        { role: 'user', content: prompt },
      ],
    }),
  })
  const data = await response.json().catch(() => null) as { error?: { message?: string }, choices?: Array<{ message?: { content?: string } }> } | null
  if (!response.ok) throw new ErrorProveedorIA(data?.error?.message ?? `Proveedor IA HTTP ${response.status}`)
  const answer = data?.choices?.[0]?.message?.content?.trim()
  if (!answer) throw new ErrorProveedorIA('El proveedor IA devolvió una respuesta vacía.')
  return answer
}

export const proveedorIA = proveedorSinImplementar
