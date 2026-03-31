/**
 * YİSA-S SMS sağlayıcı — NETGSM veya İleti Merkezi API wrapper
 * Tek fonksiyon: sendSms(phone, message)
 */

const NETGSM_API_URL = "https://api.netgsm.com.tr/sms/send/get"
const ILETI_MERKEZI_URL = "https://api.iletimerkezi.com/v1/send-sms/get"

export type SmsResult = { success: boolean; messageId?: string; error?: string }

/**
 * Telefon numarasını API formatına çevirir (+90 5XX... → 905XXXXXXXXX)
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.startsWith("90") && digits.length === 12) return digits
  if (digits.startsWith("0") && digits.length === 11) return "9" + digits
  if (digits.length === 10 && digits.startsWith("5")) return "90" + digits
  return "90" + digits
}

/**
 * SMS gönderir. NETGSM veya İleti Merkezi env ile seçilir.
 * NETGSM: NETGSM_USER_CODE, NETGSM_PASSWORD, NETGSM_MSG_HEADER
 * İleti Merkezi: ILETI_MERKEZI_KEY, ILETI_MERKEZI_HASH
 */
export async function sendSms(phone: string, message: string): Promise<SmsResult> {
  const to = normalizePhone(phone)
  if (!to || to.length < 10) {
    return { success: false, error: "Geçersiz telefon numarası" }
  }

  // Önce NETGSM dene
  const netgsmUser = process.env.NETGSM_USER_CODE
  const netgsmPass = process.env.NETGSM_PASSWORD
  const netgsmHeader = process.env.NETGSM_MSG_HEADER || "YISAS"

  if (netgsmUser && netgsmPass) {
    try {
      const params = new URLSearchParams({
        usercode: netgsmUser,
        password: netgsmPass,
        gsmno: to,
        message,
        msgheader: netgsmHeader,
      })
      const res = await fetch(`${NETGSM_API_URL}?${params.toString()}`, { method: "GET" })
      const text = await res.text()
      // NETGSM: 00 = başarı, 2x = başarılı
      if (text.startsWith("00") || text.startsWith("20")) {
        return { success: true, messageId: text.trim() }
      }
      return { success: false, error: text || "NETGSM hatası" }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  // İleti Merkezi (opsiyonel)
  const imKey = process.env.ILETI_MERKEZI_KEY
  const imHash = process.env.ILETI_MERKEZI_HASH
  if (imKey && imHash) {
    try {
      const res = await fetch(ILETI_MERKEZI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request: {
            authentication: { key: imKey, hash: imHash },
            order: { sender: "YISAS", sendDateTime: [], message: { text: message }, receivers: { number: [to] } },
          },
        }),
      })
      const data = await res.json()
      if (data?.response?.status?.code === 200) {
        return { success: true, messageId: data.response?.order?.id }
      }
      return { success: false, error: data?.response?.status?.message || "İleti Merkezi hatası" }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  // Hiç provider yoksa log-only (geliştirme)
  if (process.env.NODE_ENV === "development") {
    console.log("[SMS dev]", to, message.slice(0, 50) + "...")
    return { success: true, messageId: "dev-" + Date.now() }
  }

  return { success: false, error: "SMS sağlayıcı yapılandırılmamış (NETGSM veya İleti Merkezi)" }
}
