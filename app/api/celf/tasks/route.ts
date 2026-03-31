import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"
import { DIRECTORATE_AI_MAP } from "@/lib/celf-directorate-config"

const VALID_DIRECTORATES = [
  "CTO", "CFO", "CMO", "CSPO", "CPO", "CDO", "CHRO", "CLO", "CSO", "CISO", "CCO", "CRDO",
]

const DIRECTORATE_PROVIDERS: Record<string, string> = {
  ...DIRECTORATE_AI_MAP,
  CRDO: "gemini",
}

const DIRECTORATE_KEYWORDS: Record<string, string[]> = {
  CTO: ["kod", "api", "migration", "build", "deploy", "bug", "hata", "teknik", "veritabani", "tablo", "sql", "sistem", "mimari"],
  CFO: ["maliyet", "fiyat", "butce", "gelir", "gider", "odeme", "token", "fatura", "muhasebe", "finans"],
  CMO: ["pazarlama", "kampanya", "reklam", "sosyal medya", "instagram", "tanitim", "icerik"],
  CSPO: ["urun", "spor", "brans", "antrenman", "sporcu", "beceri", "gelisim"],
  CPO: ["ui", "tasarim", "arayuz", "ekran", "sayfa", "design", "panel"],
  CDO: ["veri", "analiz", "rapor", "istatistik", "olcum", "data", "grafik"],
  CHRO: ["ik", "personel", "antrenor", "kadro", "calisan", "maas"],
  CLO: ["hukuk", "sozlesme", "kvkk", "yasal", "mevzuat"],
  CSO: ["strateji", "satis", "demo", "franchise", "tenant", "musteri"],
  CISO: ["guvenlik", "sifre", "yetki", "rol", "izin", "audit", "log"],
  CCO: ["destek", "bildirim", "sikayet", "iletisim", "mesaj", "veli", "hatirlatma"],
  CRDO: ["arastirma", "rakip", "benchmark", "trend", "yenilik", "ar-ge"],
}

/**
 * POST /api/celf/tasks — Dashboard sendToSim entegrasyon noktasi
 * Chat karar panelinden onaylanan kararlari CELF pipeline'a gonderir.
 * Body: { patron_command, target_directorate? }
 * → celf_epics + celf_tasks INSERT
 */
export async function POST(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girisi gerekli" }, { status: 401 })

  try {
    const body = await request.json()
    const patronCommand = typeof body?.patron_command === "string" ? body.patron_command.trim() : ""
    if (!patronCommand) {
      return NextResponse.json({ error: "patron_command zorunlu" }, { status: 400 })
    }

    const targetDirectorate = typeof body?.target_directorate === "string"
      ? body.target_directorate.trim().toUpperCase()
      : ""

    const supabase = createAdminClient()

    // Epic olustur
    const title = patronCommand.slice(0, 80) || "Karar"
    const { data: epic, error: epicErr } = await supabase
      .from("celf_epics")
      .insert({
        title,
        raw_command: patronCommand,
        patron_command: patronCommand,
        status: "distributed",
      })
      .select("id")
      .single()

    if (epicErr || !epic) {
      return NextResponse.json({ error: epicErr?.message ?? "Epic olusturulamadi" }, { status: 500 })
    }

    // Hedef direktorlukleri belirle
    let directorates: string[]
    if (targetDirectorate && VALID_DIRECTORATES.includes(targetDirectorate)) {
      directorates = [targetDirectorate]
    } else {
      directorates = detectDirectorates(patronCommand)
    }

    // Her direktorluk icin gorev olustur
    const tasksToInsert = directorates.map((dir) => ({
      epic_id: epic.id,
      directorate: dir,
      ai_provider: DIRECTORATE_PROVIDERS[dir] || "claude",
      task_description: `"${patronCommand}" komutunu ${dir} perspektifinden analiz et ve sonuc uret.`,
      status: "queued",
    }))

    const { data: insertedTasks, error: tasksErr } = await supabase
      .from("celf_tasks")
      .insert(tasksToInsert)
      .select("id, directorate, ai_provider, task_description, status")

    if (tasksErr) {
      await supabase.from("celf_epics").update({ status: "parsing" }).eq("id", epic.id)
      return NextResponse.json({ error: tasksErr.message }, { status: 500 })
    }

    // Epic guncelle
    await supabase
      .from("celf_epics")
      .update({
        parsed_directorates: directorates,
        total_tasks: insertedTasks?.length ?? 0,
        completed_tasks: 0,
        status: "distributed",
        approval_status: "preparing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", epic.id)

    return NextResponse.json({
      epicId: epic.id,
      directorates,
      tasks: insertedTasks ?? [],
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

/** Komut metninden ilgili direktorlukleri tespit et */
function detectDirectorates(command: string): string[] {
  const lower = command.toLowerCase()
  const matched: string[] = []

  for (const [dir, keywords] of Object.entries(DIRECTORATE_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      matched.push(dir)
    }
  }

  // Hicbir eslestirme yoksa CTO + CDO varsayilan
  if (matched.length === 0) {
    return ["CTO", "CDO"]
  }

  return matched
}
