/**
 * YİSA-S SMS tetikleyici tanımları
 * sms_templates.trigger_type ile eşleşir; cron/API bu key'leri kullanır.
 */

export const SMS_TRIGGER_TYPES = {
  AIDAT_HATIRLATMA: "aidat_hatirlatma",
  FATURA_HATIRLATMA: "fatura_hatirlatma",
  YOKLAMA_BILDIRIM: "yoklama_bildirim",
  SERVIS_AKTIF: "servis_aktif",
  SERVIS_SONLANDI: "servis_sonlandi",
  DEMO_HESAP_OLUSTURULDU: "demo_hesap_olusturuldu",
  DEMO_SURE_UYARI: "demo_sure_uyari",
} as const

export type SmsTriggerType = (typeof SMS_TRIGGER_TYPES)[keyof typeof SMS_TRIGGER_TYPES]

/** Tetikleyici → şablon key eşlemesi (sms_templates.key) */
export const TRIGGER_TEMPLATE_KEYS: Record<string, string[]> = {
  [SMS_TRIGGER_TYPES.AIDAT_HATIRLATMA]: ["aidat_hatirlatma_yaklasan", "aidat_hatirlatma_geciken"],
  [SMS_TRIGGER_TYPES.FATURA_HATIRLATMA]: ["fatura_hatirlatma_yaklasan", "fatura_hatirlatma_geciken"],
  [SMS_TRIGGER_TYPES.YOKLAMA_BILDIRIM]: ["yoklama_devamsizlik"],
  [SMS_TRIGGER_TYPES.SERVIS_AKTIF]: ["servis_aktif"],
  [SMS_TRIGGER_TYPES.SERVIS_SONLANDI]: ["servis_sonlandi"],
  [SMS_TRIGGER_TYPES.DEMO_HESAP_OLUSTURULDU]: ["demo_hesap_bilgilendirme"],
  [SMS_TRIGGER_TYPES.DEMO_SURE_UYARI]: ["demo_sure_dolmak_uzere"],
}
