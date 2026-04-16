# YİSA-S Patron Paneli

YİSA-S Patron Paneli, spor tesisi franchise ağını tek merkezden yöneten Next.js tabanlı kontrol panelidir.  
Bu repo, patron tarafındaki operasyon, finans, CELF direktörlük komutları, onay kuyruğu ve vitrin yönetimi modüllerini içerir.

## 1) Teknoloji Özeti

- Next.js (App Router)
- React 19
- TypeScript
- Supabase (Auth + Database)
- SWR
- Tailwind CSS

## 2) Yerel Kurulum

### Gereksinimler

- Node.js 20+ önerilir
- npm 10+ önerilir

### Adımlar

```bash
npm install
npm run dev
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde açılır.

## 3) Ortam Değişkenleri (ENV)

`.env.local` dosyasında en az aşağıdaki değişkenler tanımlanmalıdır:

```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_VITRIN_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# AI Providers
GEMINI_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
TOGETHER_API_KEY=...
FAL_API_KEY=...
CURSOR_API_KEY=...
V0_API_KEY=...

# Bildirim / Mail
RESEND_API_KEY=...
PATRON_EMAIL=...
```

Notlar:
- Patron API uçlarının çoğu `requirePatron()` ile rol kontrolü yapar.
- Bazı legacy akışlarda `patron_session` cookie kontrolü de bulunur.

## 4) Patron Paneli Modül Akışı

### A) Onay Kuyruğu

- Sayfa: `app/patron/(main)/onay-kuyrugu`
- Kaynak: `demo_requests` (status=`new`)
- Onay aksiyonu:
  1. `demo_requests` -> `converted`
  2. `tenants` kaydı oluşturulur
  3. Auth demo kullanıcısı oluşturulur
  4. `user_tenants` ilişkilendirilir
  5. **3000 USD aktivasyon geliri** otomatik olarak `payments` (ve best-effort `cash_register`) tablosuna yazılır

### B) Finans / Kasa

- Sayfa: `app/patron/(main)/finans/page.tsx`
- API: `app/api/kasa/summary/route.ts`
- Dönen özet:
  - Toplam gelir/gider
  - Aktivasyon gelirleri (3000 USD kayıtlarından türetilen)
  - Aylık rapor (gelir/gider/aktivasyon)
  - Günlük çizgi verisi

### C) CELF 12 Direktörlük

- Sayfa: `app/patron/(main)/direktorlukler/[slug]/page.tsx`
- Komut paneli: `KomutPanel.tsx`
- Asistan API: `app/api/celf/directorates/assistant/route.ts`
- Model: **Gemini 2.0 Flash**
- Direktörlüğe özel sistem promptu kullanılır.

### D) Vitrin Yönetimi

- Sayfa: `app/patron/(main)/vitrin-yonetimi/page.tsx`
- Tenant slot yönetimi: `/api/patron/tenants/[id]/slots`
- Referans kulüp yönetimi: `/api/vitrin/reference-clubs`
  - ekle / sil / sırala
  - `tenant_template_slots` içindeki `referans` slotu ile senkron

## 5) Geliştirme Komutları

```bash
# Geliştirme
npm run dev

# Lint
npm run lint

# Belirli dosya lint (önerilen hızlı kontrol)
npx eslint "app/patron/(main)/finans/page.tsx"
```

## 6) Deploy (Vercel)

1. Vercel proje ayarlarında tüm ENV değişkenlerini tanımlayın.
2. Branch deploy ile preview test edin.
3. Patron login + kritik modüller smoke test:
   - Onay kuyruğu onay akışı
   - Finans özet ve aylık rapor
   - Direktörlük asistan butonu
   - Vitrin referans kulüp CRUD
4. Production deploy alın.

## 7) Operasyon Notları

- Patron paneli güvenlik modelinde rol doğrulaması kritik noktadır; yeni API eklerken `requirePatron()` zorunlu tutulmalıdır.
- Finans hesaplamalarında yeni gelir kalemi eklenirse `/api/kasa/summary` raporları da güncellenmelidir.
- Vitrin tarafında referans kulüp verisi `referans` slotundan okunur; şema değişikliklerinde `reference-clubs` API güncellenmelidir.
