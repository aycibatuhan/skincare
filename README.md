# Skincare

A personal skincare-routine tracker that lives entirely on your device: tick off your morning and evening steps, let the app manage retinal phase transitions, log symptoms for your dermatologist, and keep an inventory of what you use. Single user, no backend, no accounts, no telemetry — everything stays in your browser's `localStorage`.

Turkish / English UI. Runs as a **PWA** on your phone, as a **single HTML file** you can open anywhere, or as a **native macOS app** (WKWebView wrapper, DMG).

> This public copy ships with **example data** (a generic routine, sample products, drawn placeholder icons). Edit `data.js` or change everything from inside the app — nothing is hardcoded into the UI.

*Türkçe açıklama aşağıda.*

---

## Table of contents

- [Features](#features)
- [Screens](#screens)
- [The phase system](#the-phase-system)
- [Data model](#data-model)
- [Internationalization](#internationalization)
- [Install](#install)
- [Build](#build)
- [Project layout](#project-layout)
- [Data and privacy](#data-and-privacy)
- [Development notes](#development-notes)
- [FAQ](#faq)
- [License](#license)

---

## Features

### Today — morning / evening checklists

- The right tab opens automatically by time of day (before noon → morning, after → evening).
- Each step can carry a **note**, a **warning badge**, and a **product photo**.
- Warning badges: **Area** (application area is critical), **Amount** (half a teaspoon of SPF), **Wait** (let it dry), **Sandwich** (moisturizer → retinal → moisturizer during the first 4 weeks).
- Everything is editable in place: step names, notes, order, hide/add steps, photos. Tap the edit mode to rearrange with up/down tools, hide steps you don't use, or add your own.
- Steps can be **dynamic** (the current moisturizer / eye cream from your inventory is shown) or **conditional** (only appear in certain phases, e.g. salicylic acid in prep, retinal in active phases).

### Phase system — retinal transition management

- Four phases: **Prep** (September transition routine, no actives) → **Phase 1** (retinal 2 nights/week) → **Phase 2** (retinal every other day + eye serum) → **Phase 3** (retinal up to 5 nights/week).
- The phase is computed from the **retinal start date** and **confirmed transitions** — the app suggests the next phase when the time is up, it never advances on its own.
- Going back a phase is a normal action: it clears the transition date and mutes the suggestion for a week.
- Built-in guidance: patch-test note for the eye serum in the first 4 nights of Phase 2, sandwich method reminder in Phase 1, "wait a week if stinging or persistent redness in the last 2 weeks" transition texts.

### Retinal nights

- You pick the weekdays; the evening list then shows "Retinal night" or "No retinal tonight".
- The salicylic-acid night is added once a week during prep and hidden in active phases (re-enable manually if you want).

### Log — symptom tracking for your dermatologist

- Redness 0–3, acne severity 0–3, stinging yes/no, plus a free-text note per day.
- Three consecutive days of stinging trigger a "step down the frequency" warning (it suggests reducing, not stopping).
- Browse by date with prev/next navigation.

### Inventory

- Product statuses: **in use / queued / pending decision / give away** (with a reason).
- **Rotation groups** for moisturizer and eye cream: mark the current one "Done" and the next queued product takes over automatically.
- Add / edit / remove products, attach photos, and keep a **NYC shopping list** with prices.

### Calendar

- Completed and partial days, retinal nights, and adherence percentages per month.

### Reference

- Free-form notes, pre-filled with: expectation calibration, dermatologist appointment agenda, phase plan, stinging rule, sunscreen notes.
- **INCI filter**: red/yellow flag lists for ingredients (fragrance allergens, Malassezia-feeding fatty acids, etc.) with a note on fold areas.
- Colour-coded **face map** showing where azelaic acid, retinal, and salicylic acid are OK / caution / no-go.

### Settings

- Language (Turkish / English), app name, **four base colours** (accent, secondary, neutral, background — every other tone is derived from them via `color-mix`), light / dark / system theme.
- Export / import JSON, full reset.
- Medical disclaimer shown in-app.

---

## Screens

| Tab | What it does |
|---|---|
| **Bugün / Today** | Morning & evening checklists, retinal-night status, phase card |
| **Günlük / Log** | Daily symptom entries (redness, acne, stinging, note) |
| **Envanter / Inventory** | Products, rotation groups, shopping list |
| **Takvim / Calendar** | Month grid, adherence stats |
| **Referans / Reference** | Notes, INCI filter, face map |
| **Ayarlar / Settings** | Language, name, colours, theme, export/import, reset |

---

## The phase system

The phase is derived from three dates:

| Field | Meaning |
|---|---|
| `retinalStartDate` | First day of the active phase (default: first day of next month) |
| `f2StartDate` | Confirmed transition to Phase 2 (retinal every other day) |
| `f3StartDate` | Confirmed transition to Phase 3 (up to 5 nights/week) |

- **Prep** runs until `retinalStartDate`.
- **Phase 1** runs from `retinalStartDate` until `f2StartDate` (suggested after 4 weeks).
- **Phase 2** runs from `f2StartDate` until `f3StartDate` (suggested after 8 weeks).
- **Phase 3** from `f3StartDate` onward.

The app only *suggests* transitions when the time is up; you confirm them. Going back a phase deletes the transition date and silences the suggestion for a week. The suggested retinal nights per phase: Phase 1 → 2 nights/week, Phase 2 → every other day (3–4 nights), Phase 3 → up to 5 nights.

---

## Data model

All state lives in `localStorage` under the key `skincare-v1` (the macOS app keeps its own WebKit data store, so the two don't collide). The shape is roughly:

```js
{
  settings: { language, appName, theme: { mode, accent, secondary, neutral, bg } },
  routine:  { steps, hidden steps, custom steps, order },
  phases:   { retinalStartDate, f2StartDate, f3StartDate, retinalNights: [weekdays] },
  log:      { "YYYY-MM-DD": { redness, acne, stinging, note } },
  products: [ { id, name, role, status, group, order, img, note } ],
  shopping: [ { id, name, where, price, img } ],
  notes:    [ { title, body } ],
  photos:   { "step-id": "data:image/jpeg;base64,..." }
}
```

- Photos are downscaled to **320 px** and stored as data URLs inside the same JSON — the export file is fully self-contained.
- *Export* in Settings gives you a JSON copy; *Import* restores it. Nothing is sent anywhere.

---

## Internationalization

- The source strings are Turkish; `i18n.js` holds an EN dictionary keyed by the Turkish source text.
- `tx()` translates at render time; `translateDOM()` re-translates the live DOM after a language switch.
- Adding a language = adding a dictionary; no template changes needed.

---

## Install

**Phone (recommended):** open `dist/skincare.html` in Safari / Chrome and use *Add to Home Screen*. Or host the folder on any HTTPS server; the service worker then caches it for offline use.

**macOS app:** run `macos/build.sh` (needs Xcode command-line tools) and open the DMG it produces in `build/`. Universal binary (arm64 + x86_64), macOS 12+, ad-hoc signed — on first launch right-click → Open.

**Browser on a computer:**

```bash
python3 -m http.server 8765
```

then open `http://localhost:8765/`.

---

## Build

```bash
python3 build.py      # dist/skincare.html (single file, images inlined)
macos/build.sh        # build/Skincare.app + build/Skincare-<version>.dmg
```

- `build.py` inlines CSS, JS, and all images as data URIs into one self-contained HTML file — open it from Files, email it, or AirDrop it; it works offline with no server.
- `macos/build.sh` compiles the Swift wrapper for both architectures, lipos them into a universal binary, generates the icon set, ad-hoc signs, and packs a DMG.

---

## Project layout

| File | What it is |
|---|---|
| `index.html` | Shell, navigation, pre-paint theme script (no flash of wrong theme) |
| `data.js` | Domain content: routines, badges, products, shopping list, reference texts, default notes, EN dictionary additions |
| `i18n.js` | EN dictionary keyed by the Turkish source strings, `tx()` and post-render `translateDOM()` |
| `app.js` | State (localStorage), phase logic, rendering, editing, photos, settings |
| `styles.css` | Design tokens (`--c-accent`, `--c-secondary`, `--c-neutral`, `--c-bg`) and components; all other tones derived with `color-mix` |
| `img/` | Placeholder product icons (SVG). Add real photos from inside the app |
| `macos/` | `main.swift` (WKWebView wrapper, `skincare://` scheme, file picker), `Info.plist`, `build.sh`, `makeicon.swift` |
| `sw.js`, `manifest.json`, `icon.png` | PWA: service worker (stale-while-revalidate), manifest, icons |
| `build.py` | Single-file distribution generator |
| `dist/` | Build output (gitignored, regenerate with `python3 build.py`) |

---

## Data and privacy

All data lives in `localStorage` under the key `skincare-v1` (the macOS app keeps it under its own WebKit data store). Nothing is sent anywhere. *Export* in Settings gives you a JSON copy; *Import* restores it. Uploaded photos are downscaled to 320 px and stored as data URLs inside the same JSON.

The app is **data, not advice** — see the disclaimer in Settings.

---

## Development notes

- **No build step for the source**: `index.html` + `data.js` + `i18n.js` + `app.js` + `styles.css` is the app. `build.py` only exists to produce the portable single file.
- **Theme system**: four base colours in Settings; every other tone is derived with CSS `color-mix`, so a palette change re-skins the whole app. The pre-paint script in `index.html` applies the saved theme before first paint to avoid flashing.
- **Phase logic** lives in `app.js` (`computePhase`, transition suggestions); the routine data is pure data in `data.js` — changing a routine never requires touching logic.
- **Service worker** uses a stale-while-revalidate strategy: cached assets render instantly offline, and the cache is refreshed in the background when online. Bump `CACHE` in `sw.js` when you change assets.
- **macOS wrapper** serves the web app over a custom `skincare://` scheme so `localStorage` persists inside the app, and wires a native file picker for photo uploads.

---

## FAQ

**Is my data synced between devices?** No — by design. Export JSON on one device, import on the other.

**Can I use it without the internet?** Yes. The single-file build and the PWA (once cached) both work fully offline.

**How do I change the routine?** Tap the edit (pencil) button on the Today tab: rename, reorder, hide, or add steps. Or edit `data.js` directly.

**How do I reset everything?** Settings → Reset. This clears `localStorage` for the app.

**Why does the app suggest but not advance phases?** Deliberate: phase transitions are decisions you confirm, not timers that fire.

---

## License

MIT — see `LICENSE`.

---

# Skincare (Türkçe)

Kişisel cilt bakım rutini takip uygulaması: sabah ve akşam adımlarını tikle, retinal faz geçişlerini uygulama yönetsin, dermatolog randevusu için belirti kaydı tut, elindeki ürünlerin envanterini gör. Tek kullanıcı, backend yok, hesap yok, telemetri yok — her şey tarayıcının `localStorage`'ında kalır.

> Bu herkese açık kopya **örnek veriyle** gelir (genel bir rutin, örnek ürünler, çizim simgeler). `data.js` dosyasını düzenle ya da her şeyi uygulama içinden değiştir — hiçbir şey arayüze gömülü değil.

Türkçe / İngilizce arayüz. Telefonda **PWA** olarak, **tek HTML dosyası** olarak ya da yerel **macOS uygulaması** (WKWebView sarmalayıcı, DMG) olarak çalışır.

## İçindekiler

- [Özellikler](#özellikler)
- [Ekranlar](#ekranlar)
- [Faz sistemi](#faz-sistemi)
- [Veri modeli](#veri-modeli)
- [Uluslararasılaştırma](#uluslararasılaştırma)
- [Kurulum](#kurulum)
- [Derleme](#derleme)
- [Dosya düzeni](#dosya-düzeni)
- [Veri ve gizlilik](#veri-ve-gizlilik)
- [Geliştirme notları](#geliştirme-notları)
- [SSS](#sss)
- [Lisans](#lisans)

## Özellikler

### Bugün — sabah / akşam listeleri

- Saate göre doğru sekme otomatik açılır (öğleden önce → sabah, sonra → akşam).
- Her adım **not**, **uyarı rozeti** ve **ürün fotoğrafı** taşıyabilir.
- Uyarı rozetleri: **Alan** (uygulama alanı kritik), **Miktar** (yarım çay kaşığı SPF), **Bekle** (kurumasını bekle), **Sandviç** (ilk 4 hafta: nemlendirici → retinal → nemlendirici).
- Her şey yerinde düzenlenir: ad, not, sıra, gizle/ekle, fotoğraf. Düzenleme modunda yukarı/aşağı araçlarıyla sırala, kullanmadığın adımları gizle, kendi adımını ekle.
- Adımlar **dinamik** (envanterdeki güncel nemlendirici / göz kremi gösterilir) ya da **koşullu** olabilir (sadece belirli fazlarda görünür: hazırlıkta salisilik, aktif fazlarda retinal).

### Faz sistemi — retinal geçiş yönetimi

- Dört faz: **Hazırlık** (Eylül geçiş rutini, aktif yok) → **Faz 1** (retinal haftada 2 gece) → **Faz 2** (retinal gün aşırı + göz serumu) → **Faz 3** (retinal haftada 5 geceye kadar).
- Faz, **retinal başlangıç tarihi** ve **onaylanan geçişlerden** hesaplanır; süre dolunca uygulama önerir, kendi kendine ilerlemez.
- Bir önceki faza dönmek normal bir işlemdir: geçiş tarihini siler ve öneriyi bir hafta susturur.
- Yerleşik rehberlik: F2'nin ilk 4 gecesinde göz serumu için yama testi notu, F1'de sandviç yöntemi hatırlatması, "son 2 haftada batma veya kalıcı kızarıklık varsa bir hafta bekle" geçiş metinleri.

### Retinal geceleri

- Günleri sen seçersin; akşam listesinde "Retinal gecesi" ya da "Bu gece retinal yok" görünür.
- Salisilik asit gecesi hazırlık fazında haftada bir eklenir, aktif fazlarda gizlenir (istersen manuel geri açarsın).

### Günlük — dermatolog için belirti kaydı

- Kızarıklık 0–3, sivilcelenme 0–3, batma var/yok, günlük serbest not.
- Ardışık üç gün batma "sıklığı bir kademe düşür" uyarısı verir (bırakmayı değil, azaltmayı önerir).
- Tarih ileri/geri gezinme ile gün gün incele.

### Envanter

- Ürün durumları: **kullanımda / sırada / karar bekliyor / verilecek** (gerekçesiyle).
- Nemlendirici ve göz kremi için **rotasyon grupları**: "Bitti" deyince sıradaki ürün otomatik devreye girer.
- Ürün ekle / düzenle / kaldır, fotoğraf ekle, **NYC alışveriş listesi** (fiyatlarla).

### Takvim

- Tamamlanan ve kısmen tamamlanan günler, retinal geceleri, aylık uyum yüzdeleri.

### Referans

- Serbest notlar; beklenti kalibrasyonu, dermatolog randevu gündemi, faz planı, batma kuralı, güneş kremi notlarıyla önceden dolu.
- **INCI filtresi**: kırmızı/sarı bayrak listeleri (parfüm alerjenleri, Malassezia'yı besleyen yağ asitleri vb.) ve kıvrım bölgeleri notu.
- Azelaik asit, retinal ve salisilik asidin nerelere uygun / dikkatli / yasak olduğunu gösteren renk kodlu **yüz haritası**.

### Ayarlar

- Dil (Türkçe / İngilizce), uygulama adı, **dört ana renk** (accent, secondary, neutral, background — diğer tüm tonlar `color-mix` ile türetilir), açık / koyu / sistem teması.
- JSON dışa/içe aktarma, sıfırlama.
- Uygulama içi tıbbi uyarı.

## Ekranlar

| Sekme | Ne yapar |
|---|---|
| **Bugün** | Sabah & akşam listeleri, retinal gecesi durumu, faz kartı |
| **Günlük** | Günlük belirti kayıtları (kızarıklık, sivilce, batma, not) |
| **Envanter** | Ürünler, rotasyon grupları, alışveriş listesi |
| **Takvim** | Ay ızgarası, uyum istatistikleri |
| **Referans** | Notlar, INCI filtresi, yüz haritası |
| **Ayarlar** | Dil, ad, renkler, tema, dışa/içe aktarma, sıfırlama |

## Faz sistemi

Faz üç tarihten türetilir:

| Alan | Anlamı |
|---|---|
| `retinalStartDate` | Aktif fazın ilk günü (varsayılan: gelecek ayın ilk günü) |
| `f2StartDate` | Faz 2'ye onaylanmış geçiş (retinal gün aşırı) |
| `f3StartDate` | Faz 3'e onaylanmış geçiş (haftada 5 geceye kadar) |

- **Hazırlık** `retinalStartDate`'e kadar sürer.
- **Faz 1** `retinalStartDate`'ten `f2StartDate`'e (4 hafta sonra önerilir).
- **Faz 2** `f2StartDate`'ten `f3StartDate`'e (8 hafta sonra önerilir).
- **Faz 3** `f3StartDate`'ten itibaren.

Uygulama süre dolunca yalnızca *önerir*; geçişi sen onaylarsın. Geri dönüş geçiş tarihini siler ve öneriyi bir hafta susturur. Faz başına önerilen retinal geceleri: Faz 1 → haftada 2 gece, Faz 2 → gün aşırı (3–4 gece), Faz 3 → haftada 5 geceye kadar.

## Veri modeli

Tüm durum `localStorage` içinde `skincare-v1` anahtarında tutulur (macOS uygulaması kendi WebKit deposunu kullanır, ikisi çakışmaz). Kabaca:

```js
{
  settings: { language, appName, theme: { mode, accent, secondary, neutral, bg } },
  routine:  { steps, hidden steps, custom steps, order },
  phases:   { retinalStartDate, f2StartDate, f3StartDate, retinalNights: [hafta günleri] },
  log:      { "YYYY-MM-DD": { redness, acne, stinging, note } },
  products: [ { id, name, role, status, group, order, img, note } ],
  shopping: [ { id, name, where, price, img } ],
  notes:    [ { title, body } ],
  photos:   { "adım-id": "data:image/jpeg;base64,..." }
}
```

- Fotoğraflar **320 px**'e küçültülüp aynı JSON içinde data URL olarak saklanır — dışa aktarılan dosya tamamen kendi kendine yeterlidir.
- Ayarlar'daki *Dışa aktar* JSON kopya verir, *İçe aktar* geri yükler. Hiçbir şey dışarı gönderilmez.

## Uluslararasılaştırma

- Kaynak metinler Türkçedir; `i18n.js` Türkçe kaynak metinle anahtarlı EN sözlüğü tutar.
- `tx()` render sırasında çevirir; `translateDOM()` dil değişince canlı DOM'u yeniden çevirir.
- Yeni dil eklemek = yeni sözlük eklemek; şablon değişikliği gerekmez.

## Kurulum

**Telefon (önerilen):** `dist/skincare.html` dosyasını Safari / Chrome'da aç, *Ana Ekrana Ekle*. Ya da klasörü herhangi bir HTTPS sunucuda barındır; service worker çevrimdışı kullanım için önbelleğe alır.

**macOS uygulaması:** `macos/build.sh` çalıştır (Xcode komut satırı araçları gerekir), `build/` altında çıkan DMG'yi aç. Evrensel ikili (arm64 + x86_64), macOS 12+, ad-hoc imzalı — ilk açılışta sağ tık → Aç.

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

- `build.py` CSS, JS ve tüm görselleri data URI olarak tek bir HTML dosyasına gömer — Dosyalar'dan aç, e-postayla gönder ya da AirDrop'la; sunucusuz, çevrimdışı çalışır.
- `macos/build.sh` Swift sarmalayıcıyı iki mimari için derler, lipo ile evrensel ikili yapar, simge setini üretir, ad-hoc imzalar ve DMG paketler.

## Dosya düzeni

| Dosya | Ne |
|---|---|
| `index.html` | İskelet, gezinme, ilk boyama öncesi tema betiği (yanlış tema parlaması yok) |
| `data.js` | Alan içeriği: rutinler, rozetler, ürünler, alışveriş listesi, referans metinleri, varsayılan notlar, EN sözlük ekleri |
| `i18n.js` | Türkçe kaynak metinle anahtarlı EN sözlüğü, `tx()` ve render sonrası `translateDOM()` |
| `app.js` | Durum (localStorage), faz mantığı, render, düzenleme, fotoğraf, ayarlar |
| `styles.css` | Tasarım değişkenleri (`--c-accent`, `--c-secondary`, `--c-neutral`, `--c-bg`) ve bileşenler; diğer tonlar `color-mix` ile türetilir |
| `img/` | Yer tutucu ürün simgeleri (SVG). Gerçek fotoğrafları uygulama içinden ekle |
| `macos/` | `main.swift` (WKWebView sarmalayıcı, `skincare://` şeması, dosya seçici), `Info.plist`, `build.sh`, `makeicon.swift` |
| `sw.js`, `manifest.json`, `icon.png` | PWA: service worker (stale-while-revalidate), manifest, simgeler |
| `build.py` | Tek dosyalık dağıtım üretici |
| `dist/` | Derleme çıktısı (gitignore'da; `python3 build.py` ile yeniden üret) |

## Veri ve gizlilik

Tüm veri `localStorage` içinde `skincare-v1` anahtarında tutulur (macOS uygulaması kendi WebKit deposunu kullanır). Hiçbir yere gönderilmez. Ayarlar'daki *Dışa aktar* JSON kopya verir, *İçe aktar* geri yükler. Yüklenen fotoğraflar 320 px'e küçültülüp aynı JSON içinde data URL olarak saklanır.

Uygulama **veridir, tavsiye değil** — Ayarlar'daki uyarıya bak.

## Geliştirme notları

- **Kaynak için derleme adımı yok**: `index.html` + `data.js` + `i18n.js` + `app.js` + `styles.css` uygulamanın kendisidir. `build.py` yalnızca taşınabilir tek dosyayı üretmek için vardır.
- **Tema sistemi**: Ayarlar'daki dört ana renk; diğer tüm tonlar CSS `color-mix` ile türetilir, palet değişince tüm uygulama yeniden giyinir. `index.html`'deki ilk boyama betiği kayıtlı temayı ilk boyamadan önce uygular (parlama yok).
- **Faz mantığı** `app.js` içindedir (`computePhase`, geçiş önerileri); rutin verisi `data.js` içinde saf veridir — rutin değiştirmek mantığa dokunmayı gerektirmez.
- **Service worker** stale-while-revalidate kullanır: önbellekteki varlıklar çevrimdışı anında açılır, çevrimiçiyken arka planda tazelenir. Varlık değiştirince `sw.js` içindeki `CACHE` sürümünü yükselt.
- **macOS sarmalayıcı** web uygulamasını özel `skincare://` şeması üzerinden sunar (böylece `localStorage` uygulama içinde kalıcı olur) ve fotoğraf yükleme için yerel dosya seçici bağlar.

## SSS

**Verilerim cihazlar arasında eşitlenir mi?** Hayır — bilinçli olarak. Bir cihazda Dışa aktar, diğerinde İçe aktar.

**İnternetsiz kullanabilir miyim?** Evet. Tek dosyalık derleme ve PWA (bir kez önbelleğe alındıktan sonra) tamamen çevrimdışı çalışır.

**Rutini nasıl değiştiririm?** Bugün sekmesindeki düzenleme (kalem) düğmesine dokun: yeniden adlandır, sırala, gizle ya da adım ekle. Ya da doğrudan `data.js`'i düzenle.

**Her şeyi nasıl sıfırlarım?** Ayarlar → Sıfırla. Uygulamanın `localStorage`'ını temizler.

**Uygulama neden fazları otomatik ilerletmiyor?** Bilinçli tasarım: faz geçişleri senin onayladığın kararlardır, otomatik çalışan zamanlayıcılar değil.

## Lisans

MIT — bkz. `LICENSE`.
