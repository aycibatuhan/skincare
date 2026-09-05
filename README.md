# Skincare

A personal skincare-routine tracker: tick off your morning and evening steps, let the app manage retinal phase transitions, log symptoms for your dermatologist, and keep an inventory of what you use. Single user, no backend, no accounts — everything stays on your device.

Turkish / English UI. Works as a PWA on the phone, as a single HTML file, or as a native macOS app (WKWebView wrapper, DMG).

> This public copy ships with **example data** (generic routine, sample products, drawn placeholder icons). Edit `data.js` or simply change everything inside the app.

*Türkçe açıklama aşağıda.*

## Features

- **Today** — morning / evening checklists (the right tab opens by time of day), step notes, warning badges (area, amount, wait, sandwich). Everything is editable in place: names, notes, order, hide/add steps, photos.
- **Phase system** — September transition routine → October F1 / F2 / F3 for retinal. The phase is computed from the retinal start date and *confirmed* transitions; the app suggests the next phase when the time is up, it never advances on its own. Going back a phase is a normal action.
- **Retinal nights** — you pick the weekdays; the evening list shows "Retinal night" or "No retinal tonight". Patch-test note for the eye serum in the first 4 nights of F2.
- **Log** — redness 0-3, acne severity 0-3, stinging yes/no, free note. Three consecutive days of stinging trigger a "step down the frequency" warning.
- **Inventory** — in use / queued / pending / give away, moisturizer and eye-cream rotation (mark "Done", the next one takes over), add / edit / remove products, product photos, NYC shopping list.
- **Calendar** — completed and partial days, retinal nights, adherence percentages.
- **Reference** — free-form notes (pre-filled with expectation calibration, dermatologist agenda, phase plan, application areas), INCI red/yellow flag filter, colour-coded face map.
- **Settings** — language, app name, four base colours (everything else is derived), light / dark / system, export / import JSON, reset.

## Install

**Phone (recommended):** open `dist/skincare.html` in Safari / Chrome and use *Add to Home Screen*. Or host the folder on any HTTPS server; the service worker then caches it for offline use.

**macOS app:** run `macos/build.sh` (needs Xcode command-line tools) and open the DMG it produces in `build/`. Universal binary, macOS 12+, ad-hoc signed — on first launch right-click → Open.

**Browser on a computer:**

```bash
python3 -m http.server 8765
```

then open `http://localhost:8765/`.

## Build

```bash
python3 build.py      # dist/skincare.html (single file, images inlined)
macos/build.sh        # build/Skincare.app + build/Skincare-<version>.dmg
```

## Project layout

| File | What it is |
|---|---|
| `index.html` | Shell, navigation, pre-paint theme script |
| `data.js` | Domain content: routines, badges, products, shopping list, reference texts, default notes |
| `i18n.js` | EN dictionary keyed by the Turkish source strings, `tx()` and post-render `translateDOM()` |
| `app.js` | State (localStorage), phase logic, rendering, editing, photos, settings |
| `styles.css` | Design tokens (`--c-accent`, `--c-secondary`, `--c-neutral`, `--c-bg`) and components |
| `img/` | Placeholder product icons (SVG). Add real photos from inside the app |
| `macos/` | `main.swift` (WKWebView wrapper, `skincare://` scheme, file picker), `Info.plist`, `build.sh`, `makeicon.swift` |
| `sw.js`, `manifest.json`, `icon.png` | PWA |

## Data and privacy

All data lives in `localStorage` under the key `skincare-v1` (the macOS app keeps it under its own WebKit data store). Nothing is sent anywhere. *Export* in Settings gives you a JSON copy; *Import* restores it. Uploaded photos are downscaled to 320 px and stored as data URLs inside the same JSON.

## Notes

- The routine, products and reference texts are generic examples. The app is data, not advice — see the disclaimer in Settings.
- Phase model: `retinalStartDate` (default: first day of next month) plus confirmed `f2StartDate` / `f3StartDate`. Going back clears the transition date and mutes the suggestion for a week.

## License

MIT — see `LICENSE`.

---

# Skincare (Türkçe)

Kişisel cilt bakım rutini takip uygulaması: sabah ve akşam adımlarını tikle, retinal faz geçişlerini uygulama yönetsin, dermatolog randevusu için belirti kaydı tut, elindeki ürünlerin envanterini gör. Tek kullanıcı, backend yok, hesap yok — her şey cihazında kalır.

> Bu herkese açık kopya **örnek veriyle** gelir (genel bir rutin, örnek ürünler, çizim simgeler). `data.js` dosyasını düzenle ya da her şeyi uygulama içinden değiştir.

Türkçe / İngilizce arayüz. Telefonda PWA olarak, tek HTML dosyası olarak ya da yerel macOS uygulaması (WKWebView sarmalayıcı, DMG) olarak çalışır.

## Özellikler

- **Bugün** — sabah / akşam listeleri (saate göre doğru sekme açılır), adım notları, uyarı rozetleri (alan, miktar, bekle, sandviç). Her şey yerinde düzenlenir: ad, not, sıra, gizle/ekle, fotoğraf.
- **Faz sistemi** — Eylül geçiş rutini → retinal için Ekim F1 / F2 / F3. Faz, retinal başlangıç tarihi ve *onaylanan* geçişlerden hesaplanır; süre dolunca uygulama önerir, kendi kendine ilerlemez. Bir önceki faza dönmek normal bir işlem.
- **Retinal geceleri** — günleri sen seçersin; akşam listesinde "Retinal gecesi" ya da "Bu gece retinal yok" görünür. F2'nin ilk 4 gecesinde göz serumu için yama testi notu.
- **Günlük** — kızarıklık 0-3, sivilcelenme 0-3, batma var/yok, serbest not. Ardışık üç gün batma "sıklığı bir kademe düşür" uyarısı verir.
- **Envanter** — kullanımda / sırada / karar bekliyor / verilecek, nemlendirici ve göz kremi rotasyonu ("Bitti" deyince sıradaki devreye girer), ürün ekle / düzenle / kaldır, ürün fotoğrafı, NYC alışveriş listesi.
- **Takvim** — tamamlanan ve kısmen tamamlanan günler, retinal geceleri, uyum yüzdeleri.
- **Referans** — serbest notlar (beklenti kalibrasyonu, dermatolog gündemi, faz planı, uygulama alanları ile önceden dolu), INCI kırmızı/sarı bayrak filtresi, renk kodlu yüz haritası.
- **Ayarlar** — dil, uygulama adı, dört ana renk (diğer tonlar türetilir), açık / koyu / sistem, JSON dışa/içe aktarma, sıfırlama.

## Kurulum

**Telefon (önerilen):** `dist/skincare.html` dosyasını Safari / Chrome'da aç, *Ana Ekrana Ekle*. Ya da klasörü herhangi bir HTTPS sunucuda barındır; service worker çevrimdışı kullanım için önbelleğe alır.

**macOS uygulaması:** `macos/build.sh` çalıştır (Xcode komut satırı araçları gerekir), `build/` altında çıkan DMG'yi aç. Evrensel ikili, macOS 12+, ad-hoc imzalı — ilk açılışta sağ tık → Aç.

**Bilgisayarda tarayıcı:**

```bash
python3 -m http.server 8765
```

sonra `http://localhost:8765/` adresini aç.

## Derleme

```bash
python3 build.py      # dist/skincare.html (tek dosya, görseller gömülü)
macos/build.sh        # build/Skincare.app + build/Skincare-<sürüm>.dmg
```

## Dosya düzeni

| Dosya | Ne |
|---|---|
| `index.html` | İskelet, gezinme, ilk boyama öncesi tema betiği |
| `data.js` | Alan içeriği: rutinler, rozetler, ürünler, alışveriş listesi, referans metinleri, varsayılan notlar |
| `i18n.js` | Türkçe kaynak metinle anahtarlı EN sözlüğü, `tx()` ve render sonrası `translateDOM()` |
| `app.js` | Durum (localStorage), faz mantığı, render, düzenleme, fotoğraf, ayarlar |
| `styles.css` | Tasarım değişkenleri (`--c-accent`, `--c-secondary`, `--c-neutral`, `--c-bg`) ve bileşenler |
| `img/` | Yer tutucu ürün simgeleri (SVG). Gerçek fotoğrafları uygulama içinden ekle |
| `macos/` | `main.swift` (WKWebView sarmalayıcı, `skincare://` şeması, dosya seçici), `Info.plist`, `build.sh`, `makeicon.swift` |
| `sw.js`, `manifest.json`, `icon.png` | PWA |

## Veri ve gizlilik

Tüm veri `localStorage` içinde `skincare-v1` anahtarında tutulur (macOS uygulaması kendi WebKit deposunu kullanır). Hiçbir yere gönderilmez. Ayarlar'daki *Dışa aktar* JSON kopya verir, *İçe aktar* geri yükler. Yüklenen fotoğraflar 320 px'e küçültülüp aynı JSON içinde data URL olarak saklanır.

## Notlar

- Rutin, ürünler ve referans metinleri genel örneklerdir. Uygulama veridir, tavsiye değil — Ayarlar'daki uyarıya bak.
- Faz modeli: `retinalStartDate` (varsayılan: gelecek ayın ilk günü) + onaylı `f2StartDate` / `f3StartDate`. Geri dönüş geçiş tarihini siler ve öneriyi bir hafta susturur.

## Lisans

MIT — bkz. `LICENSE`.
