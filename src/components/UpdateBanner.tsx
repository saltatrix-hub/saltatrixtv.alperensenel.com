import { useEffect, useState } from 'react'
import { CheckCircle2, Download, RefreshCw, X } from 'lucide-react'

export type UpdateState = {
  status: 'idle' | 'checking' | 'current' | 'available' | 'downloading' | 'ready' | 'error' | 'development'
  version?: string
  percent?: number
  message?: string
}

export function UpdateBanner() {
  const updater = window.saltatrixDesktop?.updater
  const [state, setState] = useState<UpdateState>({ status: 'idle' })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!updater) return
    updater.getState().then(setState).catch(() => undefined)
    return updater.onStatus((next) => { setState(next); setDismissed(false) })
  }, [updater])

  if (!updater || dismissed || ['idle', 'checking', 'current', 'development'].includes(state.status)) return null

  const ready = state.status === 'ready'
  const downloading = state.status === 'available' || state.status === 'downloading'

  return <aside className={`update-banner ${ready ? 'ready' : ''}`} aria-live="polite">
    <div className="update-icon">{ready ? <CheckCircle2/> : downloading ? <Download/> : <RefreshCw/>}</div>
    <div className="update-copy">
      <b>{ready ? 'Saltatrix TV güncellendi' : downloading ? `Yeni sürüm indiriliyor${state.version ? ` · v${state.version}` : ''}` : 'Güncelleme kontrol edilemedi'}</b>
      <span>{ready ? `v${state.version || ''} kuruluma hazır. İzleme konumların korunacak.` : downloading ? `%${Math.round(state.percent || 0)} tamamlandı` : state.message || 'Daha sonra yeniden denenecek.'}</span>
      {downloading && <div className="update-progress"><i style={{ width: `${state.percent || 3}%` }}/></div>}
    </div>
    {ready ? <button className="update-action" onClick={() => updater.restartAndInstall()}>Yeniden başlat</button> : <button className="update-close" onClick={() => setDismissed(true)} aria-label="Bildirimi kapat"><X/></button>}
  </aside>
}
