import type { Channel } from './types'

export const demoChannels: Channel[] = [
  { id: 'd1', tvgId: 'TRT1.tr', name: 'TRT 1', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/TRT_1_logo_%282021-%29.svg/960px-TRT_1_logo_%282021-%29.svg.png', category: 'Ulusal', type: 'live', quality: 'HD', language: 'TR', now: 'Günün Özeti', next: 'Ana Haber', progress: 68, url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
  { id: 'd2', tvgId: 'TRTHaber.tr', name: 'TRT Haber', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/TRT_Haber_Eyl%C3%BCl_2020_Logo.svg/960px-TRT_Haber_Eyl%C3%BCl_2020_Logo.svg.png', category: 'Haber', type: 'live', quality: 'HD', language: 'TR', now: 'Gündem', next: 'Dünya Gündemi', progress: 32, url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
  { id: 'd3', tvgId: 'TRTSpor.tr', name: 'TRT Spor', logo: 'https://i.imgur.com/6tv0zxh.png', category: 'Spor', type: 'live', quality: 'FHD', language: 'TR', now: 'Spor Merkezi', next: 'Canlı Analiz', progress: 47, url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
  { id: 'd4', tvgId: 'TRTCocuk.tr', name: 'TRT Çocuk', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/TRT_%C3%87ocuk_logo_%282021%29.svg/960px-TRT_%C3%87ocuk_logo_%282021%29.svg.png', category: 'Çocuk', type: 'live', quality: 'HD', language: 'TR', now: 'Renkli Dostlar', next: 'Uzay Günlüğü', progress: 21, url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
  { id: 'd5', tvgId: 'TRTBelgesel.tr', name: 'TRT Belgesel', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/TRT_Belgesel_logo_%282019-%29.svg/960px-TRT_Belgesel_logo_%282019-%29.svg.png', category: 'Belgesel', type: 'live', quality: '4K', language: 'TR', now: 'Mavi Gezegen', next: 'Yabanın Sesi', progress: 76, url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
  { id: 'd6', tvgId: 'NTV.tr', name: 'NTV', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/NTV_%28Turkey%29_logo.svg/960px-NTV_%28Turkey%29_logo.svg.png', category: 'Haber', type: 'live', quality: 'HD', language: 'TR', now: 'Haber Merkezi', next: 'Yakın Plan', progress: 54, url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
  { id: 'd7', tvgId: 'CNNTurk.tr', name: 'CNN Türk', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/CNN_T%C3%BCrk_logo.svg/960px-CNN_T%C3%BCrk_logo.svg.png', category: 'Haber', type: 'live', quality: 'FHD', language: 'TR', now: 'Türkiye Gündemi', next: 'Gece Haberleri', progress: 83, url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
  { id: 'd8', tvgId: 'PowerTurkTV.tr', name: 'PowerTürk TV', logo: 'https://i.imgur.com/9OPoXQG.png', category: 'Müzik', type: 'live', quality: 'HD', language: 'TR', now: 'Hit Müzik', next: 'Yeni Çıkanlar', progress: 40, url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
]

export const categoryColors: Record<string, string> = {
  Tümü: '#ffffff', Haber: '#52b6ff', Spor: '#7bdb79', Sinema: '#b985ff', Çocuk: '#ffca57',
  Belgesel: '#42dfba', Eğlence: '#ff7697', Müzik: '#ff9868', Diğer: '#8f96aa'
}
