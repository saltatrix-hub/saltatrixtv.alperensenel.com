import { useRef, useState } from 'react'
import { FileUp, Link2, ListVideo, Server, ShieldCheck, X } from 'lucide-react'
import { parseM3U } from '../lib/m3u'
import { loadXtream } from '../lib/xtream'
import type { Channel, XtreamCredentials } from '../types'
import { fetchProvider } from '../lib/proxy'

interface Props { onClose: () => void; onLoaded: (channels: Channel[], sourceName: string) => void }

export function SourceModal({ onClose, onLoaded }: Props) {
  const [tab, setTab] = useState<'xtream' | 'm3u'>('xtream')
  const [form, setForm] = useState<XtreamCredentials>({ name: 'Ev Listem', server: '', username: '', password: '' })
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const connectXtream = async () => {
    if (!form.server || !form.username || !form.password) return setError('Lütfen tüm bağlantı alanlarını doldurun.')
    setLoading(true); setError('')
    try { const channels = await loadXtream(form); onLoaded(channels, form.name || 'Xtream Listem') }
    catch (err) { setError(err instanceof Error ? err.message : 'Bağlantı kurulamadı.') }
    finally { setLoading(false) }
  }

  const connectUrl = async () => {
    if (!url) return setError('Bir M3U adresi girin.')
    setLoading(true); setError('')
    try { const res = await fetchProvider(url); if (!res.ok) throw new Error(`Liste indirilemedi (${res.status}).`); const data = parseM3U(await res.text()); if (!data.length) throw new Error('Bu listede kanal bulunamadı.'); onLoaded(data, 'M3U Listem') }
    catch (err) { setError(err instanceof Error ? err.message : 'Liste alınamadı.') }
    finally { setLoading(false) }
  }

  const loadFile = async (file?: File) => {
    if (!file) return
    const data = parseM3U(await file.text())
    if (!data.length) return setError('Bu dosyada geçerli kanal bulunamadı.')
    onLoaded(data, file.name)
  }

  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className="source-modal">
      <div className="modal-head"><div className="modal-icon"><ListVideo/></div><div><h2>Yayın kaynağı ekle</h2><p>Bir yöntem seç, gerisini Saltatrix TV halletsin.</p></div><button className="icon-btn" onClick={onClose}><X/></button></div>
      <div className="source-tabs"><button className={tab === 'xtream' ? 'active' : ''} onClick={() => { setTab('xtream'); setError('') }}><Server/>Xtream Codes</button><button className={tab === 'm3u' ? 'active' : ''} onClick={() => { setTab('m3u'); setError('') }}><Link2/>M3U Listesi</button></div>
      {tab === 'xtream' ? <div className="source-form">
        <label>Liste adı<input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Örn. Ev Listem"/></label>
        <label>Sunucu adresi<input value={form.server} onChange={(e) => setForm({...form, server: e.target.value})} placeholder="http://sunucu-adresi.com:8080"/></label>
        <div className="form-row"><label>Kullanıcı adı<input value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} placeholder="Kullanıcı adı"/></label><label>Parola<input type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} placeholder="••••••••"/></label></div>
        <button className="primary-btn" onClick={connectXtream} disabled={loading}>{loading ? <span className="spinner"/> : <Server/>}{loading ? 'Bağlanıyor…' : 'Bağlan ve listeyi aç'}</button>
      </div> : <div className="source-form">
        <label>M3U bağlantısı<input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://ornek.com/listem.m3u"/></label>
        <button className="primary-btn" onClick={connectUrl} disabled={loading}>{loading ? <span className="spinner"/> : <Link2/>}{loading ? 'Liste alınıyor…' : 'Bağlantıdan yükle'}</button>
        <div className="or"><span>veya</span></div>
        <input ref={fileRef} type="file" accept=".m3u,.m3u8,text/plain" hidden onChange={(e) => loadFile(e.target.files?.[0])}/>
        <button className="upload-btn" onClick={() => fileRef.current?.click()}><FileUp/><span><b>Bilgisayardan dosya seç</b><small>.m3u ve .m3u8 desteklenir</small></span></button>
      </div>}
      {error && <div className="form-error">{error}</div>}
      <div className="privacy-note"><ShieldCheck/><span><b>Bilgilerin güvende.</b> Yalnızca IPTV sağlayıcınla doğrudan paylaşılır.</span></div>
    </div>
  </div>
}
