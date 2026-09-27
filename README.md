# Saltatrix TV

Sade ve akıcı bir arayüze sahip web ve Windows IPTV oynatıcı.

![Saltatrix TV arayüzü](artifacts/saltatrix-tv-preview.png)

[Canlı uygulama](https://saltatrixtv.alperensenel.com) · [Windows sürümünü indir](https://github.com/saltatrix-hub/saltatrixtv.alperensenel.com/releases/latest)

## Özellikler

- Xtream Codes kullanıcı adı / parola bağlantısı
- M3U ve M3U8 URL veya yerel dosya desteği
- Canlı TV, film ve dizi ayrımı
- Otomatik kategori oluşturma, arama ve filtreleme
- Favoriler ve kaynak bilgisini cihazda saklama
- HLS canlı yayın oynatma, ses, tam ekran ve sonraki kanal kontrolleri
- Masaüstü, tablet ve mobil uyumlu arayüz
- Windows için kurulabilir masaüstü uygulaması

## Çalıştırma

```bash
npm install
npm run dev
```

Ardından terminalde gösterilen `http://127.0.0.1:4173` adresini açın.

Canlı sürüm: [saltatrixtv.alperensenel.com](https://saltatrixtv.alperensenel.com)

## Windows sürümü

```bash
npm run desktop
npm run desktop:build
```

Kurulum dosyası `release/` klasöründe oluşturulur.

> Proje yolunda `#` karakteri bulunduğu için `dev` komutu önce üretim paketini oluşturur, sonra yerel önizleme sunucusunu başlatır. Kod değişikliğinden sonra komutu yeniden başlatın.

## Web yayını

`main` dalına gönderilen her güncelleme GitHub Actions tarafından derlenir ve GitHub Pages üzerinden otomatik olarak `saltatrixtv.alperensenel.com` adresine dağıtılır.

## Notlar

- Uygulama yayın veya abonelik sağlamaz; yalnızca kullanıcının yetkili olduğu kaynakları oynatır.
- Uzak M3U/Xtream sunucusunun tarayıcı erişimine (CORS) izin vermesi gerekir.
- Xtream ve M3U bağlantıları doğrudan IPTV sağlayıcısına yapılır; uygulamada üçüncü taraf bir ara sunucu yoktur.
