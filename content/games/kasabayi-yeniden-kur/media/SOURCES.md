# Kasabayı Yeniden Kur — görsel kaynakları

Tüm görseller oyunun kendi projesinden (`cozyMergeTown-life`) üretildi; kaynak dosyalar yalnızca okundu.
Üretim komutu: `python tools/prepare_media.py ...` (bkz. README).

| Dosya | Kaynak | İşlem |
|---|---|---|
| shot-town.webp | `ArtSource/StyleConcepts/qa/S2_start.png` (S25 Ultra, 1080×2340) | 720 px genişlik |
| shot-board.webp | `ArtSource/StyleConcepts/qa/F7_tab_Merge.png` | 720 px genişlik |
| shot-orders.webp | `ArtSource/StyleConcepts/qa/F7_tab_Orders.png` | 720 px genişlik |
| shot-farm.webp | `ArtSource/StyleConcepts/qa/F4_farm.png` | 720 px genişlik |
| cover.webp | `S2_start.png` kırpma `0 660 1080 1268` | 16:9 kapak |
| og.jpg | `S2_start.png` kırpma `0 680 1080 1247` | 1200×630 sosyal önizleme |
| icon.webp | `S2_start.png` kırpma `110 660 790 1340` | 256 px, **geçici** (gerçek uygulama ikonu yok) |
| portrait-*.webp | `Game/Assets/Art/UI/Portraits/POR_<Ad>_happy.png` | 256 px, şeffaf |

Not: Ekran görüntüleri geliştirme kaydından alındı; üst çubukta test değerleri (ör. 535/100 enerji) görünüyor.
Mağaza yayını öncesinde temiz bir kayıtla yeniden çekilmeli.
