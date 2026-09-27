import { Maximize, Save, Settings, Type, UserRound, X } from 'lucide-react'
import { useState } from 'react'

export type FontSize = 'large' | 'xlarge'
export interface UserPreferences { fontSize: FontSize; autoFullscreen: boolean }
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
      <div className="preference-list">
        <div className="preference-row"><span className="preference-icon"><Type/></span><div><b>Yazı boyutu</b><small>Menüler, kartlar ve oynatıcı metinleri</small></div><div className="segmented"><button className={value.fontSize === 'large' ? 'active' : ''} onClick={() => onChange({ ...value, fontSize: 'large' })}>Büyük</button><button className={value.fontSize === 'xlarge' ? 'active' : ''} onClick={() => onChange({ ...value, fontSize: 'xlarge' })}>Çok büyük</button></div></div>
        <div className="preference-row"><span className="preference-icon"><Maximize/></span><div><b>Otomatik tam ekran</b><small>İçerik başlayınca doğrudan tam ekrana geç</small></div><button className={`switch ${value.autoFullscreen ? 'on' : ''}`} aria-label="Otomatik tam ekran" onClick={() => onChange({ ...value, autoFullscreen: !value.autoFullscreen })}><i/></button></div>
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
