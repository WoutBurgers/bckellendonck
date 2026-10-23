/**
 * Small client for the BC Kellendonck API.
 * By default the API is served from the same domain under /api (Vite proxy in development,
 * the same Railway service in production). Set VITE_API_URL only when the API runs on another domain.
 */
const base = (import.meta.env.VITE_API_URL?.trim() || '').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  data: Record<string, unknown>
  constructor(status: number, message: string, data: Record<string, unknown> = {}) {
    super(message)
    this.status = status
    this.data = data
  }
}

export function apiUrl(path: string) {
  return `${base}${path}`
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  json?: unknown
  form?: FormData
  signal?: AbortSignal
}

export async function api<T>(path: string, { method = 'GET', json, form, signal }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  // Required by the server on every state-changing request (CSRF protection).
  if (method !== 'GET') headers['X-BCK-Request'] = '1'
  let body: BodyInit | undefined
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(json)
  } else if (form) body = form

  let response: Response
  try {
    response = await fetch(apiUrl(path), { method, headers, body, credentials: 'include', cache: 'no-store', signal })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new ApiError(0, 'Er is geen verbinding met de server. Controleer uw internetverbinding en probeer het opnieuw.')
  }

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    const message = typeof data.error === 'string' ? data.error : 'Er ging iets mis. Probeer het later opnieuw.'
    throw new ApiError(response.status, message, data)
  }
  return data as T
}
