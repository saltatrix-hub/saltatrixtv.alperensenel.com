import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bell, Check, ChevronDown, Clapperboard, Compass, Film, Heart, Home, ListFilter, Menu, MoreHorizontal, Play, Plus, Radio, Search, Settings, Sparkles, Tv, X } from 'lucide-react'
import { ChannelCard } from './components/ChannelCard'
import { Player } from './components/Player'
import { ProfileModal, SettingsModal, type UserPreferences, type UserProfile } from './components/PreferencesModal'
import { SourceModal } from './components/SourceModal'
import { UpdateBanner } from './components/UpdateBanner'
import { categoryColors, demoChannels } from './data'
import { enrichChannelLogos } from './lib/logos'
import { fetchSeriesMetadata, inferXtreamCredentials, loadXtream, repairXtreamSeriesMetadata, resolveSeriesEpisode } from './lib/xtream'
import type { Channel, ContentType, WatchProgress } from './types'

type Section = 'home' | 'live' | 'movies' | 'series' | 'favorites'
const nav: Array<{ id: Section; label: string; icon: typeof Home }> = [{ id: 'home', label: 'Ana Sayfa', icon: Home }, { id: 'live', label: 'Canlı TV', icon: Radio }, { id: 'movies', label: 'Filmler', icon: Film }, { id: 'series', label: 'Diziler', icon: Clapperboard }, { id: 'favorites', label: 'Favoriler', icon: Heart }]
const logoPath = `${import.meta.env.BASE_URL}saltatrix-tv-logo.png`
const progressKey = 'saltatrix-tv-watch-progress-v1'
const preferencesKey = 'saltatrix-tv-preferences-v1'
const profileKey = 'saltatrix-tv-profile-v1'

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
  .replace(/[çğıöşü]/g, (letter) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[letter] || letter)
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()

const searchAliases = (type: ContentType) => type === 'live'
  ? 'canli tv televizyon kanal live yayin'
  : type === 'movie'
    ? 'film filmler sinema movie vod'
    : 'dizi diziler series sezon bolum platform'

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
const readStored = <T,>(key: string, fallback: T): T => {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(key) || '{}') } }
  catch { return fallback }
}

function App() {
  const [channels, setChannels] = useState<Channel[]>(() => { try { return repairXtreamSeriesMetadata(JSON.parse(localStorage.getItem('saltatrix-tv-channels') || 'null') || demoChannels) } catch { return demoChannels } })
  const [sourceName, setSourceName] = useState(() => localStorage.getItem('saltatrix-tv-source') || 'Saltatrix Demo')
  const [section, setSection] = useState<Section>('home')
  const [category, setCategory] = useState('Tümü')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [favorites, setFavorites] = useState<string[]>(() => JSON.parse(localStorage.getItem('saltatrix-tv-favorites') || '[]'))
  const [watchProgress, setWatchProgress] = useState<Record<string, WatchProgress>>(readProgress)
  const [selected, setSelected] = useState<Channel | null>(null)
  const [playerFullscreen, setPlayerFullscreen] = useState(false)
  const [showSource, setShowSource] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [preferences, setPreferences] = useState<UserPreferences>(() => readStored(preferencesKey, { fontSize: 'large', autoFullscreen: true }))
  const [profile, setProfile] = useState<UserProfile>(() => readStored(profileKey, { name: 'İyi seyirler' }))
  const [sidebar, setSidebar] = useState(false)
  const [toast, setToast] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const metadataRequests = useRef(new Set<string>())
  const catalogRefreshAttempted = useRef(false)

  useEffect(() => localStorage.setItem('saltatrix-tv-favorites', JSON.stringify(favorites)), [favorites])
  useEffect(() => localStorage.setItem(progressKey, JSON.stringify(watchProgress)), [watchProgress])
  useEffect(() => localStorage.setItem(preferencesKey, JSON.stringify(preferences)), [preferences])
  useEffect(() => localStorage.setItem(profileKey, JSON.stringify(profile)), [profile])
  useEffect(() => { if (sourceName !== 'Saltatrix Demo') localStorage.setItem('saltatrix-tv-channels', JSON.stringify(channels)) }, [channels, sourceName])
  useEffect(() => {
    if (catalogRefreshAttempted.current || sourceName === 'Saltatrix Demo') return
    const series = channels.filter((channel) => channel.type === 'series')
    const ids = new Set(series.map((channel) => String(channel.xtreamId ?? channel.id.match(/^xc-series-(.+)$/)?.[1] ?? '')))
    if (series.length < 2 || ids.size > 1) return
    const credentials = inferXtreamCredentials(channels)
    if (!credentials) return
    catalogRefreshAttempted.current = true
    setToast('Dizi kataloğu otomatik onarılıyor…')
    loadXtream({ ...credentials, name: sourceName }).then((items) => {
      setChannels(repairXtreamSeriesMetadata(items))
      metadataRequests.current.clear()
      setToast('Dizi kataloğu güncellendi')
    }).catch(() => setToast('Dizi kataloğu yenilenemedi. Kaynağı yeniden bağlayın.'))
  }, [channels, sourceName])
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

  const typeFilter: ContentType | null = section === 'live' ? 'live' : section === 'movies' ? 'movie' : section === 'series' ? 'series' : null
  const catalogChannels = useMemo(() => {
    const unique = new Map<string, Channel>()
    channels.forEach((channel) => {
      const key = `${channel.type}:${normalize(channel.name)}`
      const current = unique.get(key)
      if (!current || (!current.logo && channel.logo) || (!current.description && channel.description)) unique.set(key, channel)
    })
    return Array.from(unique.values())
  }, [channels])
  const categories = useMemo(() => ['Tümü', ...Array.from(new Set(catalogChannels.filter((item) => !typeFilter || item.type === typeFilter).map((item) => item.category))).slice(0, 14)], [catalogChannels, typeFilter])
  const seriesPlatforms = useMemo(() => {
    const unique = new Map<string, { label: string; image: string }>()
    catalogChannels.filter((item) => item.type === 'series').forEach((item) => {
      const info = platformInfo(item.platform || item.category)
      const key = normalize(info.label)
      if (!unique.has(key)) unique.set(key, info)
    })
    return Array.from(unique, ([key, info]) => ({ key, ...info })).slice(0, 12)
  }, [catalogChannels])
  const query = normalize(search.trim())
  const searchIndex = useMemo(() => catalogChannels.map((channel, index) => {
    const name = normalize(channel.name)
    const categoryName = normalize(channel.category)
    const platformName = normalize(`${channel.platform || ''} ${platformInfo(channel.platform || channel.category).label}`)
    const typeName = normalize(searchAliases(channel.type))
    return { channel, index, name, categoryName, platformName, typeName, compactName: name.replace(/\s/g, '') }
  }), [catalogChannels])
  const visible = useMemo(() => {
    if (query) {
      const tokens = query.split(/\s+/).filter(Boolean)
      const compactQuery = query.replace(/\s/g, '')
      return searchIndex
        .map((entry) => {
          const titleMatch = tokens.every((token) => entry.name.includes(token) || entry.compactName.includes(token))
          const categoryMatch = tokens.every((token) => entry.categoryName.includes(token))
          const platformMatch = tokens.every((token) => entry.platformName.includes(token))
          const typeMatch = entry.typeName.split(' ').includes(query) || entry.typeName.includes(query)
          if (!titleMatch && !categoryMatch && !platformMatch && !typeMatch) return null
          let score = 0
          if (entry.name === query) score += 500
          if (entry.name.startsWith(query)) score += 250
          if (entry.name.includes(query)) score += 180
          if (entry.compactName.includes(compactQuery)) score += 140
          if (entry.platformName.includes(query)) score += 90
          if (entry.categoryName.includes(query)) score += 70
          score += tokens.filter((token) => entry.name.includes(token)).length * 35
          return { ...entry, score }
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .sort((left, right) => right.score - left.score || left.index - right.index)
        .map((entry) => entry.channel)
    }
    return catalogChannels.filter((channel) => {
      if (typeFilter && channel.type !== typeFilter) return false
      if (section === 'favorites' && !favorites.includes(channel.id)) return false
      if (section === 'series' && platformFilter !== 'all' && normalize(platformInfo(channel.platform || channel.category).label) !== platformFilter) return false
      if (category !== 'Tümü' && (channel.platform || channel.category) !== category) return false
      return true
    })
  }, [catalogChannels, searchIndex, typeFilter, section, favorites, category, platformFilter, query])
  useEffect(() => {
    if (section !== 'series') return
    const missing = visible.filter((channel) => channel.type === 'series' && !channel.logo && channel.seriesInfoUrl && !metadataRequests.current.has(channel.id)).slice(0, 24)
    if (!missing.length) return
    missing.forEach((channel) => metadataRequests.current.add(channel.id))
    Promise.all(missing.map(async (channel) => ({ id: channel.id, metadata: await fetchSeriesMetadata(channel).catch((): Partial<Channel> => ({})) }))).then((results) => {
      const updates = new Map(results.map((result) => [result.id, result.metadata]))
      if (![...updates.values()].some((metadata) => metadata.logo)) return
      setChannels((current) => current.map((channel) => updates.has(channel.id) ? { ...channel, ...updates.get(channel.id) } : channel))
    })
  }, [section, visible])
  const selectedPlatform = seriesPlatforms.find((item) => item.key === platformFilter)
  const continueWatching = useMemo(() => Object.values(watchProgress)
    .filter((item) => item.duration > 0 && item.position > 5 && item.position < item.duration - 15)
    .sort((a, b) => b.updatedAt - a.updatedAt), [watchProgress])

  const loadSource = (items: Channel[], name: string) => {
    const repairedItems = repairXtreamSeriesMetadata(items)
    setChannels(repairedItems); setSourceName(name); setShowSource(false); setSection('live'); setCategory('Tümü'); setPlatformFilter('all'); setToast(`${items.length} içerik başarıyla eklendi`)
    localStorage.setItem('saltatrix-tv-channels', JSON.stringify(repairedItems)); localStorage.setItem('saltatrix-tv-source', name)
    enrichChannelLogos(repairedItems).then((enriched) => {
      setChannels(enriched)
      localStorage.setItem('saltatrix-tv-channels', JSON.stringify(enriched))
    }).catch(() => undefined)
  }
  const toggleFavorite = (id: string) => setFavorites((previous) => previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id])
  const changeFullscreen = (enabled: boolean) => {
    setPlayerFullscreen(enabled)
    if (window.saltatrixDesktop) window.saltatrixDesktop.window.setFullscreen(enabled).catch(() => undefined)
    else if (enabled && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => undefined)
    else if (!enabled && document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined)
  }
  const playChannel = async (channel: Channel, preservePlayerMode = false) => {
    if (!preservePlayerMode) changeFullscreen(preferences.autoFullscreen)
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
  const closePlayer = () => {
    setSelected(null)
    changeFullscreen(false)
  }
  const playNext = () => {
    if (!selected || !visible.length) return
    const parentId = selected.parentId || selected.id
    const index = visible.findIndex((channel) => channel.id === parentId)
    void playChannel(visible[(Math.max(index, 0) + 1) % visible.length], true)
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

  const profileInitials = profile.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('tr-TR') || 'ST'

  return <div className={`app-shell font-${preferences.fontSize}`}>
    <div className="aurora aurora-one"/><div className="aurora aurora-two"/>
    <aside className={sidebar ? 'sidebar open' : 'sidebar'}>
      <div className="brand"><img src={logoPath}/><div>Saltatrix <span>TV</span></div><button className="mobile-close" onClick={() => setSidebar(false)}><X/></button></div>
      <nav>{nav.map(({ id, label, icon: Icon }) => <div className="nav-group" key={id}>
        <button className={section === id ? 'active' : ''} onClick={() => { setSection(id); setCategory('Tümü'); setPlatformFilter('all'); setSearch(''); if (id !== 'series') setSidebar(false) }}><Icon size={20}/><span>{label}</span>{id === 'favorites' && favorites.length > 0 && <em>{favorites.length}</em>}</button>
        {id === 'series' && section === 'series' && <div className="platform-submenu">
          <button className={platformFilter === 'all' ? 'active' : ''} onClick={() => { setPlatformFilter('all'); setCategory('Tümü'); setSearch('') }}><span className="platform-fallback"><Clapperboard/></span><b>Tüm diziler</b></button>
          {seriesPlatforms.map((item) => <button key={item.key} title={item.label} className={platformFilter === item.key ? 'active' : ''} onClick={() => { setPlatformFilter(item.key); setCategory('Tümü'); setSearch(''); setSidebar(false) }}>
            <span className="platform-fallback">{item.image ? <img src={item.image} alt=""/> : item.label.slice(0, 1)}</span><b>{item.label}</b>
          </button>)}
        </div>}
      </div>)}</nav>
      <div className="side-label">KÜTÜPHANE</div>
      <button className="source-card" onClick={() => setShowSource(true)}><span><Tv/></span><div><small>Aktif liste</small><b>{sourceName}</b></div><ChevronDown/></button>
      <div className="sidebar-bottom"><button onClick={() => setShowSettings(true)}><Settings/><span>Ayarlar</span></button><button className="profile" onClick={() => setShowProfile(true)}><span className="profile-avatar-small">{profileInitials}</span><span><b>{profile.name}</b><small>Kişisel profil</small></span><MoreHorizontal/></button></div>
    </aside>
    {sidebar && <div className="sidebar-shade" onClick={() => setSidebar(false)}/>} 
    <main>
      <header><button className="menu-btn" onClick={() => setSidebar(true)}><Menu/></button><div className="search"><Search/><input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="İsim, platform, tür veya kategori ara…"/>{search && <button onClick={() => setSearch('')}><X/></button>}<kbd>Ctrl K</kbd></div><button className="header-icon"><Bell/></button><button className="add-source" onClick={() => setShowSource(true)}><Plus/> <span>Kaynak ekle</span></button></header>
      <div className="content">
        {section === 'home' && !query ? <section className="hero">
          <div className="hero-copy"><div className="eyebrow"><Sparkles/> YENİ NESİL TELEVİZYON</div><h1>Ne izlemek istersen,<br/><span>tek bir yerde.</span></h1><p>Canlı yayınların, filmlerin ve dizilerin. Hızlı, sade, tam sana göre.</p><div className="hero-actions"><button className="watch-btn" onClick={() => { const first = continueWatching[0]?.channel || channels[0]; if (first) void playChannel(first) }}><Play fill="currentColor"/> {continueWatching.length ? 'Devam et' : 'İzlemeye başla'}</button><button className="ghost-btn" onClick={() => setShowSource(true)}><Plus/> Liste ekle</button></div></div>
          <div className="hero-art"><div className="orbit o1"/><div className="orbit o2"/><img src={logoPath}/><div className="floating-pill p1"><Radio/> <span><b>Canlı</b> tüm kanallar</span></div><div className="floating-pill p2"><Film/> <span><b>4K</b> yüksek kalite</span></div></div>
        </section> : <div className="page-title"><div><span>{query ? 'TÜM KÜTÜPHANEDE ARANIYOR' : section === 'favorites' ? 'SANA ÖZEL' : 'KEŞFET'}</span><h1>{query ? `“${search}” sonuçları` : nav.find((item) => item.id === section)?.label}</h1></div><button><ListFilter/> Filtrele</button></div>}

        {!query && <section className="category-section"><div className="section-heading"><div><Compass/><h2>Kategoriler</h2></div><span>{categories.length - 1} kategori</span></div><div className="category-row">{categories.map((item, index) => <button key={item} className={category === item && platformFilter === 'all' ? 'active' : ''} onClick={() => { setCategory(item); setPlatformFilter('all'); setSearch('') }}><i style={{ background: categoryColors[item] || `hsl(${(index * 47) % 360} 70% 65%)` }}/>{item}</button>)}</div></section>}

        {!query && section === 'home' && continueWatching.length > 0 && <section className="continue-section"><div className="section-heading"><div><Play/><h2>Kaldığın yerden devam et</h2></div><span>{continueWatching.length} içerik</span></div><div className="channel-grid continue-grid">{continueWatching.slice(0, 4).map((item, index) => <ChannelCard key={item.channel.id} channel={item.channel} index={index} favorite={favorites.includes(item.channel.id)} onPlay={playChannel} onFavorite={toggleFavorite} watchPercent={Math.round(item.position / item.duration * 100)}/>)}</div></section>}

        <section className="channels-section"><div className="section-heading"><div><Radio/><h2>{query ? 'Arama sonuçları' : section === 'favorites' ? 'Favori içeriklerin' : selectedPlatform?.label || (category === 'Tümü' ? 'Senin için seçtik' : category)}</h2></div><span>{visible.length} içerik</span></div>
          {visible.length ? <div className="channel-grid">{visible.slice(0, 120).map((channel, index) => <ChannelCard key={`${channel.type}-${channel.id}-${index}`} channel={channel} index={index} favorite={favorites.includes(channel.id)} onPlay={playChannel} onFavorite={toggleFavorite}/>)}</div> : <div className="empty-state"><div><Tv/></div><h3>Sonuç bulunamadı</h3><p>{query ? 'Farklı bir isim, platform veya kategori deneyin.' : 'Yeni bir liste ekleyin veya filtrelerinizi değiştirin.'}</p><button className="primary-btn" onClick={() => setShowSource(true)}><Plus/> Kaynak ekle</button></div>}
        </section>
      </div>
    </main>
    {selected && <Player
      channel={selected}
      resumeAt={watchProgress[selected.id]?.position || 0}
      fullscreen={playerFullscreen}
      onFullscreenChange={changeFullscreen}
      onProgress={saveProgress}
      onClose={closePlayer}
      onNext={playNext}
    />}
    {showSource && <SourceModal onClose={() => setShowSource(false)} onLoaded={loadSource}/>} 
    {showSettings && <SettingsModal value={preferences} onChange={setPreferences} onClose={() => setShowSettings(false)}/>}
    {showProfile && <ProfileModal value={profile} onSave={setProfile} onClose={() => setShowProfile(false)}/>}
    <UpdateBanner/>
    {toast && <div className="toast"><Check/>{toast}</div>}
  </div>
}

export default App
