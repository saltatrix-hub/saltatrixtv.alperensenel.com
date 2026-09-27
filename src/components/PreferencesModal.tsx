import { Eye, History, Maximize, PlayCircle, Save, Settings, Type, UserRound, Volume2, X } from 'lucide-react'
import { useState } from 'react'

export type FontSize = 'large' | 'xlarge'
export interface UserPreferences {
  fontSize: FontSize
  autoFullscreen: boolean
  autoPlay: boolean
  rememberProgress: boolean
  controlHideSeconds: 3 | 5 | 8
  defaultVolume: number
}
export interface UserProfile { name: string }

interface SettingsProps {
  value: UserPreferences
  onChange: (value: UserPreferences) => void
  onClose: () => void
}

export function SettingsModal({ value, onChange, onClose }: SettingsProps) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="source-modal preferences-modal">
      <div className="modal-head"><div className="modal-icon"><Settings/></div><div><h2>Ayarlar</h2><p>Saltatrix TV görünümünü ve oynatma davranışını düzenle.</p></div><button className="icon-btn" onClick={onClose}><X/></button></div>
      <div className="preference-title">GÖRÜNÜM</div>
      <div className="preference-list">
        <div className="preference-row"><span className="preference-icon"><Type/></span><div><b>Yazı boyutu</b><small>Menüler, kartlar ve oynatıcı metinleri</small></div><div className="segmented"><button className={value.fontSize === 'large' ? 'active' : ''} onClick={() => onChange({ ...value, fontSize: 'large' })}>Büyük</button><button className={value.fontSize === 'xlarge' ? 'active' : ''} onClick={() => onChange({ ...value, fontSize: 'xlarge' })}>Çok büyük</button></div></div>
      </div>
      <div className="preference-title">OYNATMA</div>
      <div className="preference-list">
        <div className="preference-row"><span className="preference-icon"><Maximize/></span><div><b>Otomatik tam ekran</b><small>İçerik başlayınca doğrudan tam ekrana geç</small></div><button className={`switch ${value.autoFullscreen ? 'on' : ''}`} aria-label="Otomatik tam ekran" onClick={() => onChange({ ...value, autoFullscreen: !value.autoFullscreen })}><i/></button></div>
        <div className="preference-row"><span className="preference-icon"><PlayCircle/></span><div><b>Otomatik oynatma</b><small>İçeriği açar açmaz oynatmaya başla</small></div><button className={`switch ${value.autoPlay ? 'on' : ''}`} aria-label="Otomatik oynatma" onClick={() => onChange({ ...value, autoPlay: !value.autoPlay })}><i/></button></div>
        <div className="preference-row"><span className="preference-icon"><History/></span><div><b>Kaldığın yeri hatırla</b><small>Film ve dizi ilerlemesini bu cihazda sakla</small></div><button className={`switch ${value.rememberProgress ? 'on' : ''}`} aria-label="Kaldığın yeri hatırla" onClick={() => onChange({ ...value, rememberProgress: !value.rememberProgress })}><i/></button></div>
        <div className="preference-row"><span className="preference-icon"><Eye/></span><div><b>Kontrolleri gizle</b><small>Hareketsizlikten sonra oynatıcı çubuklarını kapat</small></div><div className="segmented compact"><button className={value.controlHideSeconds === 3 ? 'active' : ''} onClick={() => onChange({ ...value, controlHideSeconds: 3 })}>3 sn</button><button className={value.controlHideSeconds === 5 ? 'active' : ''} onClick={() => onChange({ ...value, controlHideSeconds: 5 })}>5 sn</button><button className={value.controlHideSeconds === 8 ? 'active' : ''} onClick={() => onChange({ ...value, controlHideSeconds: 8 })}>8 sn</button></div></div>
        <div className="preference-row volume-preference"><span className="preference-icon"><Volume2/></span><div><b>Varsayılan ses</b><small>Yeni açılan içeriklerin başlangıç seviyesi</small></div><strong>%{Math.round(value.defaultVolume * 100)}</strong><input aria-label="Varsayılan ses seviyesi" type="range" min="0" max="1" step="0.05" value={value.defaultVolume} onChange={(event) => onChange({ ...value, defaultVolume: Number(event.target.value) })}/></div>
      </div>
      <button className="primary-btn settings-done" onClick={onClose}>Tamam</button>
    </div>
  </div>
}

interface ProfileProps {
  value: UserProfile
  onSave: (value: UserProfile) => void
  onClose: () => void
}

export function ProfileModal({ value, onSave, onClose }: ProfileProps) {
  const [name, setName] = useState(value.name)
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('tr-TR') || 'ST'
  const save = () => { onSave({ name: name.trim() || 'İyi seyirler' }); onClose() }
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="source-modal preferences-modal profile-modal">
      <div className="modal-head"><div className="modal-icon"><UserRound/></div><div><h2>Profilim</h2><p>Uygulamada görünecek profil adını düzenle.</p></div><button className="icon-btn" onClick={onClose}><X/></button></div>
      <div className="profile-editor"><div className="profile-avatar-large">{initials}</div><label>Profil adı<input autoFocus value={name} maxLength={32} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && save()} placeholder="Profil adın"/></label></div>
      <button className="primary-btn settings-done" onClick={save}><Save/> Profili kaydet</button>
    </div>
  </div>
}
