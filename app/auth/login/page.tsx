"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { QRCodeSVG } from "qrcode.react"
import {
  Shield,
  Building2,
  Dumbbell,
  Users,
  Briefcase,
  Eye,
  EyeOff,
  Loader2,
  UserCog,
  Wallet,
  Lock,
  Smartphone,
} from "lucide-react"

/* ================================================================
   YiSA-S Unified Login Page — MFA/TOTP Entegrasyonu
   Supabase Auth + MFA + IP Lockout + Session Expiry (4 saat)
   ================================================================ */

const ROLE_INFO = [
  { role: "patron", label: "Patron", icon: Shield, color: "text-indigo-400", path: "/patron/dashboard" },
  { role: "tenant_owner", label: "Tesis Sahibi", icon: Building2, color: "text-cyan-400", path: "/franchise" },
  { role: "mudur", label: "Müdür", icon: Briefcase, color: "text-amber-400", path: "/mudur" },
  { role: "admin", label: "Yönetici", icon: UserCog, color: "text-purple-400", path: "/franchise" },
  { role: "coach", label: "Antrenör", icon: Dumbbell, color: "text-emerald-400", path: "/antrenor" },
  { role: "kasa", label: "Kasa Sorumlusu", icon: Wallet, color: "text-pink-400", path: "/franchise" },
  { role: "veli", label: "Veli", icon: Users, color: "text-orange-400", path: "/veli" },
]

type LoginStep = "credentials" | "mfa-enroll" | "mfa-verify"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // MFA State
  const [step, setStep] = useState<LoginStep>("credentials")
  const [totpCode, setTotpCode] = useState("")
  const [qrUri, setQrUri] = useState("")
  const [totpSecret, setTotpSecret] = useState("")
  const [factorId, setFactorId] = useState("")
  const [remainingAttempts, setRemainingAttempts] = useState(5)

  // IP kilit kontrolu
  const checkIpLock = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check-ip" }),
      })
      const data = await res.json()
      if (data.locked) {
        setError(data.message || "Cok fazla basarisiz deneme. 30 dakika bekleyin.")
        return false
      }
      setRemainingAttempts(data.remainingAttempts ?? 5)
      return true
    } catch {
      return true // Hata durumunda gecir
    }
  }, [])

  // Basarisiz deneme logla
  const logAttempt = useCallback(async (success: boolean, userId?: string) => {
    try {
      await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "log-attempt", success, userId, email: email.trim() }),
      })
    } catch {
      // Sessiz hata
    }
  }, [email])

  // Farkli IP kontrolu
  const checkDifferentIp = useCallback(async (userId: string) => {
    try {
      await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "notify-different-ip", userId, email: email.trim() }),
      })
    } catch {
      // Sessiz hata
    }
  }, [email])

  // Adim 1: Kimlik dogrulama
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    setError("")

    // IP kilit kontrolu
    const canProceed = await checkIpLock()
    if (!canProceed) {
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      })

      if (authError) {
        await logAttempt(false)
        const newRemaining = remainingAttempts - 1
        setRemainingAttempts(newRemaining)
        setError(
          authError.message === "Invalid login credentials"
            ? `E-posta veya şifre hatalı.${newRemaining <= 2 ? ` (${newRemaining} deneme hakkınız kaldı)` : ""}`
            : authError.message
        )
        setLoading(false)
        return
      }

      const userId = authData.user?.id

      // Basarili giris logla
      await logAttempt(true, userId)

      // Farkli IP kontrolu
      if (userId) {
        await checkDifferentIp(userId)
      }

      // MFA faktor kontrolu
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totpFactors = factors?.totp ?? []
      const verifiedFactor = totpFactors.find((f) => f.status === "verified")

      if (verifiedFactor) {
        // MFA kayitli — dogrulama adimina gec
        setFactorId(verifiedFactor.id)
        setStep("mfa-verify")
        setLoading(false)
        return
      }

      // MFA kayitli degil — kayit adimina gec (patron icin zorunlu)
      const roleRes = await fetch("/api/auth/login")
      const roleData = await roleRes.json()

      if (roleData.role === "patron") {
        // Patron icin MFA zorunlu — enroll
        const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: "YiSA-S Patron TOTP",
        })

        if (enrollError || !enrollData) {
          setError("MFA kaydi basarisiz: " + (enrollError?.message || "Bilinmeyen hata"))
          setLoading(false)
          return
        }

        setQrUri(enrollData.totp.uri)
        setTotpSecret(enrollData.totp.secret)
        setFactorId(enrollData.id)
        setStep("mfa-enroll")
        setLoading(false)
        return
      }

      // Patron olmayan roller — dogrudan yonlendir
      await completeLogin(roleData)
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar deneyin.")
      setLoading(false)
    }
  }

  // Adim 2: MFA dogrulama
  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!totpCode.trim() || totpCode.length < 6) return
    setLoading(true)
    setError("")

    try {
      const supabase = createClient()

      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      })

      if (challengeError || !challengeData) {
        setError("MFA challenge basarisiz: " + (challengeError?.message || ""))
        setLoading(false)
        return
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: totpCode.trim(),
      })

      if (verifyError) {
        setError("Gecersiz dogrulama kodu. Tekrar deneyin.")
        setTotpCode("")
        setLoading(false)
        return
      }

      // Rolu al ve yonlendir
      const roleRes = await fetch("/api/auth/login")
      const roleData = await roleRes.json()
      await completeLogin(roleData)
    } catch {
      setError("Dogrulama hatasi. Tekrar deneyin.")
      setLoading(false)
    }
  }

  // Login tamamla
  async function completeLogin(roleData: { role?: string }) {
    if (roleData.role) {
      // Patron ise session cookie ayarla (server-side, sifre gerektirmez)
      if (roleData.role === "patron") {
        const sessionRes = await fetch("/api/auth/mfa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "set-patron-session" }),
        })
        if (!sessionRes.ok) {
          const sessionData = await sessionRes.json().catch(() => ({}))
          setError(sessionData.error || "Patron oturumu ayarlanamadi. Tekrar deneyin.")
          setLoading(false)
          return
        }
      }
      const info = ROLE_INFO.find((r) => r.role === roleData.role)
      router.push(info?.path ?? "/patron/dashboard")
    } else {
      setError("Hesabınıza rol atanmamış. Yöneticiyle iletişime geçin.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#060a13] flex items-center justify-center relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(129,140,248,0.06)_0%,transparent_70%)]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
            <Shield className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide font-mono">
            YiSA-S
          </h1>
          <p className="text-sm text-zinc-500 mt-1 font-mono">
            Akıllı Yönetim Platformu
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#0a0e17]/80 border border-[#2a3650]/60 rounded-2xl p-6 backdrop-blur-sm">
          {/* ADIM 1: Kimlik Bilgileri */}
          {step === "credentials" && (
            <>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold tracking-widest text-indigo-400 uppercase font-mono">
                  Güvenli Giriş
                </span>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400 uppercase tracking-wider block mb-2 font-mono">
                    E-posta
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@yisa-s.com"
                    className="w-full bg-[#060a13] border border-[#2a3650] rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/40 transition-colors font-mono"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 uppercase tracking-wider block mb-2 font-mono">
                    Şifre
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Şifrenizi girin..."
                      className="w-full bg-[#060a13] border border-[#2a3650] rounded-lg px-4 py-3 pr-10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/40 transition-colors font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 min-h-[44px] min-w-[44px] flex items-center justify-center -m-2"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="text-xs text-red-400 bg-red-500/5 border border-red-500/15 rounded-lg px-3 py-2 font-mono">
                    {error}
                  </div>
                )}

                {remainingAttempts <= 2 && remainingAttempts > 0 && (
                  <div className="text-xs text-amber-400 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2 font-mono">
                    {remainingAttempts} deneme hakkiniz kaldi. 5 basarisiz denemede hesabiniz 30 dk kilitlenir.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim() || !password.trim()}
                  className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white text-sm font-bold tracking-wider transition-all font-mono flex items-center justify-center gap-2 min-h-[48px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Doğrulanıyor...
                    </>
                  ) : (
                    "GİRİŞ YAP"
                  )}
                </button>
              </form>
            </>
          )}

          {/* ADIM 2a: MFA Kayit (Enroll) */}
          {step === "mfa-enroll" && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <Smartphone className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold tracking-widest text-indigo-400 uppercase font-mono">
                  MFA Kaydi — TOTP Kurulumu
                </span>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-zinc-400 font-mono leading-relaxed">
                  Patron hesabiniz icin iki faktorlu kimlik dogrulama zorunludur.
                  Authenticator uygulamanizla (Google Authenticator, Authy vb.) asagidaki QR kodu tarayin.
                </p>

                {/* QR Kodu */}
                <div className="bg-white rounded-xl p-4 mx-auto w-fit">
                    {qrUri ? (
                      <QRCodeSVG
                        value={qrUri}
                        size={200}
                        className="mx-auto"
                      />
                  ) : (
                    <div className="w-[200px] h-[200px] flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                    </div>
                  )}
                </div>

                {totpSecret && (
                  <div className="bg-[#060a13] rounded-lg p-3 border border-[#2a3650]">
                    <p className="text-[10px] text-zinc-500 font-mono mb-1">Manuel giris kodu:</p>
                    <p className="text-xs text-indigo-400 font-mono font-bold tracking-widest break-all select-all">
                      {totpSecret}
                    </p>
                  </div>
                )}

                <form onSubmit={handleMfaVerify} className="space-y-3">
                  <div>
                    <label className="text-xs text-zinc-400 uppercase tracking-wider block mb-2 font-mono">
                      Dogrulama Kodu (6 haneli)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      className="w-full bg-[#060a13] border border-[#2a3650] rounded-lg px-4 py-3 text-center text-2xl text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/40 transition-colors font-mono tracking-[0.5em]"
                      autoFocus
                    />
                  </div>

                  {error && (
                    <div className="text-xs text-red-400 bg-red-500/5 border border-red-500/15 rounded-lg px-3 py-2 font-mono">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || totpCode.length < 6}
                    className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white text-sm font-bold tracking-wider transition-all font-mono flex items-center justify-center gap-2 min-h-[48px]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Dogrulaniyor...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        MFA KAYDET & GIRIS YAP
                      </>
                    )}
                  </button>
                </form>
              </div>
            </>
          )}

          {/* ADIM 2b: MFA Dogrulama (Challenge) */}
          {step === "mfa-verify" && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold tracking-widest text-indigo-400 uppercase font-mono">
                  Iki Faktorlu Dogrulama
                </span>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-zinc-400 font-mono leading-relaxed">
                  Authenticator uygulamanizdan 6 haneli dogrulama kodunu girin.
                </p>

                <form onSubmit={handleMfaVerify} className="space-y-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="w-full bg-[#060a13] border border-[#2a3650] rounded-lg px-4 py-3 text-center text-2xl text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/40 transition-colors font-mono tracking-[0.5em]"
                    autoFocus
                  />

                  {error && (
                    <div className="text-xs text-red-400 bg-red-500/5 border border-red-500/15 rounded-lg px-3 py-2 font-mono">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || totpCode.length < 6}
                    className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white text-sm font-bold tracking-wider transition-all font-mono flex items-center justify-center gap-2 min-h-[48px]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Dogrulaniyor...
                      </>
                    ) : (
                      "DOGRULA & GIRIS YAP"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("credentials")
                      setTotpCode("")
                      setError("")
                    }}
                    className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-300 font-mono transition-colors"
                  >
                    Geri don
                  </button>
                </form>
              </div>
            </>
          )}

          {/* Role info — sadece credentials adiminda goster */}
          {step === "credentials" && (
            <div className="mt-6 pt-4 border-t border-[#2a3650]/40">
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-3 font-mono">
                Desteklenen Roller
              </p>
              <div className="flex flex-wrap gap-2">
                {ROLE_INFO.map((r) => (
                  <div
                    key={r.role}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-800/50 border border-zinc-700/30 min-h-[36px]"
                  >
                    <r.icon className={`w-3 h-3 ${r.color}`} />
                    <span className="text-[10px] text-zinc-400 font-mono">{r.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-4">
          <span className="text-[10px] text-zinc-600 tracking-wider font-mono">
            v3.0 | Supabase Auth + MFA | yisa-s.com
          </span>
        </div>
      </div>
    </div>
  )
}
