# Framely — Poster Tasarım & Sipariş Platformu

## Proje Özeti
Kullanıcıların fotoğraflarından kolaj posterler tasarlayıp sipariş verebildiği profesyonel bir e-ticaret web uygulaması. Tamamen tarayıcı tabanlı, sunucu gerektirmez (LocalStorage ile veri yönetimi).

## Teknik Altyapı
- **Dil:** Vanilla HTML, CSS, JavaScript (ES Modules)
- **Sunucu:** Python basit HTTP server (port 5000)
- **Depolama:** LocalStorage (kullanıcılar, oturumlar, siparişler, sepet)

## Dosya Yapısı

### Sayfalar
- `index.html` — Ana sayfa (hero, nasıl çalışır, fiyatlar, özellikler)
- `templates.html` — Poster şablon seçim sayfası (7 şablon, fiyatlı)
- `designer.html` — Poster tasarımcı (sürükle-bırak, PNG export, sipariş butonu)
- `auth.html` — Giriş / Kayıt sayfası (split layout)
- `checkout.html` — Sipariş & ödeme sayfası (3 adımlı: Adres → Ödeme → Onay)
- `orders.html` — Sipariş geçmişi sayfası

### JavaScript Modülleri
- `js/app.js` — Ana uygulama başlatıcı, buton yönlendirmeleri
- `js/auth.js` — Kullanıcı kaydı, giriş, oturum yönetimi (LocalStorage)
- `js/cart.js` — Sepet yönetimi ve sipariş oluşturma
- `js/header.js` — Paylaşılan auth-aware header komponenti (kullanıcı menüsü)
- `js/presets.js` — Poster şablon tanımları (7 şablon, fiyat dahil)
- `js/state.js` — Uygulama durumu (fotoğraflar, hücreler, preset bilgisi)
- `js/grid.js` — Grid oluşturma ve hücre render
- `js/canvas.js` — Poster zoom ve fit işlemleri
- `js/drag.js` — Sürükle-bırak işlevselliği
- `js/zoom.js` — Fotoğraf konumlandırma modal
- `js/photos.js` — Fotoğraf yükleme ve strip yönetimi
- `js/export.js` — Yüksek çözünürlüklü PNG export (6x ölçek)
- `js/templates.js` — Şablonlar sayfası JS

### CSS
- `css/variables.css` — Design tokens, renk paleti
- `css/landing.css` — Ana sayfa, şablonlar, genel bileşenler, pricing section
- `css/designer.css` — Tasarımcı arayüzü, sidebar, butonlar
- `css/templates.css` — Şablon kartları, fiyat gösterimi
- `css/auth.css` — Giriş/kayıt sayfası (split layout)
- `css/checkout.css` — Ödeme akışı, adres formu, kart formu
- `css/orders.css` — Sipariş geçmişi kartları
- `css/usermenu.css` — Dropdown kullanıcı menüsü (tüm sayfalarda)

## Kullanıcı Akışı
1. Ana sayfa → "Poster Yap" → Şablon seç
2. Tasarımcıda fotoğraf yükle & düzenle
3. "Sipariş Ver" → Giriş yoksa auth.html → Giriş/Kayıt
4. checkout.html → Adres gir → Kart bilgisi gir → Taksit seç
5. Sipariş onayı → orders.html ile takip

## Poster Şablonları ve Fiyatlar
| ID | Ad | Boyut | Fotoğraf | Fiyat |
|---|---|---|---|---|
| mini35 | Mini Kolaj | 30x40cm | 35 | 149 TL |
| classic50 | Klasik 50 | 30x45cm | 50 | 179 TL |
| a3grid49 | A3 7x7 | A3 | 49 | 189 TL |
| square36 | Kare Kolaj | 50x50cm | 36 | 199 TL |
| memories49 | Anı Duvarı | 40x40cm | 49 | 199 TL |
| medium96 | Orta Grid | 40x60cm | 96 | 229 TL |
| giant140 | Dev Mozaik | 50x70cm | 140 | 269 TL |

## Özellikler
- Kullanıcı kaydı ve girişi (LocalStorage tabanlı)
- Oturum yönetimi, korumalı sayfalar (requireAuth)
- 3 adımlı ödeme akışı (adres → kart → onay)
- Taksit seçeneği (1, 2, 3, 6 taksit)
- Sipariş geçmişi ve takibi
- Tasarımcıda "Sipariş Ver" + sidebar fiyat CTA
- Şablon kartlarında fiyat gösterimi
- Kullanıcı dropdown menüsü (tüm sayfalarda)
- Responsive tasarım (mobil uyumlu)
