import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"

export const dynamic = "force-dynamic"

/**
 * Istatistik API — gercek Supabase verileriyle detayli istatistikler.
 * period parametresi: hafta | ay | yil
 */
export async function GET(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron oturumu gerekli" }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "ay"

    const supabase = createAdminClient()

    // Donem hesapla
    const now = new Date()
    let periodStart: Date
    switch (period) {
      case "hafta":
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "yil":
        periodStart = new Date(now.getFullYear(), 0, 1)
        break
      default: // ay
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    }
    const periodISO = periodStart.toISOString()

    // Paralel sorgular
    const [
      athletesResult,
      staffResult,
      paymentsResult,
      attendanceResult,
      demoResult,
      robotTasksResult,
      branchesResult,
    ] = await Promise.all([
      // Toplam uye (athletes)
      supabase.from("athletes").select("id, tenant_id, created_at", { count: "exact" }),
      // Aktif antrenor (staff)
      supabase.from("staff").select("id, role, tenant_id", { count: "exact" }),
      // Odemeler (payments) — donem icinde
      supabase.from("payments").select("id, amount, type, created_at").gte("created_at", periodISO),
      // Yoklama (attendance) — donem icinde
      supabase.from("attendance").select("id, status, created_at").gte("created_at", periodISO),
      // Demo talepler
      supabase.from("demo_requests").select("id, status, created_at", { count: "exact" }),
      // Robot kullanimi
      supabase.from("robot_task_queue").select("id, created_at", { count: "exact" }),
      // Brans bilgileri
      supabase.from("sports_branches").select("id, name"),
    ])

    const totalAthletes = athletesResult.count ?? 0
    const totalStaff = staffResult.count ?? 0
    const totalDemoRequests = demoResult.count ?? 0
    const totalRobotTasks = robotTasksResult.count ?? 0

    // Gelir / Gider hesapla
    const payments = paymentsResult.data ?? []
    const gelir = payments
      .filter((p) => (p.type as string) !== "gider" && (p.type as string) !== "expense")
      .reduce((sum, p) => sum + ((p.amount as number) || 0), 0)
    const gider = payments
      .filter((p) => (p.type as string) === "gider" || (p.type as string) === "expense")
      .reduce((sum, p) => sum + Math.abs((p.amount as number) || 0), 0)

    // Yoklama orani
    const attendanceRecords = attendanceResult.data ?? []
    const totalAttendance = attendanceRecords.length
    const presentCount = attendanceRecords.filter(
      (a) => (a.status as string) === "present" || (a.status as string) === "geldi"
    ).length
    const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0

    // Aidat tahsilat orani (odenmis / toplam)
    const totalPaymentCount = payments.length
    const paidCount = payments.filter(
      (p) => (p.type as string) !== "gider" && (p.type as string) !== "expense"
    ).length
    const collectionRate = totalPaymentCount > 0 ? Math.round((paidCount / totalPaymentCount) * 100) : 0

    const periodLabel = period === "hafta" ? "Haftalik" : period === "yil" ? "Yillik" : "Aylik"

    const stats = [
      { label: "Toplam Uye", value: totalAthletes, color: "#00d4ff" },
      { label: "Aktif Antrenor", value: totalStaff, color: "#e94560" },
      { label: `${periodLabel} Gelir`, value: formatCurrency(gelir), color: "#10b981" },
      { label: `${periodLabel} Gider`, value: formatCurrency(gider), color: "#f59e0b" },
      { label: "Yoklama Orani", value: `%${attendanceRate}`, color: "#818cf8" },
      { label: "Aidat Tahsilat", value: `%${collectionRate}`, color: "#00d4ff" },
      { label: "Robot Kullanimi", value: `${totalRobotTasks} gorev`, color: "#e94560" },
      { label: "Demo Talep", value: totalDemoRequests, color: "#10b981" },
    ]

    // Brans bazli performans
    const branches = (branchesResult.data ?? []).slice(0, 5)
    const branchStats = branches.map((b) => ({
      name: (b.name as string) || "Bilinmiyor",
      members: 0,
      attendanceRate: 0,
      revenue: "0 TL",
      trend: "-",
    }))

    return NextResponse.json({ stats, branchStats, period })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

function formatCurrency(amount: number): string {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1).replace(/\.0$/, "")}K TL`
  }
  return `${amount.toLocaleString("tr-TR")} TL`
}
