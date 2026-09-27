import type { Channel, ContentType, XtreamCredentials } from '../types'

type XtreamStream = {
  stream_id: number
  series_id?: number
  name: string
  stream_icon?: string
  cover?: string
  epg_channel_id?: string
  category_id?: string
  container_extension?: string
  plot?: string
  genre?: string
  rating?: string | number
  releaseDate?: string
  release_date?: string
  year?: string
  duration?: string
}
type XtreamCategory = { category_id: string; category_name: string }
type XtreamEpisode = {
  id: string | number
  episode_num?: number
  title?: string
  container_extension?: string
  info?: { movie_image?: string; plot?: string; genre?: string; rating?: string | number; duration?: string }
}

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
      const platform = categoryMap.get(String(item.category_id)) || 'Diğer'
      return {
        id: `xc-${spec.type}-${id}`,
        name: item.name,
        logo: item.cover || item.stream_icon,
        tvgId: item.epg_channel_id,
        category: platform,
        platform,
        type: spec.type,
        url,
        description: item.plot,
        genre: item.genre,
        rating: item.rating ? String(item.rating) : undefined,
        year: item.year || item.releaseDate || item.release_date,
        duration: item.duration,
        seriesInfoUrl: spec.type === 'series' ? `${api}&action=get_series_info&series_id=${id}` : undefined,
        seriesBaseUrl: spec.type === 'series' ? `${server}/series/${credentials.username}/${credentials.password}` : undefined,
        quality: /4k|uhd/i.test(item.name) ? '4K' : /fhd|1080/i.test(item.name) ? 'FHD' : 'HD',
      }
    })
  }))
  return results.flat()
}

export async function resolveSeriesEpisode(series: Channel): Promise<Channel> {
  if (!series.seriesInfoUrl || !series.seriesBaseUrl) throw new Error('Bu dizi için bölüm bilgisi bulunamadı.')
  const response = await getJson<{ episodes?: Record<string, XtreamEpisode[]> }>(series.seriesInfoUrl)
  const seasons = Object.entries(response.episodes || {}).sort(([a], [b]) => Number(a) - Number(b))
  const firstSeason = seasons.find(([, episodes]) => episodes.length > 0)
  if (!firstSeason) throw new Error('Bu diziye ait oynatılabilir bölüm bulunamadı.')
  const [seasonNumber, episodes] = firstSeason
  const episode = [...episodes].sort((a, b) => Number(a.episode_num || 0) - Number(b.episode_num || 0))[0]
  const extension = episode.container_extension || 'mp4'
  const episodeLabel = `S${String(seasonNumber).padStart(2, '0')}E${String(episode.episode_num || 1).padStart(2, '0')}`

  return {
    ...series,
    id: `${series.id}-episode-${episode.id}`,
    parentId: series.id,
    name: `${series.name} · ${episodeLabel}`,
    url: `${series.seriesBaseUrl}/${episode.id}.${extension}`,
    logo: episode.info?.movie_image || series.logo,
    description: episode.info?.plot || series.description,
    genre: episode.info?.genre || series.genre,
    rating: episode.info?.rating ? String(episode.info.rating) : series.rating,
    duration: episode.info?.duration || series.duration,
    episodeLabel,
  }
}
