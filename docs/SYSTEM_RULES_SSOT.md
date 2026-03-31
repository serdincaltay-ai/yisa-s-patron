# YİSA-S — SYSTEM RULES (SSOT)
# Bu dosya 3 repoda da bulunur. Değiştirmek için platform_owner onayı gerekir.
# Herhangi bir AI aracı bu dosyayla çelişen bir karar üretemez.
# Çelişki varsa → bu dosya geçerlidir.

---

## 1. KULLANICI KURALLARI (KESİN)

| Kural | Değer |
|-------|-------|
| Kullanıcı adı (username) | Telefon numarası (başında 0 OLMADAN, 10 hane) |
| İlk şifre | Telefon numarasının SON 4 HANESİ |
| İlk girişte | Şifre değişim zorunlu |
| Telefon formatı | 5307104624 (başında 0 yok) |

---

## 2. REPO GÖREVLERİ (KESİN — KARIŞTIRILAMAZ)

| Repo | Domain | Görev | İçermeyecekleri |
|------|--------|-------|-----------------|
| `yisa-s-vitrin` | yisa-s.com | Kurumsal vitrin, demo formu, fiyat, tanıtım | Veli, kasa, öğrenci, login paneli |
| `yisa-s-patron` | app.yisa-s.com | Patron komuta merkezi, CELF, kasa, onay, mağaza | Veli, antrenör, tesis içi işler |
| `yisa-s-tenant` | *.yisa-s.com | Tesis içi tüm işler: veli, öğrenci, antrenör, kasa, onboarding | CELF motoru, patron kasa, vitrin CMS |

---

## 3. ROL İSİMLERİ (KESİN — TÜM KODDA AYNI OLMALI)

| Rol Kodu | Açıklama | Hangi Repoda |
|----------|----------|--------------|
| `platform_owner` | Yazılım sahibi (sen) | yisa-s-patron |
| `tenant_owner` | Tesis/franchise sahibi | yisa-s-tenant |
| `branch_manager` | Şube müdürü | yisa-s-tenant |
| `sports_director` | Sportif direktör | yisa-s-tenant |
| `coach` | Antrenör | yisa-s-tenant |
| `assistant_coach` | Yardımcı antrenör | yisa-s-tenant |
| `registration_staff` | Kayıt personeli | yisa-s-tenant |
| `cashier` | Kasa personeli | yisa-s-tenant |
| `cleaning_staff` | Temizlik personeli | yisa-s-tenant |
| `security_staff` | Güvenlik personeli | yisa-s-tenant |
| `parent` | Veli | yisa-s-tenant |
| `athlete` | Sporcu/öğrenci | yisa-s-tenant |

> ⚠️ "students" KULLANILMAZ. Doğru terim: `athletes`
> ⚠️ "mudur" KULLANILMAZ. Doğru terim: `branch_manager`

---

## 4. MİGRATION TEK KAYNAK KURALI (KESİN)

| Kural | Değer |
|-------|-------|
| Migration SSOT | `yisa-s-tenant/supabase/migrations` |
| `supabase db push` | SADECE yisa-s-tenant reposundan çalıştırılır |
| yisa-s-patron | Migration push YAPAMAZ |
| yisa-s-vitrin | Migration push YAPAMAZ |

---

## 5. VERİ MODELİ KARARLARI (KESİN)

| Karar | Değer |
|-------|-------|
| Sporcu tablosu adı | `athletes` (`students` değil) |
| Tenant izolasyonu | Her tabloda `tenant_id UUID` zorunlu |
| RLS | Tüm tenant tablolarında aktif |
| Auth | Supabase Auth — tek kaynak |
| Telefon formatı | Başında 0 yok, 10 hane, örn: `5307104624` |

---

## 6. SİSTEM MİMARİSİ KURALLARI (KESİN)

| Kural | Değer |
|-------|-------|
| Stack | Next.js 15, TypeScript, Supabase, Vercel, Tailwind, shadcn/ui |
| Stack değiştirilemez | Laravel, PHP, MySQL, MongoDB — YASAK |
| Tüm UI metinleri | Türkçe |
| Patron onayı | Hiçbir otomasyon onaysız canlıya çıkamaz |
| AI motoru adı | CELF (Chef terimi kullanılmaz) |
| Direktörlük sayısı | 12 (50 agent modeli referans, aktif model 12'dir) |

---

## 7. AKIŞ ZİNCİRİ (KIRILAMAZ SIRA)

```
Vitrin (yisa-s.com)
  └─ Demo formu doldurulur
       └─ demo_requests tablosuna yazılır
            └─ Patron paneline (app.yisa-s.com) düşer
                 └─ Patron görür, onaylar
                      └─ Ödeme alınır (3.000$) → kasaya düşer
                           └─ tenant_owner hesabı otomatik oluşur
                                └─ Telefon = kullanıcı adı, son 4 hane = şifre
                                     └─ tenant_owner giriş yapar → şifre değiştirir
                                          └─ Onboarding başlar (logo, şablon, personel, şube)
                                               └─ Patron son onayı verir → tesis yayına girer
                                                    └─ Veli tesis sitesine girer
                                                         └─ Çocuğunu kaydeder
                                                              └─ Veli paneli aktif olur
```

---

## 8. BU DOSYANIN KURALLARI

- Bu dosya `docs/SYSTEM_RULES_SSOT.md` olarak **3 repoda da** bulunur
- Değiştirmek için **platform_owner onayı** gerekir
- Herhangi bir AI aracı bu dosyayla çelişen bir karar üretemez
- Çelişki varsa → bu dosya geçerlidir

---

*Son güncelleme: 30 Mart 2026 | Hazırlayan: Claude + Serdinç*
