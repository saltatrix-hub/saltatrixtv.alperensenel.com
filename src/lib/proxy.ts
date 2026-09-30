const configuredProxy = ((import.meta.env?.VITE_IPTV_PROXY_URL as string | undefined) || 'https://saltatrix-tv-media.aurelian-studio.workers.dev').replace(/\/+$/, '')

const isDesktop = () => typeof window !== 'undefined' && Boolean(window.saltatrixDesktop)

const encodeTarget = (value: string) => {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export const providerUrl = (url?: string) => {
  if (!url || !configuredProxy || isDesktop() || !/^https?:\/\//i.test(url)) return url || ''
  return `${configuredProxy}/v1/${encodeTarget(url)}`
}

export const fetchProvider = (url: string, init?: RequestInit) => fetch(providerUrl(url), init)
