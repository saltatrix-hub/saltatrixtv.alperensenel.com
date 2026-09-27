import type { Channel, ContentType, XtreamCredentials } from '../types'

type XtreamStream = { stream_id: number; series_id?: number; name: string; stream_icon?: string; epg_channel_id?: string; category_id?: string; container_extension?: string }
type XtreamCategory = { category_id: string; category_name: string }

const cleanServer = (value: string) => value.trim().replace(/\/+$/, '')

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Sunucu ${response.status} yanıtı verdi.`)
  return response.json() as Promise<T>
}

export async function loadXtream(credentials: XtreamCredentials): Promise<Channel[]> {
  const server = cleanServer(credentials.server)
  const auth = `username=${encodeURIComponent(credentials.username)}&password=${encodeURIComponent(credentials.password)}`
  const api = `${server}/player_api.php?${auth}`
  const account = await getJson<{ user_info?: { auth?: number | string } }>(api)
  if (!account.user_info || Number(account.user_info.auth) !== 1) throw new Error('Kullanıcı adı veya parola geçersiz.')

  const specs: Array<{ type: ContentType; action: string; categories: string; path: string }> = [
    { type: 'live', action: 'get_live_streams', categories: 'get_live_categories', path: 'live' },
    { type: 'movie', action: 'get_vod_streams', categories: 'get_vod_categories', path: 'movie' },
    { type: 'series', action: 'get_series', categories: 'get_series_categories', path: 'series' },
  ]
  const results = await Promise.all(specs.map(async (spec) => {
    const [streams, cats] = await Promise.all([
      getJson<XtreamStream[]>(`${api}&action=${spec.action}`),
      getJson<XtreamCategory[]>(`${api}&action=${spec.categories}`),
    ])
    const categoryMap = new Map(cats.map((cat) => [String(cat.category_id), cat.category_name]))
    return streams.map((item): Channel => {
      const id = item.stream_id ?? item.series_id ?? 0
      const ext = item.container_extension || (spec.type === 'live' ? 'm3u8' : 'mp4')
      const url = spec.type === 'series' ? '' : `${server}/${spec.path}/${credentials.username}/${credentials.password}/${id}.${ext}`
      return { id: `xc-${spec.type}-${id}`, name: item.name, logo: item.stream_icon, tvgId: item.epg_channel_id, category: categoryMap.get(String(item.category_id)) || 'Diğer', type: spec.type, url, quality: /4k|uhd/i.test(item.name) ? '4K' : /fhd|1080/i.test(item.name) ? 'FHD' : 'HD' }
    })
  }))
  return results.flat()
}
