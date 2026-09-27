import type { Channel } from '../types'

type CatalogChannel = { id: string; name: string; alt_names?: string[] }
type CatalogLogo = { channel: string; in_use?: boolean; tags?: string[]; width?: number; height?: number; url: string }

const API = 'https://iptv-org.github.io/api'
let catalogPromise: Promise<Map<string, string>> | null = null

const normalize = (value = '') => value
  .toLocaleLowerCase('tr')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ı/g, 'i')
  .replace(/\b(4k|uhd|fhd|full\s*hd|hd|sd|canli|live|tr)\b/g, '')
  .replace(/[^a-z0-9]+/g, '')

async function buildCatalog() {
  const [channelResponse, logoResponse] = await Promise.all([
    fetch(`${API}/channels.json`),
    fetch(`${API}/logos.json`),
  ])
  if (!channelResponse.ok || !logoResponse.ok) throw new Error('Logo kataloğu alınamadı.')
  const channels = await channelResponse.json() as CatalogChannel[]
  const logos = await logoResponse.json() as CatalogLogo[]

  const bestLogo = new Map<string, CatalogLogo>()
  const score = (logo: CatalogLogo) => (logo.in_use ? 100 : 0) + (logo.tags?.includes('horizontal') ? 20 : 0) + Math.min(logo.width || 0, 2000) / 100
  for (const logo of logos) {
    if (!logo.url) continue
    const current = bestLogo.get(logo.channel)
    if (!current || score(logo) > score(current)) bestLogo.set(logo.channel, logo)
  }

  const index = new Map<string, string>()
  for (const channel of channels) {
    const logo = bestLogo.get(channel.id)?.url
    if (!logo) continue
    const names = [channel.id, channel.id.split('.')[0], channel.name, ...(channel.alt_names || [])]
    for (const name of names) {
      const key = normalize(name)
      if (key && !index.has(key)) index.set(key, logo)
    }
  }
  return index
}

export async function enrichChannelLogos(channels: Channel[]): Promise<Channel[]> {
  const missing = channels.some((channel) => !channel.logo)
  if (!missing) return channels
  catalogPromise ||= buildCatalog()
  const catalog = await catalogPromise
  return channels.map((channel) => {
    if (channel.logo) return channel
    const logo = catalog.get(normalize(channel.tvgId)) || catalog.get(normalize(channel.name))
    return logo ? { ...channel, logo } : channel
  })
}
