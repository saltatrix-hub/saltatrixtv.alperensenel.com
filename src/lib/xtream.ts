import type { Channel, ContentType, XtreamCredentials } from '../types'

type XtreamStream = {
  stream_id?: number
  series_id?: number
  name: string
  stream_icon?: string
  cover?: string
  cover_big?: string
  movie_image?: string
  backdrop_path?: string | string[]
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
  info?: XtreamInfo
}
type XtreamCategory = { category_id: string; category_name: string }
type XtreamInfo = {
  cover?: string
  cover_big?: string
  movie_image?: string
  backdrop_path?: string | string[]
  plot?: string
  genre?: string
  rating?: string | number
  duration?: string
}
type XtreamEpisode = {
  id?: string | number
  stream_id?: string | number
  episode_num?: number
  season?: number
  title?: string
  container_extension?: string
  info?: XtreamInfo
}

type SeriesResponse = {
  info?: XtreamInfo
  episodes?: Record<string, XtreamEpisode[] | Record<string, XtreamEpisode>> | XtreamEpisode[]
}

const cleanServer = (value: string) => value.trim().replace(/\/+$/, '')

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Sunucu ${response.status} yanıtı verdi.`)
  return response.json() as Promise<T>
}

const firstImage = (...values: Array<string | string[] | undefined>) => {
  for (const value of values) {
    if (Array.isArray(value)) {
      const image = value.find(Boolean)
      if (image) return image
    } else if (value) return value
  }
  return undefined
}

const seriesIdOf = (channel: Channel) => channel.xtreamId ?? channel.id.match(/^xc-series-(.+)$/)?.[1]

const decodePathPart = (value: string) => {
  try { return decodeURIComponent(value) }
  catch { return value }
}

export function inferXtreamCredentials(channels: Channel[]): Omit<XtreamCredentials, 'name'> | null {
  const playable = channels.find((channel) => channel.url && /^https?:\/\//i.test(channel.url) && /\/(?:live|movie)\//i.test(channel.url))
  const match = playable?.url.match(/^(https?:\/\/.+?)\/(?:live|movie)\/([^/]+)\/([^/]+)\/[^/]+$/i)
  if (!match) return null
  return { server: match[1], username: decodePathPart(match[2]), password: decodePathPart(match[3]) }
}

export function repairXtreamSeriesMetadata(channels: Channel[]): Channel[] {
  const ready = channels.find((channel) => channel.type === 'series' && channel.seriesInfoUrl && channel.seriesBaseUrl)
  let apiBase = ready?.seriesInfoUrl?.split('&action=get_series_info')[0]
  let seriesBase = ready?.seriesBaseUrl

  if (!apiBase || !seriesBase) {
    const credentials = inferXtreamCredentials(channels)
    if (credentials) {
      apiBase = `${credentials.server}/player_api.php?username=${encodeURIComponent(credentials.username)}&password=${encodeURIComponent(credentials.password)}`
      seriesBase = `${credentials.server}/series/${encodeURIComponent(credentials.username)}/${encodeURIComponent(credentials.password)}`
    }
  }

  if (!apiBase || !seriesBase) return channels
  return channels.map((channel) => {
    if (channel.type !== 'series') return channel
    const xtreamId = seriesIdOf(channel)
    if (xtreamId === undefined) return channel
    return {
      ...channel,
      xtreamId,
      seriesInfoUrl: channel.seriesInfoUrl || `${apiBase}&action=get_series_info&series_id=${encodeURIComponent(String(xtreamId))}`,
      seriesBaseUrl: channel.seriesBaseUrl || seriesBase,
    }
  })
}

export async function loadXtream(credentials: XtreamCredentials): Promise<Channel[]> {
  const server = cleanServer(credentials.server)
  const auth = `username=${encodeURIComponent(credentials.username)}&password=${encodeURIComponent(credentials.password)}`
  const pathAuth = `${encodeURIComponent(credentials.username)}/${encodeURIComponent(credentials.password)}`
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
      const id = spec.type === 'series' ? (item.series_id ?? item.stream_id ?? 0) : (item.stream_id ?? item.series_id ?? 0)
      const ext = item.container_extension || (spec.type === 'live' ? 'm3u8' : 'mp4')
      const url = spec.type === 'series' ? '' : `${server}/${spec.path}/${pathAuth}/${id}.${ext}`
      const platform = categoryMap.get(String(item.category_id)) || 'Diğer'
      return {
        id: `xc-${spec.type}-${id}`,
        name: item.name,
        logo: firstImage(item.cover, item.cover_big, item.movie_image, item.stream_icon, item.backdrop_path, item.info?.cover, item.info?.movie_image),
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
        xtreamId: id,
        seriesInfoUrl: spec.type === 'series' ? `${api}&action=get_series_info&series_id=${id}` : undefined,
        seriesBaseUrl: spec.type === 'series' ? `${server}/series/${pathAuth}` : undefined,
        quality: /4k|uhd/i.test(item.name) ? '4K' : /fhd|1080/i.test(item.name) ? 'FHD' : 'HD',
      }
    })
  }))
  return results.flat()
}

export async function fetchSeriesMetadata(series: Channel): Promise<Partial<Channel>> {
  if (!series.seriesInfoUrl) return {}
  const response = await getJson<SeriesResponse>(series.seriesInfoUrl)
  return {
    logo: firstImage(response.info?.cover, response.info?.cover_big, response.info?.movie_image, response.info?.backdrop_path) || series.logo,
    description: response.info?.plot || series.description,
    genre: response.info?.genre || series.genre,
    rating: response.info?.rating ? String(response.info.rating) : series.rating,
    duration: response.info?.duration || series.duration,
  }
}

export async function resolveSeriesEpisode(series: Channel): Promise<Channel> {
  if (!series.seriesInfoUrl || !series.seriesBaseUrl) throw new Error('Bu dizi için bölüm bilgisi bulunamadı.')
  const response = await getJson<SeriesResponse>(series.seriesInfoUrl)
  const rawEpisodes = response.episodes || {}
  const groupedEpisodes: Record<string, XtreamEpisode[]> = Array.isArray(rawEpisodes)
    ? rawEpisodes.reduce<Record<string, XtreamEpisode[]>>((groups, episode) => {
      const season = String(episode.season || 1)
      ;(groups[season] ||= []).push(episode)
      return groups
    }, {})
    : Object.fromEntries(Object.entries(rawEpisodes).map(([season, episodes]) => [season, Array.isArray(episodes) ? episodes : Object.values(episodes || {})]))
  const seasons = Object.entries(groupedEpisodes).sort(([a], [b]) => Number(a) - Number(b))
  const firstSeason = seasons.find(([, episodes]) => episodes.length > 0)
  if (!firstSeason) throw new Error('Bu diziye ait oynatılabilir bölüm bulunamadı.')
  const [seasonNumber, episodes] = firstSeason
  const episode = [...episodes].sort((a, b) => Number(a.episode_num || 0) - Number(b.episode_num || 0))[0]
  const episodeId = episode.id ?? episode.stream_id
  if (episodeId === undefined) throw new Error('Bölüm oynatma adresi bulunamadı.')
  const extension = episode.container_extension || 'mp4'
  const episodeLabel = `S${String(seasonNumber).padStart(2, '0')}E${String(episode.episode_num || 1).padStart(2, '0')}`

  return {
    ...series,
    id: `${series.id}-episode-${episodeId}`,
    parentId: series.id,
    name: `${series.name} · ${episodeLabel}`,
    url: `${series.seriesBaseUrl}/${episodeId}.${extension}`,
    logo: firstImage(episode.info?.movie_image, episode.info?.cover, response.info?.cover, response.info?.cover_big, response.info?.movie_image, response.info?.backdrop_path) || series.logo,
    description: episode.info?.plot || response.info?.plot || series.description,
    genre: episode.info?.genre || response.info?.genre || series.genre,
    rating: episode.info?.rating ? String(episode.info.rating) : response.info?.rating ? String(response.info.rating) : series.rating,
    duration: episode.info?.duration || response.info?.duration || series.duration,
    episodeLabel,
  }
}
