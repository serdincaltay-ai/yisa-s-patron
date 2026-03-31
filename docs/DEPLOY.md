# YiSA-S Canliya Alma Rehberi

Bu belge 3 reponun (vitrin, patron, tenant) Vercel'e deploy edilmesi icin adim adim talimatlari icerir.

---

## Genel Bakis

| Repo | Domain | Vercel Proje Adi (onerilen) |
|------|--------|----------------------------|
| yisa-s-vitrin | yisa-s.com + www.yisa-s.com | yisa-s-vitrin |
| yisa-s-patron | app.yisa-s.com | yisa-s-patron |
| yisa-s-tenant | *.yisa-s.com (wildcard) | yisa-s-tenant |

---

## Adim 1: Vercel Projelerini Olustur

Her 3 repo icin Vercel Dashboard'da yeni proje olusturun:

1. https://vercel.com/new adresine gidin
2. GitHub reposunu secin: `serdincaltay-ai/yisa-s-vitrin`
3. Framework: **Next.js** (otomatik algilanir)
4. Root Directory: `.` (varsayilan)
5. **Deploy** butonuna basin

Ayni adimlari `yisa-s-patron` ve `yisa-s-tenant` icin tekrarlayin.

---

## Adim 2: Environment Variables

### yisa-s-vitrin

Vercel Dashboard > Project Settings > Environment Variables'a gidin ve asagidakileri ekleyin:

| Degisken | Deger | Ortam |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://bgtuqdkfppcjmtrdsldl.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(Supabase anon key — tam 208 karakter, 3 JWT segmenti)* | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | *(Supabase service role key)* | Production, Preview, Development |
| `NEXT_PUBLIC_SITE_URL` | `https://yisa-s.com` | Production |
| `NEXT_PUBLIC_APP_API_URL` | `https://app.yisa-s.com/api` | Production |

### yisa-s-patron

| Degisken | Deger | Ortam |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://bgtuqdkfppcjmtrdsldl.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(Supabase anon key — tam 208 karakter)* | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | *(Supabase service role key)* | Production, Preview, Development |
| `NEXT_PUBLIC_APP_URL` | `https://app.yisa-s.com` | Production |
| `NEXT_PUBLIC_VITRIN_URL` | `https://yisa-s.com` | Production |
| `PATRON_EMAIL` | `serdincaltay@gmail.com` | Production |
| `CRON_SECRET` | *(rastgele uzun string)* | Production |
| `OPENAI_API_KEY` | *(opsiyonel — Brain Team AI icin)* | Production |
| `ANTHROPIC_API_KEY` | *(opsiyonel — Brain Team AI icin)* | Production |
| `GOOGLE_GEMINI_API_KEY` | *(opsiyonel — Brain Team AI icin)* | Production |
| `TOGETHER_API_KEY` | *(opsiyonel — Brain Team AI icin)* | Production |
| `FAL_API_KEY` | *(opsiyonel — gorsel AI icin)* | Production |
| `NETGSM_USER_CODE` | *(opsiyonel — SMS icin)* | Production |
| `NETGSM_PASSWORD` | *(opsiyonel — SMS icin)* | Production |
| `NETGSM_MSG_HEADER` | *(opsiyonel — SMS icin)* | Production |
| `STRIPE_SECRET_KEY` | *(opsiyonel — odeme icin)* | Production |

### yisa-s-tenant

| Degisken | Deger | Ortam |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://bgtuqdkfppcjmtrdsldl.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(Supabase anon key — tam 208 karakter)* | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | *(Supabase service role key)* | Production, Preview, Development |
| `DATABASE_URL` | *(Supabase PostgreSQL connection string)* | Production |
| `NEXT_PUBLIC_APP_URL` | `https://app.yisa-s.com` | Production |
| `NEXT_PUBLIC_SITE_URL` | `https://yisa-s.com` | Production |
| `NEXT_PUBLIC_ROOT_DOMAIN` | `yisa-s.com` | Production |
| `NEXT_PUBLIC_APP_YISA_S_API_URL` | `https://app.yisa-s.com/api` | Production |
| `NEXT_PUBLIC_PATRON_EMAIL` | `serdincaltay@gmail.com` | Production |
| `CRON_SECRET` | *(rastgele uzun string)* | Production |
| `STRIPE_SECRET_KEY` | *(opsiyonel — odeme icin)* | Production |
| `STRIPE_WEBHOOK_SECRET` | *(opsiyonel — Stripe webhook icin)* | Production |
| `RESEND_API_KEY` | *(opsiyonel — e-posta icin)* | Production |
| `TWILIO_ACCOUNT_SID` | *(opsiyonel — SMS icin)* | Production |
| `TWILIO_AUTH_TOKEN` | *(opsiyonel — SMS icin)* | Production |
| `TWILIO_PHONE_NUMBER` | *(opsiyonel — SMS icin)* | Production |

> **ONEMLI:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` tam 208 karakter olmali ve 3 JWT segmenti icermeli (header.payload.signature). Eksik signature segmenti "Invalid API key" hatasina neden olur.

---

## Adim 3: Domain Yapilandirmasi

Cloudflare DNS zaten yapilandirilmis durumda:

| Kayit | Tip | Deger | Durum |
|-------|-----|-------|-------|
| `yisa-s.com` | A | 216.150.1.1 | Vercel A kaydina guncellenmeli* |
| `www.yisa-s.com` | CNAME | `*.vercel-dns-016.com` | Hazir |
| `app.yisa-s.com` | CNAME | `*.vercel-dns-016.com` | Hazir |
| `*.yisa-s.com` | CNAME | `*.vercel-dns-016.com` | Hazir |

> ***Not:** `yisa-s.com` A kaydini Vercel'in guncel IP'sine guncellemeniz gerekebilir. Vercel Dashboard > Domains > yisa-s.com ekledikten sonra Vercel size dogru A kaydini verecektir (genellikle `76.76.21.21`).

### Vercel'e domain ekleme:

1. **yisa-s-vitrin** projesine gidin > Settings > Domains
   - `yisa-s.com` ekleyin
   - `www.yisa-s.com` ekleyin (redirect: www → root)

2. **yisa-s-patron** projesine gidin > Settings > Domains
   - `app.yisa-s.com` ekleyin

3. **yisa-s-tenant** projesine gidin > Settings > Domains
   - `*.yisa-s.com` ekleyin (wildcard)
   - `tenant.yisa-s.com` ekleyin (fallback)

---

## Adim 4: Deploy Tetikleme

Vercel, GitHub'a push yapildiginda otomatik deploy eder. Manuel tetiklemek icin:

```bash
# Vercel CLI ile (opsiyonel)
cd yisa-s-vitrin && vercel --prod
cd yisa-s-patron && vercel --prod
cd yisa-s-tenant && vercel --prod
```

Veya Vercel Dashboard'dan "Redeploy" butonunu kullanin.

---

## Adim 5: Deploy Sonrasi Kontrol

1. **Vitrin:** https://yisa-s.com acilmali, 5 kartli ana sayfa gorunmeli
2. **Patron:** https://app.yisa-s.com/auth/login acilmali, giris formu gorunmeli
3. **Tenant:** https://bjktuzlacimnastik.yisa-s.com acilmali (ornek tenant)

### Kontrol listesi:
- [ ] Vitrin ana sayfa yuklenior
- [ ] Vitrin robot chat calisiyor
- [ ] Vitrin demo formu calisiyor
- [ ] Patron login sayfasi yukleniyor
- [ ] Patron MFA dogrulama calisiyor
- [ ] Tenant subdomain routing calisiyor
- [ ] API endpoint'leri 401 donuyor (auth olmadan)
- [ ] SSL sertifikalari gecerli (https)

---

## Sorun Giderme

### "Invalid API key" hatasi
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` degerinin tam 208 karakter oldugunu dogrulayin
- JWT'nin 3 segmenti olmali: `header.payload.signature`
- Vercel Dashboard'da env var'in dogru ayarlandigini kontrol edin
- **Shell ortaminda `source .env.local` yapmayin** — bu JWT anahtarini truncate edebilir

### Build hatasi
- `npm run build` komutunu lokal olarak calistirin
- `node_modules` klasorunu silip `npm install` tekrar calistirin
- TypeScript hatalarini kontrol edin: `npx tsc --noEmit`
