import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bell, Check, ChevronDown, Clapperboard, Compass, Film, Heart, Home, ListFilter, Menu, MoreHorizontal, Play, Plus, Radio, Search, Settings, Sparkles, Tv, X } from 'lucide-react'
import { ChannelCard } from './components/ChannelCard'
import { Player } from './components/Player'
import { SourceModal } from './components/SourceModal'
import { UpdateBanner } from './components/UpdateBanner'
import { categoryColors, demoChannels } from './data'
import { enrichChannelLogos } from './lib/logos'
import { resolveSeriesEpisode } from './lib/xtream'
import type { Channel, ContentType, WatchProgress } from './types'

const nav = [{ label: 'Ana Sayfa', icon: Home }, { label: 'Canlı TV', icon: Radio }, { label: 'Filmler', icon: Film }, { label: 'Diziler', icon: Clapperboard }, { label: 'Favoriler', icon: Heart }]
const logoPath = `${import.meta.env.BASE_URL}saltatrix-tv-logo.png`
const progressKey = 'saltatrix-tv-watch-progress-v1'

const platformDomains: Array<[RegExp, string, string]> = [
  [/netflix/i, 'Netflix', 'netflix.com'],
  [/exxen/i, 'Exxen', 'exxen.com'],
  [/amazon|prime/i, 'Prime Video', 'primevideo.com'],
  [/hbo|max/i, 'Max', 'max.com'],
  [/disney/i, 'Disney+', 'disneyplus.com'],
  [/gain/i, 'GAİN', 'gain.tv'],
  [/blu\s*tv/i, 'BluTV', 'blutv.com'],
  [/tod/i, 'TOD', 'todtv.com.tr'],
  [/tabii/i, 'tabii', 'tabii.com'],
  [/puhu/i, 'puhutv', 'puhutv.com'],
]

const normalize = (value: string) => value
  .toLocaleLowerCase('tr-TR')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ı/g, 'i')

const platformInfo = (category: string) => {
  const match = platformDomains.find(([pattern]) => pattern.test(category))
  return match
    ? { label: match[1], image: `https://www.google.com/s2/favicons?domain=${match[2]}&sz=64` }
    : { label: category.replace(/dizileri|series|platform/gi, '').replace(/[|/+_-]+/g, ' ').trim() || category, image: '' }
}

const readProgress = (): Record<string, WatchProgress> => {
  try { return JSON.parse(localStorage.getItem(progressKey) || '{}') }
  catch { return {} }
}

function App() {
  const [channels, setChannels] = useState<Channel[]>(() => { try { return JSON.parse(localStorage.getItem('saltatrix-tv-channels') || 'null') || demoChannels } catch { return demoChannels } })
  const [sourceName, setSourceName] = useState(() => localStorage.getItem('saltatrix-tv-source') || 'Saltatrix Demo')
  const [section, setSection] = useState('Ana Sayfa')
  const [category, setCategory] = useState('Tümü')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [favorites, setFavorites] = useState<string[]>(() => JSON.parse(localStorage.getItem('saltatrix-tv-favorites') || '[]'))
  const [watchProgress, setWatchProgress] = useState<Record<string, WatchProgress>>(readProgress)
  const [selected, setSelected] = useState<Channel | null>(null)
  const [showSource, setShowSource] = useState(false)
  const [sidebar, setSidebar] = useState(false)
  const [toast, setToast] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => localStorage.setItem('saltatrix-tv-favorites', JSON.stringify(favorites)), [favorites])
  useEffect(() => localStorage.setItem(progressKey, JSON.stringify(watchProgress)), [watchProgress])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 2600); return () => clearTimeout(timer) }, [toast])
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchRef.current?.focus() }
      if (event.key === 'Escape' && document.activeElement === searchRef.current) { setSearch(''); searchRef.current?.blur() }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [])
  useEffect(() => {
    let cancelled = false
    if (!channels.some((channel) => !channel.logo)) return
    enrichChannelLogos(channels).then((enriched) => {
      if (cancelled) return
      setChannels(enriched)
      if (sourceName !== 'Saltatrix Demo') localStorage.setItem('saltatrix-tv-channels', JSON.stringify(enriched))
    }).catch(() => undefined)
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceName])

  const typeFilter: ContentType | null = section === 'Canlı TV' ? 'live' : section === 'Filmler' ? 'movie' : section === 'Diziler' ? 'series' : null
  const categories = useMemo(() => ['Tümü', ...Array.from(new Set(channels.filter((item) => !typeFilter || item.type === typeFilter).map((item) => item.category))).slice(0, 14)], [channels, typeFilter])
  const seriesPlatforms = useMemo(() => {
    const unique = new Map<string, { label: string; image: string }>()
    channels.filter((item) => item.type === 'series').forEach((item) => {
      const info = platformInfo(item.platform || item.category)
      const key = normalize(info.label)
      if (!unique.has(key)) unique.set(key, info)
    })
    return Array.from(unique, ([key, info]) => ({ key, ...info })).slice(0, 12)
  }, [channels])
  const query = normalize(search.trim())
  const visible = useMemo(() => channels.filter((channel) => {
    if (query) {
      const typeWords = channel.type === 'live' ? 'canlı tv kanal televizyon' : channel.type === 'movie' ? 'film sinema' : 'dizi series'
      const haystack = normalize([channel.name, channel.category, channel.platform, channel.genre, channel.description, channel.year, typeWords].filter(Boolean).join(' '))
      return query.split(/\s+/).every((word) => haystack.includes(word))
    }
    if (typeFilter && channel.type !== typeFilter) return false
    if (section === 'Favoriler' && !favorites.includes(channel.id)) return false
    if (section === 'Diziler' && platformFilter !== 'all' && normalize(platformInfo(channel.platform || channel.category).label) !== platformFilter) return false
    if (category !== 'Tümü' && (channel.platform || channel.category) !== category) return false
    return true
  }), [channels, typeFilter, section, favorites, category, platformFilter, query])
  const selectedPlatform = seriesPlatforms.find((item) => item.key === platformFilter)
  const continueWatching = useMemo(() => Object.values(watchProgress)
    .filter((item) => item.duration > 0 && item.position > 5 && item.position < item.duration - 15)
    .sort((a, b) => b.updatedAt - a.updatedAt), [watchProgress])

  const loadSource = (items: Channel[], name: string) => {
    setChannels(items); setSourceName(name); setShowSource(false); setSection('Canlı TV'); setCategory('Tümü'); setPlatformFilter('all'); setToast(`${items.length} içerik başarıyla eklendi`)
    localStorage.setItem('saltatrix-tv-channels', JSON.stringify(items)); localStorage.setItem('saltatrix-tv-source', name)
    enrichChannelLogos(items).then((enriched) => {
      setChannels(enriched)
      localStorage.setItem('saltatrix-tv-channels', JSON.stringify(enriched))
    }).catch(() => undefined)
  }
  const toggleFavorite = (id: string) => setFavorites((previous) => previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id])
  const playChannel = async (channel: Channel) => {
    if (channel.type === 'series' && !channel.url) {
      const resumed = continueWatching.find((item) => item.channel.parentId === channel.id)
      if (resumed) { setSelected(resumed.channel); return }
      setToast('İlk bölüm hazırlanıyor…')
      try { setSelected(await resolveSeriesEpisode(channel)); setToast('') }
      catch (error) { setToast(error instanceof Error ? error.message : 'Bölüm açılamadı.') }
      return
    }
    if (!channel.url) { setToast('Bu içerikte oynatma bağlantısı yok.'); return }
    setSelected(channel)
  }
  const playNext = () => {
    if (!selected || !visible.length) return
    const parentId = selected.parentId || selected.id
    const index = visible.findIndex((channel) => channel.id === parentId)
    void playChannel(visible[(Math.max(index, 0) + 1) % visible.length])
  }
  const saveProgress = useCallback((channel: Channel, position: number, duration: number) => {
    if (channel.type === 'live' || !Number.isFinite(duration) || duration <= 0) return
    setWatchProgress((previous) => {
      const next = { ...previous }
      if (position >= duration - 15) delete next[channel.id]
      else next[channel.id] = { channel, position, duration, updatedAt: Date.now() }
      return next
    })
  }, [])

  return <div className="app-shell">
    <div className="aurora aurora-one"/><div className="aurora aurora-two"/>
    <aside className={sidebar ? 'sidebar open' : 'sidebar'}>
      <div className="brand"><img src={logoPath}/><div>Saltatrix <span>TV</span></div><button className="mobile-close" onClick={() => setSidebar(false)}><X/></button></div>
      <nav>{nav.map(({ label, icon: Icon }) => <div className="nav-group" key={label}>
        <button className={section === label ? 'active' : ''} onClick={() => { setSection(label); setCategory('Tümü'); setPlatformFilter('all'); setSearch(''); if (label !== 'Diziler') setSidebar(false) }}><Icon size={20}/><span>{label}</span>{label === 'Favoriler' && favorites.length > 0 && <em>{favorites.length}</em>}</button>
        {label === 'Diziler' && section === 'Diziler' && <div className="platform-submenu">
          <button className={platformFilter === 'all' ? 'active' : ''} onClick={() => { setPlatformFilter('all'); setCategory('Tümü'); setSearch('') }}><span className="platform-fallback"><Clapperboard/></span><b>Tüm diziler</b></button>
          {seriesPlatforms.map((item) => <button key={item.key} title={item.label} className={platformFilter === item.key ? 'active' : ''} onClick={() => { setPlatformFilter(item.key); setCategory('Tümü'); setSearch(''); setSidebar(false) }}>
            <span className="platform-fallback">{item.image ? <img src={item.image} alt=""/> : item.label.slice(0, 1)}</span><b>{item.label}</b>
          </button>)}
        </div>}
      </div>)}</nav>
      <div className="side-label">KÜTÜPHANE</div>
      <button className="source-card" onClick={() => setShowSource(true)}><span><Tv/></span><div><small>Aktif liste</small><b>{sourceName}</b></div><ChevronDown/></button>
      <div className="sidebar-bottom"><button><Settings/><span>Ayarlar</span></button><div className="profile"><div>ST</div><span><b>İyi seyirler</b><small>Kişisel profil</small></span><MoreHorizontal/></div></div>
    </aside>
    {sidebar && <div className="sidebar-shade" onClick={() => setSidebar(false)}/>} 
    <main>
      <header><button className="menu-btn" onClick={() => setSidebar(true)}><Menu/></button><div className="search"><Search/><input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="İsim, platform, tür veya kategori ara…"/>{search && <button onClick={() => setSearch('')}><X/></button>}<kbd>Ctrl K</kbd></div><button className="header-icon"><Bell/></button><button className="add-source" onClick={() => setShowSource(true)}><Plus/> <span>Kaynak ekle</span></button></header>
      <div className="content">
        {section === 'Ana Sayfa' && !query ? <section className="hero">
          <div className="hero-copy"><div className="eyebrow"><Sparkles/> YENİ NESİL TELEVİZYON</div><h1>Ne izlemek istersen,<br/><span>tek bir yerde.</span></h1><p>Canlı yayınların, filmlerin ve dizilerin. Hızlı, sade, tam sana göre.</p><div className="hero-actions"><button className="watch-btn" onClick={() => { const first = continueWatching[0]?.channel || channels[0]; if (first) void playChannel(first) }}><Play fill="currentColor"/> {continueWatching.length ? 'Devam et' : 'İzlemeye başla'}</button><button className="ghost-btn" onClick={() => setShowSource(true)}><Plus/> Liste ekle</button></div></div>
          <div className="hero-art"><div className="orbit o1"/><div className="orbit o2"/><img src={logoPath}/><div className="floating-pill p1"><Radio/> <span><b>Canlı</b> tüm kanallar</span></div><div className="floating-pill p2"><Film/> <span><b>4K</b> yüksek kalite</span></div></div>
        </section> : <div className="page-title"><div><span>{query ? 'TÜM KÜTÜPHANEDE ARANIYOR' : section === 'Favoriler' ? 'SANA ÖZEL' : 'KEŞFET'}</span><h1>{query ? `“${search}” sonuçları` : section}</h1></div><button><ListFilter/> Filtrele</button></div>}

        {!query && <section className="category-section"><div className="section-heading"><div><Compass/><h2>Kategoriler</h2></div><span>{categories.length - 1} kategori</span></div><div className="category-row">{categories.map((item, index) => <button key={item} className={category === item && platformFilter === 'all' ? 'active' : ''} onClick={() => { setCategory(item); setPlatformFilter('all'); setSearch('') }}><i style={{ background: categoryColors[item] || `hsl(${(index * 47) % 360} 70% 65%)` }}/>{item}</button>)}</div></section>}

        {!query && continueWatching.length > 0 && <section className="continue-section"><div className="section-heading"><div><Play/><h2>Kaldığın yerden devam et</h2></div><span>{continueWatching.length} içerik</span></div><div className="channel-grid continue-grid">{continueWatching.slice(0, 4).map((item, index) => <ChannelCard key={item.channel.id} channel={item.channel} index={index} favorite={favorites.includes(item.channel.id)} onPlay={playChannel} onFavorite={toggleFavorite} watchPercent={Math.round(item.position / item.duration * 100)}/>)}</div></section>}

        <section className="channels-section"><div className="section-heading"><div><Radio/><h2>{query ? 'Arama sonuçları' : section === 'Favoriler' ? 'Favori içeriklerin' : selectedPlatform?.label || (category === 'Tümü' ? 'Senin için seçtik' : category)}</h2></div><span>{visible.length} içerik</span></div>
          {visible.length ? <div className="channel-grid">{visible.slice(0, 120).map((channel, index) => <ChannelCard key={channel.id} channel={channel} index={index} favorite={favorites.includes(channel.id)} onPlay={playChannel} onFavorite={toggleFavorite}/>)}</div> : <div className="empty-state"><div><Tv/></div><h3>Sonuç bulunamadı</h3><p>{query ? 'Farklı bir isim, platform veya kategori deneyin.' : 'Yeni bir liste ekleyin veya filtrelerinizi değiştirin.'}</p><button className="primary-btn" onClick={() => setShowSource(true)}><Plus/> Kaynak ekle</button></div>}
        </section>
      </div>
    </main>
    {selected && <Player channel={selected} resumeAt={watchProgress[selected.id]?.position || 0} onProgress={saveProgress} onClose={() => setSelected(null)} onNext={playNext}/>}
    {showSource && <SourceModal onClose={() => setShowSource(false)} onLoaded={loadSource}/>} 
    <UpdateBanner/>
    {toast && <div className="toast"><Check/>{toast}</div>}
  </div>
}

export default App
