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
}

export interface XtreamCredentials {
  name: string
  server: string
  username: string
  password: string
}
