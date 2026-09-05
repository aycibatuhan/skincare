/* Skincare — örnek alan verisi (public kopya). Kişisel bilgi içermez; kendi rutinine göre düzenle. */
'use strict';

const WEEKDAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']; // index = Date.getDay()
const WEEKDAYS_LONG = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

/* Örnek görseller: img/ altındaki basit SVG çizimleri (telifsiz). Kendi fotoğraflarını uygulama içinden ekleyebilirsin. */
const IMAGES = {
  cleanser: 'img/cleanser.svg', serum: 'img/serum.svg', eye: 'img/eye.svg', moist: 'img/moist.svg', night: 'img/night.svg',
  spf: 'img/spf.svg', retinal: 'img/retinal.svg', mask: 'img/mask.svg', toner: 'img/toner.svg',
};

const PHASES = {
  EYLUL:   { label: 'Hazırlık', desc: 'Geçiş rutini, aktif yok' },
  EKIM_F1: { label: 'Faz 1',    desc: 'Retinal haftada 2 gece' },
  EKIM_F2: { label: 'Faz 2',    desc: 'Retinal gün aşırı + göz serumu eklendi' },
  EKIM_F3: { label: 'Faz 3',    desc: 'Retinal haftada 5 geceye kadar' },
};
const PHASE_ORDER = ['EYLUL', 'EKIM_F1', 'EKIM_F2', 'EKIM_F3'];
const PHASE_GROUP_LABEL = { EYLUL: 'Hazırlık', EKIM: 'Aktif' };
/* Varsayılan retinal başlangıcı: gelecek ayın ilk günü */
const DEFAULT_RETINAL_START = (() => { const d = new Date(); d.setMonth(d.getMonth() + 1, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; })();
const SALICYLIC_REENABLE_DATE = '';   // boş: her zaman geri açılabilir
const SALICYLIC_HINT = 'Hazırlık fazında haftada bir gece akşam listesine eklenir. Aktif fazlarda gizlenir.';
const SALICYLIC_REENABLE_LABEL = 'Aktif fazlarda geri aç';
const SALICYLIC_REENABLE_DONE = 'Salisilik gecesi manuel olarak geri açılabilir.';
const PHASE_BACK_TO_START_TEXT = ". Hazırlık rutini gösterilir; tarihi Ayarlar'dan değiştirebilirsin.";

const RETINAL_SUGGESTION = {
  EKIM_F1: { nights: [1, 4],          text: 'Haftada 2 gece' },
  EKIM_F2: { nights: [1, 3, 5],       text: 'Gün aşırı (haftada 3-4 gece)' },
  EKIM_F3: { nights: [1, 2, 4, 5, 6], text: 'Haftada 5 geceye kadar' },
};

const BADGES = {
  ALAN:    { label: 'Alan',    text: 'Uygulama alanı kritik. Detay için dokun.', link: 'area' },
  MIKTAR:  { label: 'Miktar',  text: 'Yüz için yarım çay kaşığı. Az sürülen SPF 50, SPF 15 gibi davranır.' },
  BEKLE:   { label: 'Bekle',   text: 'Tam kurumasını bekle, yoksa üstteki katman topaklanır.' },
  SANDVIC: { label: 'Sandviç', text: 'İlk 4 hafta: nemlendirici → retinal → nemlendirici.', onlyPhase: 'EKIM_F1' },
};

const ROUTINES = {
  EYLUL: {
    am: [
      { id: 'e_am_water', name: 'Ilık su', note: 'Sabah temizleyici kullanma' },
      { id: 'e_am_eye',   name: 'Göz kremi', dynamic: 'eye' },
      { id: 'e_am_serum', name: 'Nemlendirici serum', note: 'Nemli cilde, birkaç damla', img: 'serum' },
      { id: 'e_am_moist', name: 'Yüz nemlendiricisi', dynamic: 'moist' },
      { id: 'e_am_spf',   name: 'Güneş kremi SPF 50+', note: 'Yarım çay kaşığı. Orbital kemik kenarına kadar', badges: ['MIKTAR'], img: 'spf' },
    ],
    pm: [
      { id: 'e_pm_cleanser', name: 'Nazik temizleyici', note: 'Makyaj varsa önce yağ bazlı temizleyici', img: 'cleanser' },
      { id: 'e_pm_eye',      name: 'Göz kremi', dynamic: 'eye', note: 'Sabahkiyle aynı' },
      { id: 'e_pm_sal',      name: 'Salisilik asit %2', note: 'Sadece burun ve T bölgesi. Tüm yüze sürme. Temizlik sonrası kuru cilde, üstüne nemlendirici', badges: ['ALAN'], when: 'salicylic', img: 'toner' },
      { id: 'e_pm_moist',    name: 'Yüz nemlendiricisi', dynamic: 'moist' },
    ],
  },
  EKIM: {
    am: [
      { id: 'o_am_water', name: 'Ilık su' },
      { id: 'o_am_vitc',  name: 'C vitamini serumu', note: 'Tam kurumasını bekle', badges: ['BEKLE'], img: 'serum' },
      { id: 'o_am_moist', name: 'Yüz nemlendiricisi', dynamic: 'moist' },
      { id: 'o_am_spf',   name: 'Güneş kremi SPF 50+', note: 'Yarım çay kaşığı, orbital kenara kadar', badges: ['MIKTAR'], img: 'spf' },
    ],
    pm: [
      { id: 'o_pm_cleanser', name: 'Nazik temizleyici', img: 'cleanser' },
      { id: 'o_pm_sal',      name: 'Salisilik asit %2', note: 'Sadece burun ve T bölgesi. Tüm yüze sürme. Temizlik sonrası kuru cilde, üstüne nemlendirici', badges: ['ALAN'], when: 'salicylic_reenabled', img: 'toner' },
      { id: 'o_pm_eyeserum', name: 'Göz serumu', note: 'Orbital kemik kenarına, kapağa değil', badges: ['ALAN'], when: 'f2plus', patchNote: 'Yama testi: sadece şakak / dış orbital kenar', img: 'eye' },
      { id: 'o_pm_retinal',  name: 'Retinal %0,05', note: 'Yanaklar, alın, çene. Göz çevresi ve burun kanadı kıvrımlarında ince tut ya da atla', badges: ['ALAN', 'SANDVIC'], when: 'retinal', img: 'retinal' },
      { id: 'o_pm_night',    name: 'Gece nemlendiricisi', img: 'night' },
    ],
  },
};

const TRANSITION_TEXT = {
  EKIM_F2: '4 hafta doldu. Retinal sıklığını gün aşırıya çıkarmaya hazır mısın? Son 2 haftada batma veya kalıcı kızarıklık yaşadıysan bir hafta daha bekle.',
  EKIM_F3: '8 hafta doldu. Retinal sıklığını haftada 5 geceye kadar çıkarmaya hazır mısın? Son 2 haftada batma veya kalıcı kızarıklık yaşadıysan bir hafta daha bekle.',
};
const PATCH_TEST_TEXT = 'İlk 3-4 gece yeni ürünü sadece şakak ve dış orbital kenara sür. Tepki yoksa alanı genişlet.';
const STINGING_WARNING = 'Üç gündür batma bildiriyorsun. Retinal sıklığını bir kademe düşürmeyi düşün. Bırakmana gerek yok.';
const DISCLAIMER = 'Bu uygulama kişisel bir takip aracıdır, tıbbi tavsiye değildir. Tanı ve tedavi kararları için bir dermatoloğa başvur.';

/* status: active | queued | finished | conditional | giveaway — group: 'moist' | 'eye' rotasyon, order sırası */
const PRODUCTS = [
  { id: 'gel_moist',   name: 'Hafif Jel Nemlendirici',   role: 'Nemlendirici — rotasyon 1', note: '', status: 'active', group: 'moist', order: 1, img: 'moist' },
  { id: 'eye_cream',   name: 'Göz Kremi',                role: 'Göz nemlendirici',          note: '', status: 'active', group: 'eye', order: 1, img: 'eye' },
  { id: 'cer_cream',   name: 'Seramidli Krem',           role: 'Nemlendirici — rotasyon 2', note: 'Bariyer onarımı için', status: 'queued', group: 'moist', order: 2, img: 'moist' },
  { id: 'eye_balm',    name: 'Göz Balmı',                role: 'Göz nemlendirici (sonraki)', note: '', status: 'queued', group: 'eye', order: 2, img: 'eye' },
  { id: 'vitc',        name: 'C Vitamini Serumu',        role: 'Sabah aktifi',              note: 'Açıldıktan sonra 3 ay içinde bitir', status: 'active', img: 'serum' },
  { id: 'sal',         name: 'Salisilik Asit %2',        role: 'Haftada 1, sadece burun/T', note: 'Aktif fazlarda duraklat', status: 'active', img: 'toner' },
  { id: 'spf',         name: 'Güneş Kremi SPF 50+',      role: 'Her sabah',                 note: 'Yarım çay kaşığı', status: 'active', img: 'spf' },
  { id: 'cleanser',    name: 'Nazik Temizleyici',        role: 'Akşam temizliği',           note: '', status: 'active', img: 'cleanser' },
  { id: 'cond_cream',  name: 'Hediye Gelen Krem',        role: 'Nemlendirici — koşullu',    note: '', status: 'conditional', group: 'moist', order: 3, img: 'moist' },
  { id: 'clay_mask',   name: 'Kil Maskesi',              status: 'giveaway', reason: 'Parfüm + uçucu yağ içeriyor', img: 'mask' },
  { id: 'aha_serum',   name: 'AHA Peeling Serumu',       status: 'giveaway', reason: 'Yüksek asit yükü, kızarıklığı tetikliyor', img: 'serum' },
];

const GINZING_CHECK = ['Parfum', 'Fragrance', 'Limonene', 'Linalool', 'Citral'];

const SHOPPING = [
  { id: 'shop_retinal', name: 'Retinal serumu %0,05, 30 ml', where: 'Online', price: 29, img: 'retinal' },
  { id: 'shop_eye',     name: 'Göz serumu, 30 ml',           where: 'Eczane', price: 17, img: 'eye' },
  { id: 'shop_night',   name: 'Gece nemlendiricisi, 60 ml', where: 'Market', price: 15, img: 'night' },
];
const SHOPPING_TITLE = 'Alışveriş listesi';
const SHOPPING_NOTE = 'Örnek liste. Kendi ürünlerinle değiştir; fiyatlar temsilidir.';

const DERM_QUESTIONS = [
  { id: 'q1', text: 'Cilt tipim ve öncelikli sorunum ne?' },
  { id: 'q2', text: 'Retinal sıklığını nasıl artırmalıyım?' },
  { id: 'q3', text: 'Hangi ürünleri birlikte kullanmamalıyım?' },
];
const DERM_TESTS = [
  { id: 't1', text: 'Gerekli görülen tetkikler' },
];
const DERM_WARNING = 'Tanı netleşmeden kalıcı işlemlere karar verme.';
const DERM_FREE_TEST = 'Yeni bir ürünü bırakınca 4-6 hafta gözlemle; fark varsa not et.';

const EXPECTATIONS = [
  { head: 'Retinalde 8 haftadan önce değerlendirme yapma.', body: '' },
  { head: 'Güneş kreminde miktar, filtre seçiminden önemli.', body: '' },
  { head: 'Yeni ürünü yama testiyle başlat.', body: 'İlk 3-4 gece küçük bir alanda dene.' },
  { head: 'Aynı anda tek aktif değiştir.', body: 'Tepkinin kaynağını bilmek için.' },
];

const RED_FLAGS = ['Parfum', 'Fragrance', 'Limonene', 'Linalool', 'Citronellol', 'Geraniol', 'Hydroxycitronellal', 'Benzyl Salicylate', 'Anthemis Nobilis', 'Lavandula', 'Citrus Aurantium Bergamia', 'Citrus Limon', 'Citrus Grandis', 'Melaleuca Alternifolia', 'Hypericum Perforatum', 'Mentha Piperita', 'Arnica Montana', 'Rosmarinus Officinalis', 'Glycolic Acid', 'Alcohol Denat'];
const YELLOW_FLAGS = ['Cetearyl Olivate', 'Sorbitan Oleate', 'Oleic Acid', 'Palmitic Acid', 'Stearic Acid', 'Linoleic Acid'];
const YELLOW_FLAG_NOTE = 'Malassezia için besin olabilir, kıvrım bölgelerinde ince tut.';
const FILTER_QUESTIONS = [
  'Konsantrasyon açıklanmış mı, ve neyin yüzdesi? ("%2 retinal lipozom" gerçekte %0,02 retinal demekti)',
  "Aktif INCI'de nerede? Koruyucudan sonraysa süs.",
  'Molekül doğru mu? Retinal > retinol. Azelaik asit > potasyum azeloil diglisinat.',
  'İçerik yoğunluğu kalite değil. "30 peptit" kötü işaret.',
];

const AREA_MAP = [
  { id: 'cheeks',   name: 'Yanaklar',                        aza: 'ok', ret: 'ok',   sal: 'no' },
  { id: 'forehead', name: 'Alın',                            aza: 'ok', ret: 'ok',   sal: 'no' },
  { id: 'glabella', name: 'Glabella / kaş arası',            aza: 'ok', ret: 'warn', sal: 'no', bold: true },
  { id: 'alar',     name: 'Burun kanadı kıvrımları',         aza: 'ok', ret: 'warn', sal: 'no', bold: true },
  { id: 'tzone',    name: 'Burun üstü / T bölgesi',          aza: 'ok', ret: 'ok',   sal: 'ok' },
  { id: 'chin',     name: 'Çene',                            aza: 'ok', ret: 'ok',   sal: 'no' },
  { id: 'orbital',  name: 'Dış göz kenarı (orbital kemik)',  aza: 'no', ret: 'ok',   sal: 'no' },
  { id: 'eyelid',   name: 'Göz kapağı',                      aza: 'no', ret: 'no',   sal: 'no' },
];
const AREA_NOTE = 'Kıvrım bölgeleri (glabella, burun kanadı) daha hassas olabilir; aktifleri orada ince tut. Örnek haritadır, dermatoloğunla düzenle.';
const AREA_ACTIVES = { aza: 'Azelaik asit', ret: 'Retinal', sal: 'Salisilik asit' };

const DEFAULT_NOTES = [
  { title: 'Beklenti kalibrasyonu', body: EXPECTATIONS.map(e => '• ' + e.head + (e.body ? ' ' + e.body : '')).join('\n') },
  { title: 'Dermatolog randevu gündemi', body: 'Sorular\n' + DERM_QUESTIONS.map((q, i) => `${i + 1}. ${q.text}`).join('\n') + '\n\nTetkikler\n' + DERM_TESTS.map(t => '• ' + t.text).join('\n') + '\n\nUyarı: ' + DERM_WARNING + '\n\nGözlem: ' + DERM_FREE_TEST },
  { title: 'Faz planı', body: 'Hazırlık: geçiş rutini, aktif yok.\nFaz 1 (+4 hafta): retinal haftada 2 gece.\nFaz 2 (+4 → +8 hafta): retinal gün aşırı + göz serumu eklenir.\nFaz 3 (+8 hafta sonrası): retinal haftada 5 geceye kadar.\n\nFaz süresi dolunca uygulama önerir, otomatik geçmez. Son 2 haftada batma veya kalıcı kızarıklık varsa bir hafta daha bekle. İrritasyon olursa bir önceki faza dönmek normal akışın parçası.\n\nYama testi: ' + PATCH_TEST_TEXT + '\n\nSandviç (ilk 4 hafta): nemlendirici → retinal → nemlendirici.' },
  { title: 'Batma kuralı', body: 'Ardışık 3 gün batma/yanma varsa: retinal sıklığını bir kademe düşür. Bırakmaya gerek yok.' },
  { title: 'Güneş kremi', body: 'Miktar: yüz için yarım çay kaşığı, orbital kemik kenarına kadar. Az sürülen SPF 50, SPF 15 gibi davranır.' },
];

/* İngilizce karşılıklar (i18n.js sözlüğüne eklenir) */
const DATA_EN = {
  'Alışveriş listesi': 'Shopping list', 'Hazırlık': 'Prep', 'Aktif': 'Active', 'Faz 1': 'Phase 1', 'Faz 2': 'Phase 2', 'Faz 3': 'Phase 3',
  'Hazırlık fazında haftada bir gece akşam listesine eklenir. Aktif fazlarda gizlenir.': 'In the prep phase it is added to the evening list one night a week. Hidden in active phases.',
  'Aktif fazlarda geri aç': 'Re-enable in active phases', 'Salisilik gecesi manuel olarak geri açılabilir.': 'The salicylic night can be re-enabled manually.',
  ". Hazırlık rutini gösterilir; tarihi Ayarlar'dan değiştirebilirsin.": '. The prep routine will be shown; you can change the date in Settings.',
  'Nemlendirici serum': 'Hydrating serum', 'Nemli cilde, birkaç damla': 'On damp skin, a few drops', 'Güneş kremi SPF 50+': 'Sunscreen SPF 50+',
  'Nazik temizleyici': 'Gentle cleanser', 'Makyaj varsa önce yağ bazlı temizleyici': 'If wearing makeup, oil cleanser first', 'Salisilik asit %2': 'Salicylic acid 2%',
  'C vitamini serumu': 'Vitamin C serum', 'Tam kurumasını bekle': 'Wait until fully dry', 'Göz serumu': 'Eye serum', 'Retinal %0,05': 'Retinal 0.05%',
  'Yanaklar, alın, çene. Göz çevresi ve burun kanadı kıvrımlarında ince tut ya da atla': 'Cheeks, forehead, chin. Keep it thin or skip around the eyes and alar folds',
  'Gece nemlendiricisi': 'Night moisturizer',
  'İlk 3-4 gece yeni ürünü sadece şakak ve dış orbital kenara sür. Tepki yoksa alanı genişlet.': 'For the first 3-4 nights apply the new product only to the temples and outer orbital rim. If no reaction, widen the area.',
  'Bu uygulama kişisel bir takip aracıdır, tıbbi tavsiye değildir. Tanı ve tedavi kararları için bir dermatoloğa başvur.': 'This app is a personal tracking tool, not medical advice. See a dermatologist for diagnosis and treatment decisions.',
  'Hafif Jel Nemlendirici': 'Light Gel Moisturizer', 'Göz Kremi': 'Eye Cream', 'Seramidli Krem': 'Ceramide Cream', 'Bariyer onarımı için': 'For barrier repair', 'Göz Balmı': 'Eye Balm',
  'Göz nemlendirici (sonraki)': 'Eye moisturizer (next)', 'C Vitamini Serumu': 'Vitamin C Serum', 'Açıldıktan sonra 3 ay içinde bitir': 'Use within 3 months of opening', 'Salisilik Asit %2': 'Salicylic Acid 2%',
  'Aktif fazlarda duraklat': 'Pause in active phases', 'Güneş Kremi SPF 50+': 'Sunscreen SPF 50+', 'Her sabah': 'Every morning', 'Yarım çay kaşığı': 'Half a teaspoon', 'Nazik Temizleyici': 'Gentle Cleanser',
  'Akşam temizliği': 'Evening cleanse', 'Hediye Gelen Krem': 'Gifted Cream', 'Kil Maskesi': 'Clay Mask', 'Parfüm + uçucu yağ içeriyor': 'Contains fragrance + essential oils',
  'AHA Peeling Serumu': 'AHA Peeling Serum', 'Yüksek asit yükü, kızarıklığı tetikliyor': 'High acid load, triggers redness',
  'Retinal serumu %0,05, 30 ml': 'Retinal serum 0.05%, 30 ml', 'Göz serumu, 30 ml': 'Eye serum, 30 ml', 'Gece nemlendiricisi, 60 ml': 'Night moisturizer, 60 ml', 'Online': 'Online', 'Eczane': 'Pharmacy', 'Market': 'Drugstore',
  'Örnek liste. Kendi ürünlerinle değiştir; fiyatlar temsilidir.': 'Sample list. Replace with your own products; prices are placeholders.',
  'Kıvrım bölgeleri (glabella, burun kanadı) daha hassas olabilir; aktifleri orada ince tut. Örnek haritadır, dermatoloğunla düzenle.': 'Fold areas (glabella, alar folds) can be more sensitive; keep actives thin there. Sample map — adjust with your dermatologist.',
};
