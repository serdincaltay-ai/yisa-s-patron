# Robot API Şeması (DEĞİŞMEZ)

Bu şema 3 repoda da aynıdır. Değişiklik için platform_owner onayı gerekir.

---

## Endpoint

```
POST /api/robot/chat
```

## Request

```json
{
  "message": "string",
  "mode": "string",
  "tenant_id": "string (optional)"
}
```

## Response

```json
{
  "reply": "string",
  "mode": "string",
  "suggestions": ["string"] // optional
}
```

## Modes

| Mode | Açıklama |
|------|----------|
| `karsilama` | Karşılama / hoş geldin |
| `bilgi` | Bilgi verme |
| `satis` | Satış yönlendirme |
| `yonlendirme` | Sayfa/işlem yönlendirme |
| `uretici` | İçerik üretme (sosyal medya vb.) |

---

## Repo Bazlı Robot Kullanımı

| Repo | Robot Tipi | Varsayılan Mode |
|------|-----------|-----------------|
| yisa-s-vitrin | Vitrin robotu | `satis` |
| yisa-s-patron | CELF | `uretici` |
| yisa-s-tenant | Tesis robotu | `karsilama` |
