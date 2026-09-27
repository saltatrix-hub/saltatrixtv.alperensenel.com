import type { CSSProperties, MouseEvent } from 'react'
import { Clock3, Heart, Play, Star } from 'lucide-react'
import type { Channel } from '../types'

interface Props {
  channel: Channel
  index: number
  favorite: boolean
  onPlay: (channel: Channel) => void
  onFavorite: (id: string) => void
  watchPercent?: number
}

const typeLabel = (channel: Channel) => channel.type === 'live' ? 'Canlı TV' : channel.type === 'movie' ? 'Film' : 'Dizi'

export function ChannelCard({ channel, index, favorite, onPlay, onFavorite, watchPercent }: Props) {
  const hasArtwork = Boolean(channel.logo && channel.type !== 'live')
  const description = channel.description || `${channel.platform || channel.category} seçkisindeki ${typeLabel(channel).toLocaleLowerCase('tr')} içeriği.`
  const stopFavorite = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onFavorite(channel.id)
  }

  return <article
    className="channel-card"
    style={{ '--delay': `${Math.min(index * 35, 400)}ms` } as CSSProperties}
    onClick={() => onPlay(channel)}
  >
    <div className={`channel-visual visual-${index % 6}${hasArtwork ? ' is-artwork' : ''}`}>
      <span className="logo-fallback">{channel.name.slice(0, 2).toUpperCase()}</span>
      {channel.logo && <img src={channel.logo} alt={`${channel.name} görseli`} loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = 'none' }}/>} 
      <div className="card-overlay">
        <button aria-label={`${channel.name} oynat`}><Play fill="currentColor"/></button>
        <div className="hover-meta">
          <div><span>{typeLabel(channel)}</span>{channel.rating && <b><Star fill="currentColor"/> {channel.rating}</b>}</div>
          <p>{description}</p>
          <small>{[channel.genre, channel.platform || channel.category, channel.year].filter(Boolean).join(' · ')}</small>
        </div>
      </div>
      <b className="quality">{channel.quality || 'HD'}</b>
      {channel.type === 'live' && <em><i/> CANLI</em>}
    </div>
    <div className="channel-info">
      <div>
        <small>{channel.platform || channel.category}</small>
        <h3>{channel.name}</h3>
        <p><Clock3/> {[channel.genre || typeLabel(channel), channel.rating ? `IMDb ${channel.rating}` : ''].filter(Boolean).join(' · ')}</p>
      </div>
      <button className={favorite ? 'fav active' : 'fav'} onClick={stopFavorite} aria-label="Favoriye ekle"><Heart fill={favorite ? 'currentColor' : 'none'}/></button>
    </div>
    {(watchPercent || channel.progress) ? <div className="mini-progress"><i style={{ width: `${watchPercent || channel.progress}%` }}/></div> : null}
  </article>
}
