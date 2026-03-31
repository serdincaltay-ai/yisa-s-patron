/**
 * YİSA-S Email Service (Resend)
 * Email gönderme servisi
 */

import { env } from "@/lib/env"
import { log } from "@/lib/logger"

interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
}

/**
 * Resend API ile email gönderir
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!env.RESEND_API_KEY) {
    log.warn("Resend API key not configured, skipping email send")
    return { success: false, error: "Email service not configured" }
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: options.from || "YİSA-S <noreply@yisa-s.com>",
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        reply_to: options.replyTo,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      log.error("Resend API error", new Error(error.message), { status: response.status })
      return { success: false, error: error.message }
    }

    const data = await response.json()
    log.info("Email sent successfully", { messageId: data.id, to: options.to })
    return { success: true, messageId: data.id }
  } catch (error) {
    log.error("Failed to send email", error instanceof Error ? error : new Error(String(error)), { to: options.to })
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

/**
 * Demo talep alındı emaili gönderir
 */
export async function sendDemoRequestReceivedEmail(email: string, firmaAdi: string): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0f3460; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>YİSA-S</h1>
          <p>Teknolojiyi Spora Başlattık</p>
        </div>
        <div class="content">
          <h2>Demo Talebiniz Alındı</h2>
          <p>Merhaba,</p>
          <p><strong>${firmaAdi}</strong> için demo talebiniz başarıyla alınmıştır.</p>
          <p>En kısa sürede sizinle iletişime geçeceğiz. Genellikle 24 saat içinde dönüş yapıyoruz.</p>
          <p>Teşekkürler,<br>YİSA-S Ekibi</p>
        </div>
        <div class="footer">
          <p>© 2026 YİSA-S. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail({
    to: email,
    subject: "Demo Talebiniz Alındı - YİSA-S",
    html,
  })
}

/**
 * Patron'a yeni demo talep bildirimi gönderir
 */
export async function sendPatronNotificationEmail(patronEmail: string, firmaAdi: string): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0f3460; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background: #e94560; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>YİSA-S</h1>
          <p>Yeni Demo Talebi</p>
        </div>
        <div class="content">
          <h2>Yeni Demo Talebi Geldi</h2>
          <p><strong>${firmaAdi}</strong> için yeni bir demo talebi alındı.</p>
          <p>Lütfen onay kuyruğunu kontrol edin ve talebi değerlendirin.</p>
          <a href="${env.NEXT_PUBLIC_APP_URL}" class="button">Onay Kuyruğuna Git</a>
        </div>
        <div class="footer">
          <p>© 2026 YİSA-S. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail({
    to: patronEmail,
    subject: `Yeni Demo Talebi: ${firmaAdi}`,
    html,
  })
}

/**
 * Patron'a farklı IP'den giriş bildirimi gönderir
 */
export async function sendPatronNewIpEmail(patronEmail: string, newIp: string): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0f3460; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>YİSA-S</h1>
          <p>Güvenlik Bildirimi</p>
        </div>
        <div class="content">
          <h2>Farklı IP'den giriş tespit edildi</h2>
          <p>Patron panelinize yeni bir IP adresinden giriş yapıldı.</p>
          <p><strong>IP:</strong> ${newIp}</p>
          <p>Eğer bu giriş sizin değilse lütfen şifrenizi değiştirin ve destek ile iletişime geçin.</p>
        </div>
        <div class="footer">
          <p>© 2026 YİSA-S. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </body>
    </html>
  `
  await sendEmail({
    to: patronEmail,
    subject: "YİSA-S Patron — Farklı IP'den giriş",
    html,
  })
}

/**
 * Demo onayı sonrası giriş bilgileriyle email gönderir
 * GOREV #14: Telefon = Kullanıcı Adı, Son 4 Hane = Şifre
 */
export async function sendDemoApprovedEmail(
  email: string,
  firmaAdi: string,
  slug: string,
  username: string,
  tempPassword: string,
  expiresAt: string
): Promise<void> {
  const subdomain = `${slug}.yisa-s.com`
  const expiresDate = new Date(expiresAt).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0f3460; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background: #e94560; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px; }
        .info-box { background: white; padding: 15px; border-left: 4px solid #e94560; margin: 20px 0; }
        .credentials { background: #0f3460; color: white; padding: 15px; border-radius: 8px; margin: 20px 0; font-family: monospace; }
        .credentials strong { color: #00d4ff; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px 15px; margin: 15px 0; font-size: 13px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>YiSA-S</h1>
          <p>Demo Hesabiniz Hazir!</p>
        </div>
        <div class="content">
          <h2>${firmaAdi} icin Demo Hesabi Olusturuldu</h2>
          <p>Merhaba,</p>
          <p><strong>${firmaAdi}</strong> icin demo hesabiniz basariyla olusturulmustur. Asagidaki bilgilerle giris yapabilirsiniz:</p>
          <div class="credentials">
            <p><strong>Giris Adresi:</strong> https://${subdomain}</p>
            <p><strong>Giris E-postasi:</strong> ${username}@demo.yisa-s.com</p>
            <p><strong>Gecici Sifre:</strong> ${tempPassword}</p>
          </div>
          <div class="warning">
            Guvenliginiz icin ilk giriste sifrenizi degistirmenizi oneririz. Demo sureniz: <strong>${expiresDate}</strong> tarihine kadar gecerlidir.
          </div>
          <div class="info-box">
            <p><strong>Subdomain:</strong> ${subdomain}</p>
            <p><strong>Demo Suresi:</strong> 30 gun</p>
            <p><strong>Bitis Tarihi:</strong> ${expiresDate}</p>
          </div>
          <p>Ilk adimlar:</p>
          <ol>
            <li>Subdomain'inize giris yapin</li>
            <li>Sifrenizi degistirin</li>
            <li>Ogrenci kayitlarinizi ekleyin</li>
            <li>Grup yapinizi olusturun</li>
          </ol>
          <a href="https://${subdomain}" class="button">Panele Git</a>
        </div>
        <div class="footer">
          <p>&copy; 2026 YiSA-S. Tum haklari saklidir.</p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail({
    to: email,
    subject: `Demo Hesabiniz Hazir - ${firmaAdi} | YiSA-S`,
    html,
  })
}

/**
 * Tenant hoş geldin emaili gönderir
 */
export async function sendTenantWelcomeEmail(
  email: string,
  firmaAdi: string,
  slug: string
): Promise<void> {
  const subdomain = `${slug}.yisa-s.com`
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0f3460; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background: #e94560; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px; }
        .info-box { background: white; padding: 15px; border-left: 4px solid #e94560; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>YİSA-S</h1>
          <p>Hoş Geldiniz!</p>
        </div>
        <div class="content">
          <h2>${firmaAdi} için YİSA-S Hazır</h2>
          <p>Merhaba,</p>
          <p><strong>${firmaAdi}</strong> için YİSA-S platformu başarıyla kurulmuştur.</p>
          <div class="info-box">
            <p><strong>Subdomain:</strong> ${subdomain}</p>
            <p><strong>Giriş:</strong> <a href="https://${subdomain}">https://${subdomain}</a></p>
          </div>
          <p>İlk adımlar:</p>
          <ol>
            <li>Subdomain'inize giriş yapın</li>
            <li>Öğrenci kayıtlarınızı ekleyin</li>
            <li>Grup yapınızı oluşturun</li>
            <li>Yoklama almaya başlayın</li>
          </ol>
          <a href="https://${subdomain}" class="button">Panele Git</a>
        </div>
        <div class="footer">
          <p>© 2026 YİSA-S. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail({
    to: email,
    subject: `Hoş Geldiniz - ${firmaAdi} YİSA-S Platformu Hazır`,
    html,
  })
}
