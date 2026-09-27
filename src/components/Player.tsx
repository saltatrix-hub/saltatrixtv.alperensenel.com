import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { Cast, Maximize, Pause, Play, SkipForward, Volume2, VolumeX, X } from 'lucide-react'
import type { Channel } from '../types'

interface Props { channel: Channel; onClose: () => void; onNext: () => void }

export function Player({ channel, onClose, onNext }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const video = videoRef.current
    if (!video || !channel.url) return
    setError('')
    let hls: Hls | undefined
    if (channel.url.includes('.m3u8') && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true })
      hls.loadSource(channel.url)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => undefined))
      hls.on(Hls.Events.ERROR, (_, data) => { if (data.fatal) setError('Yayın şu anda oynatılamıyor.') })
    } else {
      video.src = channel.url
      video.play().catch(() => undefined)
    }
    return () => { hls?.destroy(); video.removeAttribute('src'); video.load() }
  }, [channel])

  const toggle = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) video.play().catch(() => setError('Oynatma başlatılamadı.'))
    else video.pause()
  }

  return <div className="player-panel">
    <div className="player-topline"><div><span className="live-dot" /> CANLI YAYIN</div><button className="icon-btn" onClick={onClose} aria-label="Oynatıcıyı kapat"><X size={19}/></button></div>
    <div className="video-wrap">
      <video ref={videoRef} playsInline onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onClick={toggle} />
      <div className="video-ambient" />
      {error && <div className="video-error">{error}<small>Bağlantı veya CORS ayarlarını kontrol edin.</small></div>}
      <div className="video-controls">
        <button onClick={toggle}>{playing ? <Pause fill="currentColor"/> : <Play fill="currentColor"/>}</button>
        <button onClick={onNext}><SkipForward fill="currentColor"/></button>
        <button onClick={() => { if (videoRef.current) videoRef.current.muted = !muted; setMuted(!muted) }}>{muted ? <VolumeX/> : <Volume2/>}</button>
        <div className="control-spacer" />
        <button><Cast/></button>
        <button onClick={() => videoRef.current?.requestFullscreen()}><Maximize/></button>
      </div>
    </div>
    <div className="now-playing">
      <div className="channel-avatar"><span>{channel.name.slice(0, 2).toUpperCase()}</span>{channel.logo && <img src={channel.logo} alt={`${channel.name} logosu`} referrerPolicy="no-referrer" onError={(e) => e.currentTarget.style.display = 'none'}/>}</div>
      <div><span>{channel.category}</span><h3>{channel.name}</h3><p>{channel.now || 'Canlı yayın'}</p></div>
      <strong>{channel.quality || 'HD'}</strong>
    </div>
    <div className="program-bar"><div><span>Şimdi</span><b>{channel.now || 'Canlı yayın'}</b></div><small>{channel.progress || 45}%</small><div className="progress"><i style={{ width: `${channel.progress || 45}%` }}/></div><div><span>Sırada</span><b>{channel.next || 'Program bilgisi yok'}</b></div></div>
  </div>
}
