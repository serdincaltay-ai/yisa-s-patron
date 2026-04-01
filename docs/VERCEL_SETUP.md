# yisa-s-patron — Vercel Kurulum Rehberi

Bu dokuman, `yisa-s-patron` reposunun Vercel uzerinde `app.yisa-s.com` domain'i ile dogru sekilde calismasi icin gerekli minimum ayarlari icerir.

## 1) Vercel Project

- Project name: `yisa-s-patron`
- Framework preset: `Next.js`
- Root directory: `.`
- Install command: `npm install`
- Build command: `npm run build`

## 2) Environment Variables

Vercel Dashboard > Project Settings > Environment Variables bolumune asagidaki degiskenleri ekleyin.

### Zorunlu

| Key | Value | Environments |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (ornek: `https://<project-ref>.supabase.co`) | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (JWT, 3 segment) | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Production, Preview, Development |
| `NEXT_PUBLIC_APP_URL` | `https://app.yisa-s.com` | Production |
| `NEXT_PUBLIC_VITRIN_URL` | `https://yisa-s.com` | Production |
| `CRON_SECRET` | Guclu rastgele secret | Production |

### Opsiyonel (kullanim durumuna gore)

| Key | Not |
|---|---|
| `PATRON_EMAIL` | Patron bildirim mail adresi |
| `OPENAI_API_KEY` | AI entegrasyonlari |
| `ANTHROPIC_API_KEY` | AI entegrasyonlari |
| `GOOGLE_GEMINI_API_KEY` | AI entegrasyonlari |
| `TOGETHER_API_KEY` | AI entegrasyonlari |
| `FAL_API_KEY` | Gorsel AI |
| `NETGSM_USER_CODE` / `NETGSM_PASSWORD` / `NETGSM_MSG_HEADER` | SMS |
| `STRIPE_SECRET_KEY` | Odeme |

## 3) Custom Domain: app.yisa-s.com

1. Vercel > `yisa-s-patron` > **Settings > Domains**
2. `app.yisa-s.com` domain'ini ekleyin.
3. Vercel'in verdigi hedefe gore DNS'te CNAME kaydi ekleyin (genellikle `cname.vercel-dns.com`).
4. Cloudflare/ DNS tarafinda proxy ayarini gerektiginde DNS-only yaparak ilk dogrulamayi tamamlayin.
5. SSL sertifikasi aktif olduktan sonra `https://app.yisa-s.com/auth/login` acilisini test edin.

## 4) Middleware ve Preview Domain Notu

Bu repodaki `middleware.ts` su sekilde calisir:

- Production domain: `app.yisa-s.com` kabul edilir.
- Development: `localhost`, `127.0.0.1` kabul edilir.
- Preview: `*.vercel.app` host'lari kabul edilir.

Bu sayede Vercel Preview deployment URL'lerinde middleware kaynakli 403 engeli olusmaz.

## 5) Hizli Dogrulama Checklist

- [ ] `https://app.yisa-s.com` acildiginda `/auth/login` sayfasina gidiyor.
- [ ] Login sonrasi patron kullanicisi `/patron/dashboard` (veya tablet yonlendirmesi) akisini acabiliyor.
- [ ] Preview deployment URL'leri (`*.vercel.app`) 403 vermiyor.
- [ ] API endpoint'leri auth'suz isteklerde beklenen sekilde 401/403 donuyor.
