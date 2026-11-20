# MRY GAMES — stüdyo web sitesi

MRY GAMES'in yayınladığı ve geliştirdiği mobil oyunları tanıtan, Türkçe + İngilizce statik site.

- **Bağımlılık yok.** Yalnızca Node.js (18+) gerekir; `npm install` yapmanız gerekmez.
- **Veri odaklı.** Metinler, oyunlar ve gizlilik politikaları `content/` altındaki JSON dosyalarından gelir. HTML'e elle dokunulmaz.
- **Çıktı:** `dist/` (git'e girmez). GitHub Pages bunu GitHub Actions ile kendisi derler.

## Hızlı başlangıç

```bash
npm run dev
```

Siteyi derler ve http://localhost:4173/ adresinde açar. İçerik değiştirdikten sonra durdurup yeniden çalıştırın.

| Komut | Ne yapar |
|---|---|
| `npm run build` | `content/` → `dist/` |
| `npm test` | Derler, sonra tüm iç bağlantıları, görselleri, `<title>`/`<h1>`/`alt` metinlerini denetler |
| `npm run serve` | `dist/` klasörünü yerelde sunar |
| `npm run build:strict` | Uyarıları da hata sayar. **Yayına almadan önce** bununla derleyin. |

Derleme, eksik/yanlış veride durur (ör. bulunamayan görsel, boş başlık). Yer tutucular (taslak gizlilik metni, örnek e-posta, yer tutucu paket adı) ise `WARN` olarak listelenir.

## Klasör yapısı

```
content/
  site.json                 Stüdyo adı, slogan, hakkımızda, değerler, iletişim, site URL'si
  i18n.json                 Arayüz metinleri ve URL'ler (tr / en)
  legal/
    studio-privacy.tr|en.json   Genel gizlilik politikası
    game-privacy.tr|en.json     Oyun gizlilik şablonu (oyunun privacy bayraklarına göre bölümler açılır)
  games/
    _template/game.json     Yeni oyun için kopyalanacak şablon (derlemeye girmez)
    kasabayi-yeniden-kur/
      game.json             Oyunun tüm verisi
      media/                Ekran görüntüleri, kapak, ikon, portreler (+ SOURCES.md)
assets/                     CSS, fontlar (Baloo 2, Nunito — SIL OFL 1.1)
src/                        build.mjs (oluşturucu), check.mjs (denetim), serve.mjs, icons.mjs (logo + ikonlar)
tools/prepare_media.py      Görselleri WebP'ye çevirir, kırpar; fontları alt kümeye indirir
.github/workflows/pages.yml GitHub Pages dağıtımı
```

Oluşan adresler:

| Sayfa | Türkçe | English |
|---|---|---|
| Ana sayfa | `/` | `/en/` |
| Oyunlar | `/oyunlar/` | `/en/games/` |
| Oyun | `/oyunlar/<slug>/` | `/en/games/<slug>/` |
| **Oyun gizlilik politikası** | `/oyunlar/<slug>/gizlilik/` | `/en/games/<slug>/privacy/` |
| Hakkımızda / İletişim | `/hakkimizda/`, `/iletisim/` | `/en/about/`, `/en/contact/` |
| Genel gizlilik | `/gizlilik/` | `/en/privacy/` |

Google Play Console'daki "Gizlilik politikası" alanına oyunun gizlilik sayfasının tam adresini yazın (ör. `https://<alan-adı>/oyunlar/kasabayi-yeniden-kur/gizlilik/`).

## Yeni oyun ekleme

1. **Klasörü oluşturun.** `content/games/_template` klasörünü kopyalayıp oyunun kısa adıyla adlandırın: yalnızca küçük harf, rakam ve tire (ör. `content/games/minik-kafe`). Bu ad URL olur ve sonradan değiştirilmemelidir.
2. **`game.json`'u doldurun.**
   - `slug`: klasör adıyla aynı.
   - `order`: listede sıra (küçük olan önce). Ana sayfada öne çıkacaksa `featured: true` (yalnızca bir oyunda).
   - `status`: `in-development`, `coming-soon` veya `released`. `released` için `googlePlayUrl` zorunludur.
   - Tüm metinler `{ "tr": "...", "en": "..." }` biçimindedir.
   - `accent` / `accentDeep`: oyun sayfasının vurgu renkleri (`#rrggbb`).
   - `features[].icon`: `merge, sprout, house, book, leaf, heart, sparkle, shield, mail, pin, globe, play` (yenisi için `src/icons.mjs`).
3. **Görselleri hazırlayın** (`media/` klasörüne):
   ```bash
   python tools/prepare_media.py shot  "<kaynak>/ekran1.png" content/games/minik-kafe/media/shot-1.webp
   ```
   ```bash
   python tools/prepare_media.py crop  "<kaynak>/ekran1.png" content/games/minik-kafe/media/cover.webp --box 0 600 1080 1208 --width 1080
   ```
   ```bash
   python tools/prepare_media.py fit   "<kaynak>/ikon.png" content/games/minik-kafe/media/icon.webp --width 256
   ```
   Gerekenler: `icon` (kare, 256 px), `cover` (16:9), `heroShot` ve ekran görüntüleri (dikey telefon, 720 px genişlik), isteğe bağlı `og.jpg` (1200×630). Kaynakları `media/SOURCES.md` içine yazın.
4. **Gizlilik bayraklarını gerçeğe göre ayarlayın** (`privacy`): `ads`, `inAppPurchases`, `analytics`, `localSaveOnly`, `childDirected`. Şablon bu bayraklara göre bölümleri ekler/çıkarır. Kullanılan her SDK'yı `thirdParties` listesine adı, amacı ve gizlilik bağlantısıyla ekleyin.
5. **Derleyip denetleyin:** `npm test`, sonra `npm run dev` ile sayfaya bakın (masaüstü ve telefon genişliği).
6. Ana sayfa, oyunlar listesi, menüler, gizlilik sayfaları ve site haritası otomatik güncellenir; başka dosyaya dokunmaya gerek yoktur.

## Yayına alma (GitHub Pages)

> Bu adımlar dış dünyaya etki eder; henüz **yapılmadı**.

1. GitHub'da bir depo açın ve bu klasörü push edin.
2. Depo → Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. `main`'e her push'ta site derlenip yayınlanır (`.github/workflows/pages.yml`).
4. `content/site.json` → `url` alanına sitenin tam adresini yazın (ör. `https://mrygames.com` veya `https://<kullanıcı>.github.io/<depo>`). Bu, canonical bağlantıları, `sitemap.xml`'i ve sosyal önizleme görsellerini açar; 404 sayfasının alt klasörde doğru çalışması için de gereklidir.
5. Alan adı alırsanız `site.json`'a `"cname": "mrygames.com"` ekleyin ve alan adı sağlayıcınızda GitHub Pages DNS kayıtlarını tanımlayın.

## Yayından önce yapılacaklar

`npm run build:strict` bunların hepsi bitene kadar hata verir:

- [ ] Gerçek iletişim e-postası (`site.json` → `contact.email`, `emailIsPlaceholder: false`).
- [ ] Gizlilik metinlerinin hukuki gözden geçirmesi; ardından `site.json` → `legal.privacyDraft` ve `game.json` → `privacy.draft` = `false`.
- [ ] Reklam ağı ve analitik sağlayıcısı seçilince `thirdParties` listesine eklenmesi, `pendingThirdParties` metninin boşaltılması.
- [ ] Nihai paket adı (`packageId`, `packageIdIsPlaceholder: false`).
- [ ] Hedef yaş kararı (`childDirected`) — Play Console'daki hedef kitle ayarıyla aynı olmalı.
- [ ] Reklam ağı istediğinde `site.json` → `appAdsTxt` satırları (siteye `app-ads.txt` olarak yazılır).
- [ ] Temiz kayıtla çekilmiş ekran görüntüleri ve gerçek uygulama ikonu.

## Marka

Logo (`src/icons.mjs` → `LOGO_MARK_SVG`): terakota karo üzerinde, kakao konturlu küçük, onarılmış bir ev ve filiz. Renkler oyunların sıcak paletinden gelir: krem `#F4E6C9`, parşömen `#E8D3A8`, kakao `#59402F`, terakota `#C97850`, yaprak yeşili `#78A85B`, altın `#E8B94F`. Bu bir öneridir; değiştirmek için yalnızca SVG ve `assets/site.css` içindeki `:root` değişkenleri düzenlenir.
