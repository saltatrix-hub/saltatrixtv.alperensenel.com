import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { Cast, Maximize, Minimize, Pause, Play, RotateCcw, RotateCw, SkipForward, Volume2, VolumeX, X } from 'lucide-react'
import type { Channel } from '../types'

interface Props {
  channel: Channel
  resumeAt: number
  fullscreen: boolean
  onFullscreenChange: (enabled: boolean) => void
  onClose: () => void
  onNext: () => void
  onProgress: (channel: Channel, position: number, duration: number) => void
}

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor(seconds % 3600 / 60)
  const rest = Math.floor(seconds % 60)
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}` : `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

export function Player({ channel, resumeAt, fullscreen, onFullscreenChange, onClose, onNext, onProgress }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const lastSavedRef = useRef(0)
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [playing, setPlaying] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [error, setError] = useState('')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const isLive = channel.type === 'live'

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  useEffect(() => () => { if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current) }, [])
  useEffect(() => { panelRef.current?.focus() }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !channel.url) return
    setError(''); setCurrentTime(0); setDuration(0); lastSavedRef.current = 0
    video.muted = muted
    video.volume = volume
    let hls: Hls | undefined
    if (channel.url.includes('.m3u8') && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: isLive })
      hls.loadSource(channel.url)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (hls && hls.audioTracks.length > 0 && hls.audioTrack < 0) hls.audioTrack = 0
        video.muted = muted
        video.volume = volume
        video.play().catch(() => undefined)
      })
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
        if (hls && hls.audioTracks.length > 0 && hls.audioTrack < 0) hls.audioTrack = 0
      })
      hls.on(Hls.Events.ERROR, (_, data) => { if (data.fatal) setError('Yayın şu anda oynatılamıyor.') })
    } else {
      video.src = channel.url
      video.play().catch(() => undefined)
    }
    return () => {
      if (!isLive && Number.isFinite(video.duration) && video.currentTime > 0) onProgress(channel, video.currentTime, video.duration)
      hls?.destroy(); video.removeAttribute('src'); video.load()
    }
  }, [channel, isLive, onProgress])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = muted
    video.volume = volume
  }, [muted, volume])

  const loaded = () => {
    const video = videoRef.current
    if (!video) return
    setDuration(Number.isFinite(video.duration) ? video.duration : 0)
    if (!isLive && resumeAt > 5 && resumeAt < video.duration - 10) video.currentTime = resumeAt
  }
  const track = () => {
    const video = videoRef.current
    if (!video) return
    setCurrentTime(video.currentTime)
    if (Number.isFinite(video.duration)) setDuration(video.duration)
    if (!isLive && video.currentTime - lastSavedRef.current >= 3) {
      lastSavedRef.current = video.currentTime
      onProgress(channel, video.currentTime, video.duration)
    }
  }
  const toggle = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) video.play().catch(() => setError('Oynatma başlatılamadı.'))
    else video.pause()
  }
  const revealControls = () => {
    setControlsVisible(true)
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    controlsTimerRef.current = setTimeout(() => {
      if (fullscreen && videoRef.current && !videoRef.current.paused) setControlsVisible(false)
    }, 5000)
  }
  const seekBy = (seconds: number) => {
    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration)) return
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds))
    revealControls()
  }
  const keyboardControls = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); seekBy(-10) }
    else if (event.key === 'ArrowRight') { event.preventDefault(); seekBy(10) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setMuted(false); setVolume((value) => Math.min(1, value + .1)); revealControls() }
    else if (event.key === 'ArrowDown') { event.preventDefault(); setVolume((value) => Math.max(0, value - .1)); revealControls() }
    else if (event.key === ' ' || event.key.toLowerCase() === 'k') { event.preventDefault(); toggle(); revealControls() }
    else if (event.key.toLowerCase() === 'm') { setMuted((value) => !value); revealControls() }
  }
  const percent = duration > 0 ? Math.min(100, currentTime / duration * 100) : channel.progress || 45
  const toggleFullscreen = () => {
    const next = !fullscreen
    if (!next) videoRef.current?.pause()
    onFullscreenChange(next)
    setControlsVisible(true)
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
  }

  return <div ref={panelRef} className={`player-panel ${fullscreen ? 'fullscreen' : 'mini'} ${controlsVisible ? '' : 'controls-hidden'}`} role="dialog" aria-modal="true" aria-label={`${channel.name} oynatılıyor`} tabIndex={-1} onMouseMove={revealControls} onMouseDown={revealControls} onTouchStart={revealControls} onKeyDown={keyboardControls}>
    <div className="player-topline"><div><span className="live-dot"/> {isLive ? 'CANLI YAYIN' : channel.type === 'series' ? 'DİZİ OYNATILIYOR' : 'FİLM OYNATILIYOR'}</div><button className="icon-btn" onClick={onClose} aria-label="Oynatıcıyı kapat"><X size={19}/></button></div>
    <div className="video-wrap">
      <video ref={videoRef} playsInline onLoadedMetadata={loaded} onTimeUpdate={track} onEnded={() => onProgress(channel, duration, duration)} onPlay={() => { setPlaying(true); revealControls() }} onPause={() => { setPlaying(false); setControlsVisible(true); if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current) }} onClick={() => { toggle(); revealControls() }}/>
      <div className="video-ambient"/>
      {error && <div className="video-error">{error}<small>Bağlantı veya yayın sağlayıcı ayarlarını kontrol edin.</small></div>}
      <div className="video-controls">
        <button onClick={toggle}>{playing ? <Pause fill="currentColor"/> : <Play fill="currentColor"/>}</button>
        {!isLive && <button onClick={() => seekBy(-10)} aria-label="10 saniye geri"><RotateCcw/><small>10</small></button>}
        {!isLive && <button onClick={() => seekBy(10)} aria-label="10 saniye ileri"><RotateCw/><small>10</small></button>}
        <button onClick={onNext}><SkipForward fill="currentColor"/></button>
        <button onClick={() => setMuted((value) => !value)} aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}>{muted || volume === 0 ? <VolumeX/> : <Volume2/>}</button>
        <input className="volume-slider" aria-label="Ses seviyesi" type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={(event) => { const next = Number(event.target.value); setVolume(next); setMuted(next === 0) }}/>
        {!isLive && <span className="player-time">{formatTime(currentTime)} / {formatTime(duration)}</span>}
        <div className="control-spacer"/>
        <button><Cast/></button>
        <button onClick={toggleFullscreen} aria-label={fullscreen ? 'Mini oynatıcıya geç' : 'Tam ekrana geç'}>{fullscreen ? <Minimize/> : <Maximize/>}</button>
      </div>
    </div>
    <div className="now-playing">
      <div className="channel-avatar"><span>{channel.name.slice(0, 2).toUpperCase()}</span>{channel.logo && <img src={channel.logo} alt={`${channel.name} görseli`} referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = 'none' }}/>}</div>
      <div><span>{channel.platform || channel.category}</span><h3>{channel.name}</h3><p>{channel.description || channel.now || (isLive ? 'Canlı yayın' : channel.genre || 'Saltatrix TV')}</p></div>
      <strong>{channel.quality || 'HD'}</strong>
    </div>
    <div className="program-bar"><div><span>{isLive ? 'Şimdi' : formatTime(currentTime)}</span><b>{isLive ? channel.now || 'Canlı yayın' : channel.episodeLabel || channel.genre || 'İzleniyor'}</b></div><small>{isLive ? `${Math.round(percent)}%` : formatTime(duration)}</small>{isLive ? <div className="progress"><i style={{ width: `${percent}%` }}/></div> : <input className="timeline-slider" aria-label="Oynatma konumu" type="range" min="0" max={duration || 0} step="1" value={Math.min(currentTime, duration || 0)} disabled={!duration} onChange={(event) => { if (videoRef.current) videoRef.current.currentTime = Number(event.target.value); revealControls() }}/>}<div><span>{isLive ? 'Sırada' : 'Kalan'}</span><b>{isLive ? channel.next || 'Program bilgisi yok' : formatTime(Math.max(0, duration - currentTime))}</b></div></div>
  </div>
}
