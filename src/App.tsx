import { useEffect, useMemo, useState } from 'react'
import { Bell, Check, ChevronDown, Clapperboard, Clock3, Compass, Film, Heart, Home, ListFilter, Menu, MoreHorizontal, Play, Plus, Radio, Search, Settings, Sparkles, Tv, X } from 'lucide-react'
import { Player } from './components/Player'
import { SourceModal } from './components/SourceModal'
import { categoryColors, demoChannels } from './data'
import { enrichChannelLogos } from './lib/logos'
import type { Channel, ContentType } from './types'

const nav = [{ label: 'Ana Sayfa', icon: Home }, { label: 'Canlı TV', icon: Radio }, { label: 'Filmler', icon: Film }, { label: 'Diziler', icon: Clapperboard }, { label: 'Favoriler', icon: Heart }]
const logoPath = `${import.meta.env.BASE_URL}saltatrix-tv-logo.png`

function App() {
  const [channels, setChannels] = useState<Channel[]>(() => { try { return JSON.parse(localStorage.getItem('saltatrix-tv-channels') || 'null') || demoChannels } catch { return demoChannels } })
  const [sourceName, setSourceName] = useState(() => localStorage.getItem('saltatrix-tv-source') || 'Saltatrix Demo')
  const [section, setSection] = useState('Ana Sayfa')
  const [category, setCategory] = useState('Tümü')
  const [search, setSearch] = useState('')
  const [favorites, setFavorites] = useState<string[]>(() => JSON.parse(localStorage.getItem('saltatrix-tv-favorites') || '[]'))
  const [selected, setSelected] = useState<Channel | null>(null)
  const [showSource, setShowSource] = useState(false)
  const [sidebar, setSidebar] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => localStorage.setItem('saltatrix-tv-favorites', JSON.stringify(favorites)), [favorites])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 2600); return () => clearTimeout(timer) }, [toast])
  useEffect(() => {
    let cancelled = false
    if (!channels.some((channel) => !channel.logo)) return
    enrichChannelLogos(channels).then((enriched) => {
      if (cancelled) return
      setChannels(enriched)
      if (sourceName !== 'Saltatrix Demo') localStorage.setItem('saltatrix-tv-channels', JSON.stringify(enriched))
    }).catch(() => undefined)
    return () => { cancelled = true }
    // Kaynak değiştiğinde eksik logoları bir kez tamamla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceName])

  const typeFilter: ContentType | null = section === 'Canlı TV' ? 'live' : section === 'Filmler' ? 'movie' : section === 'Diziler' ? 'series' : null
  const categories = useMemo(() => ['Tümü', ...Array.from(new Set(channels.filter(c => !typeFilter || c.type === typeFilter).map(c => c.category))).slice(0, 10)], [channels, typeFilter])
  const visible = useMemo(() => channels.filter((channel) => {
    if (typeFilter && channel.type !== typeFilter) return false
    if (section === 'Favoriler' && !favorites.includes(channel.id)) return false
    if (category !== 'Tümü' && channel.category !== category) return false
    return `${channel.name} ${channel.category}`.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr'))
  }), [channels, typeFilter, section, favorites, category, search])

  const loadSource = (items: Channel[], name: string) => {
    setChannels(items); setSourceName(name); setShowSource(false); setSection('Canlı TV'); setCategory('Tümü'); setToast(`${items.length} içerik başarıyla eklendi`)
    localStorage.setItem('saltatrix-tv-channels', JSON.stringify(items)); localStorage.setItem('saltatrix-tv-source', name)
    enrichChannelLogos(items).then((enriched) => {
      setChannels(enriched)
      localStorage.setItem('saltatrix-tv-channels', JSON.stringify(enriched))
    }).catch(() => undefined)
  }
  const toggleFavorite = (id: string) => setFavorites((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const playNext = () => { if (!selected || !visible.length) return; const i = visible.findIndex(c => c.id === selected.id); setSelected(visible[(i + 1) % visible.length]) }

  return <div className="app-shell">
    <div className="aurora aurora-one"/><div className="aurora aurora-two"/>
    <aside className={sidebar ? 'sidebar open' : 'sidebar'}>
      <div className="brand"><img src={logoPath}/><div>Saltatrix <span>TV</span></div><button className="mobile-close" onClick={() => setSidebar(false)}><X/></button></div>
      <nav>{nav.map(({label, icon: Icon}) => <button key={label} className={section === label ? 'active' : ''} onClick={() => { setSection(label); setCategory('Tümü'); setSidebar(false) }}><Icon size={20}/><span>{label}</span>{label === 'Favoriler' && favorites.length > 0 && <em>{favorites.length}</em>}</button>)}</nav>
      <div className="side-label">KÜTÜPHANE</div>
      <button className="source-card" onClick={() => setShowSource(true)}><span><Tv/></span><div><small>Aktif liste</small><b>{sourceName}</b></div><ChevronDown/></button>
      <div className="sidebar-bottom"><button><Settings/><span>Ayarlar</span></button><div className="profile"><div>LK</div><span><b>İyi seyirler</b><small>Kişisel profil</small></span><MoreHorizontal/></div></div>
    </aside>
    {sidebar && <div className="sidebar-shade" onClick={() => setSidebar(false)}/>} 
    <main>
      <header><button className="menu-btn" onClick={() => setSidebar(true)}><Menu/></button><div className="search"><Search/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Kanal, film veya kategori ara…"/>{search && <button onClick={() => setSearch('')}><X/></button>}<kbd>⌘ K</kbd></div><button className="header-icon"><Bell/></button><button className="add-source" onClick={() => setShowSource(true)}><Plus/> <span>Kaynak ekle</span></button></header>
      <div className="content">
        {section === 'Ana Sayfa' && !search ? <section className="hero">
          <div className="hero-copy"><div className="eyebrow"><Sparkles/> YENİ NESİL TELEVİZYON</div><h1>Ne izlemek istersen,<br/><span>tek bir yerde.</span></h1><p>Canlı yayınların, filmlerin ve dizilerin. Hızlı, sade, tam sana göre.</p><div className="hero-actions"><button className="watch-btn" onClick={() => setSelected(channels[0])}><Play fill="currentColor"/> İzlemeye başla</button><button className="ghost-btn" onClick={() => setShowSource(true)}><Plus/> Liste ekle</button></div></div>
          <div className="hero-art"><div className="orbit o1"/><div className="orbit o2"/><img src={logoPath}/><div className="floating-pill p1"><Radio/> <span><b>Canlı</b> tüm kanallar</span></div><div className="floating-pill p2"><Film/> <span><b>4K</b> yüksek kalite</span></div></div>
        </section> : <div className="page-title"><div><span>{section === 'Favoriler' ? 'SANA ÖZEL' : 'KEŞFET'}</span><h1>{search ? `“${search}” sonuçları` : section}</h1></div><button><ListFilter/> Filtrele</button></div>}

        <section className="category-section"><div className="section-heading"><div><Compass/><h2>Kategoriler</h2></div><span>{categories.length - 1} kategori</span></div><div className="category-row">{categories.map((item, index) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}><i style={{ background: categoryColors[item] || `hsl(${(index * 47) % 360} 70% 65%)` }}/>{item}</button>)}</div></section>

        <section className="channels-section"><div className="section-heading"><div><Radio/><h2>{section === 'Favoriler' ? 'Favori kanalların' : category === 'Tümü' ? 'Senin için seçtik' : category}</h2></div><span>{visible.length} içerik</span></div>
          {visible.length ? <div className="channel-grid">{visible.slice(0, 60).map((channel, idx) => <article className="channel-card" key={channel.id} style={{ '--delay': `${Math.min(idx * 35, 400)}ms` } as React.CSSProperties} onClick={() => channel.url && setSelected(channel)}>
            <div className={`channel-visual visual-${idx % 6}`}><span className="logo-fallback">{channel.name.slice(0, 2).toUpperCase()}</span>{channel.logo && <img src={channel.logo} alt={`${channel.name} logosu`} loading="lazy" referrerPolicy="no-referrer" onError={(e) => e.currentTarget.style.display = 'none'}/>}<div className="card-overlay"><button><Play fill="currentColor"/></button></div><b className="quality">{channel.quality || 'HD'}</b>{channel.type === 'live' && <em><i/> CANLI</em>}</div>
            <div className="channel-info"><div><small>{channel.category}</small><h3>{channel.name}</h3><p><Clock3/> {channel.now || (channel.type === 'live' ? 'Canlı yayın' : channel.type === 'movie' ? 'Film' : 'Dizi')}</p></div><button className={favorites.includes(channel.id) ? 'fav active' : 'fav'} onClick={(e) => { e.stopPropagation(); toggleFavorite(channel.id) }}><Heart fill={favorites.includes(channel.id) ? 'currentColor' : 'none'}/></button></div>
            {channel.progress ? <div className="mini-progress"><i style={{width: `${channel.progress}%`}}/></div> : null}
          </article>)}</div> : <div className="empty-state"><div><Tv/></div><h3>Burada henüz bir şey yok</h3><p>Yeni bir liste ekleyin veya filtrelerinizi değiştirin.</p><button className="primary-btn" onClick={() => setShowSource(true)}><Plus/> Kaynak ekle</button></div>}
        </section>
      </div>
    </main>
    {selected && <Player channel={selected} onClose={() => setSelected(null)} onNext={playNext}/>} 
    {showSource && <SourceModal onClose={() => setShowSource(false)} onLoaded={loadSource}/>} 
    {toast && <div className="toast"><Check/>{toast}</div>}
  </div>
}

export default App
