# ai

Proxy de IA hacia OpenAI (`proveedorIA.ts`) para tres rutas: `/ai/conversacion` (la que usa el cliente, con voz y contexto continuo), `/ai/intent` (mapea a una intención fija) y `/ai/analisis` (contexto compacto + razonamiento). El 503 en cualquiera de las tres solo ocurre si falta configurar `OPENAI_API_KEY`.
