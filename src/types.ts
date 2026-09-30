export type ContentType = 'live' | 'movie' | 'series'

export interface Channel {
  id: string
  name: string
  url: string
  logo?: string
  tvgId?: string
  category: string
  type: ContentType
  now?: string
  next?: string
  progress?: number
  language?: string
  quality?: string
  description?: string
  genre?: string
  rating?: string
  platform?: string
  year?: string
  duration?: string
  xtreamId?: string | number
  seriesInfoUrl?: string
  seriesBaseUrl?: string
  parentId?: string
  episodeLabel?: string
}

export interface WatchProgress {
  channel: Channel
  position: number
  duration: number
  updatedAt: number
}

export interface SeriesSeason {
  number: string
  episodes: Channel[]
}

export interface XtreamCredentials {
  name: string
  server: string
  username: string
  password: string
}
