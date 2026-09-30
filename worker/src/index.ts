const ALLOWED_ORIGINS = new Set([
  'https://saltatrixtv.alperensenel.com',
])

const isAllowedOrigin = (origin: string) => ALLOWED_ORIGINS.has(origin) || /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(origin)

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range, Content-Type',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Type',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
})

const decodeTarget = (encoded: string) => {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - encoded.length % 4) % 4)
  const binary = atob(base64)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

const isPrivateIpv4 = (hostname: string) => {
  const parts = hostname.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false
  const [a, b] = parts
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)
}

const validateTarget = (raw: string) => {
  const target = new URL(raw)
  if (!['http:', 'https:'].includes(target.protocol)) throw new Error('Yalnızca HTTP ve HTTPS adresleri desteklenir.')
  const hostname = target.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal') || isPrivateIpv4(hostname) || hostname === '::1' || hostname.startsWith('fe80:') || hostname.startsWith('fc') || hostname.startsWith('fd')) throw new Error('Yerel ve özel ağ adreslerine erişim engellendi.')
  const port = target.port ? Number(target.port) : target.protocol === 'https:' ? 443 : 80
  if (port < 1 || port > 65535) throw new Error('Geçersiz hedef portu.')
  return target
}

const proxyPath = (target: URL, requestUrl: URL) => {
  const bytes = new TextEncoder().encode(target.toString())
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  const encoded = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${requestUrl.origin}/v1/${encoded}`
}

const rewritePlaylistLine = (line: string, target: URL, requestUrl: URL) => {
  if (!line || line.startsWith('#')) {
    return line.replace(/URI="([^"]+)"/g, (_match, uri: string) => `URI="${proxyPath(new URL(uri, target), requestUrl)}"`)
  }
  return proxyPath(new URL(line, target), requestUrl)
}

const rewritePlaylist = (body: ReadableStream<Uint8Array>, target: URL, requestUrl: URL) => {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let pending = ''
  return body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      pending += decoder.decode(chunk, { stream: true })
      const lines = pending.split(/\r?\n/)
      pending = lines.pop() || ''
      if (lines.length) controller.enqueue(encoder.encode(`${lines.map((line) => rewritePlaylistLine(line, target, requestUrl)).join('\n')}\n`))
    },
    flush(controller) {
      pending += decoder.decode()
      if (pending) controller.enqueue(encoder.encode(rewritePlaylistLine(pending, target, requestUrl)))
    },
  }))
}

const fetchWithSafeRedirects = async (target: URL, headers: Headers, method: 'GET' | 'HEAD') => {
  let current = target
  for (let redirect = 0; redirect <= 5; redirect += 1) {
    const response = await fetch(current, { method, headers, redirect: 'manual' })
    if (![301, 302, 303, 307, 308].includes(response.status)) return { response, finalTarget: current }
    const location = response.headers.get('Location')
    if (!location) return { response, finalTarget: current }
    current = validateTarget(new URL(location, current).toString())
  }
  throw new Error('Çok fazla yönlendirme yapıldı.')
}

export default {
  async fetch(request: Request): Promise<Response> {
    const requestUrl = new URL(request.url)
    const origin = request.headers.get('Origin') || ''
    if (request.method === 'OPTIONS') {
      if (!isAllowedOrigin(origin)) return new Response(null, { status: 403 })
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }
    if (!isAllowedOrigin(origin)) return Response.json({ error: 'İzin verilmeyen uygulama kaynağı.' }, { status: 403 })
    if (!['GET', 'HEAD'].includes(request.method)) return Response.json({ error: 'Yöntem desteklenmiyor.' }, { status: 405, headers: corsHeaders(origin) })
    if (!requestUrl.pathname.startsWith('/v1/')) return Response.json({ service: 'Saltatrix TV media gateway', status: 'ok' }, { headers: corsHeaders(origin) })

    try {
      const target = validateTarget(decodeTarget(requestUrl.pathname.slice(4)))
      const upstreamHeaders = new Headers({ Accept: request.headers.get('Accept') || '*/*', 'User-Agent': 'SaltatrixTV/1.4' })
      const range = request.headers.get('Range')
      if (range) upstreamHeaders.set('Range', range)
      const { response, finalTarget } = await fetchWithSafeRedirects(target, upstreamHeaders, request.method as 'GET' | 'HEAD')
      const headers = new Headers(response.headers)
      Object.entries(corsHeaders(origin)).forEach(([key, value]) => headers.set(key, value))
      headers.delete('Set-Cookie')
      const contentType = headers.get('Content-Type') || ''
      const playlist = /mpegurl/i.test(contentType) || /\.m3u8(?:$|\?)/i.test(finalTarget.toString())
      if (playlist && response.body && request.method === 'GET') {
        headers.delete('Content-Length'); headers.delete('Content-Encoding')
        headers.set('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8')
        return new Response(rewritePlaylist(response.body, finalTarget, requestUrl), { status: response.status, headers })
      }
      return new Response(response.body, { status: response.status, headers })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Proxy isteği başarısız oldu.'
      console.error(JSON.stringify({ message: 'proxy request failed', error: message, path: requestUrl.pathname.slice(0, 16) }))
      return Response.json({ error: message }, { status: 400, headers: corsHeaders(origin) })
    }
  },
} satisfies ExportedHandler<Env>
