import type { Channel, ContentType } from '../types'

const attr = (line: string, key: string) => {
  const match = line.match(new RegExp(`${key}="([^"]*)"`, 'i'))
  return match?.[1]?.trim() || ''
}

const inferType = (category: string, url: string): ContentType => {
  const text = `${category} ${url}`.toLocaleLowerCase('tr')
  if (/movie|film|sinema|vod/.test(text)) return 'movie'
  if (/series|dizi|season|episode/.test(text)) return 'series'
  return 'live'
}

export function parseM3U(text: string): Channel[] {
  const lines = text.replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean)
  const channels: Channel[] = []
  for (let i = 0; i < lines.length; i += 1) {
    if (!lines[i].startsWith('#EXTINF')) continue
    const meta = lines[i]
    let url = ''
    for (let j = i + 1; j < lines.length && !lines[j].startsWith('#EXTINF'); j += 1) {
      if (!lines[j].startsWith('#')) { url = lines[j]; i = j; break }
    }
    if (!url) continue
    const comma = meta.lastIndexOf(',')
    const name = (comma >= 0 ? meta.slice(comma + 1) : attr(meta, 'tvg-name')) || 'İsimsiz Kanal'
    const category = attr(meta, 'group-title') || 'Diğer'
    channels.push({
      id: `m3u-${channels.length}-${name}`,
      name,
      url,
      logo: attr(meta, 'tvg-logo'),
      tvgId: attr(meta, 'tvg-id'),
      category,
      type: inferType(category, url),
      quality: /4k|uhd/i.test(name) ? '4K' : /fhd|1080/i.test(name) ? 'FHD' : 'HD',
    })
  }
  return channels
}
