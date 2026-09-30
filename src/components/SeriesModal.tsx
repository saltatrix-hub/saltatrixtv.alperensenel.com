import { useEffect, useMemo, useState } from 'react'
import { Clock3, Film, Play, Star, X } from 'lucide-react'
import { loadSeriesEpisodes } from '../lib/xtream'
import { providerUrl } from '../lib/proxy'
import type { Channel, SeriesSeason, WatchProgress } from '../types'

interface Props {
  series: Channel
  resume?: WatchProgress
  onClose: () => void
  onPlay: (episode: Channel) => void
  onLoaded: (episodes: Channel[]) => void
}

export function SeriesModal({ series, resume, onClose, onPlay, onLoaded }: Props) {
  const [seasons, setSeasons] = useState<SeriesSeason[]>([])
  const [activeSeason, setActiveSeason] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(''); setSeasons([])
    loadSeriesEpisodes(series).then((loaded) => {
      if (cancelled) return
      setSeasons(loaded)
      setActiveSeason(loaded[0]?.number || '')
      onLoaded(loaded.flatMap((season) => season.episodes))
    }).catch((reason) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : 'Bölümler alınamadı.')
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [series, onLoaded])

  const episodes = useMemo(() => seasons.find((season) => season.number === activeSeason)?.episodes || [], [seasons, activeSeason])
  const artwork = providerUrl(series.logo)

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="series-modal" role="dialog" aria-modal="true" aria-label={`${series.name} bölümleri`}>
      <div className="series-hero">
        {artwork && <img src={artwork} alt="" crossOrigin="anonymous" referrerPolicy="no-referrer"/>}
        <div className="series-hero-shade"/>
        <button className="icon-btn series-close" onClick={onClose} aria-label="Kapat"><X/></button>
        <div className="series-summary">
          <span>{series.platform || series.category}</span>
          <h2>{series.name}</h2>
          <div>{series.rating && <b><Star fill="currentColor"/> IMDb {series.rating}</b>}{series.genre && <b><Film/> {series.genre}</b>}</div>
          {series.description && <p>{series.description}</p>}
          {resume && <button className="primary-btn resume-series" onClick={() => onPlay(resume.channel)}><Play fill="currentColor"/> {resume.channel.episodeLabel || 'Kaldığın bölüm'} · devam et</button>}
        </div>
      </div>
      <div className="series-body">
        {loading && <div className="series-status"><span className="spinner"/> Bölümler hazırlanıyor…</div>}
        {error && <div className="form-error">{error}</div>}
        {!loading && !error && <>
          <div className="season-tabs">{seasons.map((season) => <button key={season.number} className={activeSeason === season.number ? 'active' : ''} onClick={() => setActiveSeason(season.number)}>{season.number}. Sezon <small>{season.episodes.length} bölüm</small></button>)}</div>
          <div className="episode-list">{episodes.map((episode) => <button key={episode.id} className="episode-card" onClick={() => onPlay(episode)}>
            <span className="episode-art">{providerUrl(episode.logo) ? <img src={providerUrl(episode.logo)} alt="" crossOrigin="anonymous" referrerPolicy="no-referrer"/> : <Film/>}<i><Play fill="currentColor"/></i></span>
            <span><b>{episode.episodeLabel}</b><strong>{episode.name.replace(`${series.name} · `, '')}</strong><small><Clock3/> {episode.duration || 'Süre bilgisi yok'}</small></span>
          </button>)}</div>
        </>}
      </div>
    </div>
  </div>
}
