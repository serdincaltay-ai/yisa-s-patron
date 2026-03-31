import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { withErrorHandling, ValidationError, AuthenticationError } from "@/lib/errors"
import { log } from "@/lib/logger"
import {
  getRobotById,
  getPackageById,
  getRobotsForPackage,
} from "@/lib/store/robots-config"
import type { RobotDefinition } from "@/lib/store/robots-config"
import { requirePatron } from "@/lib/celf/patron-auth"
import { getUserRole } from "@/lib/middleware/role-auth"

/**
 * POST /api/store/purchase
 * Robot veya paket satin alma (patron yetkisi gerektirir).
 * Body: { tenantId, itemType: "robot"|"package", itemId }
 */
export async function POST(request: Request) {
  return withErrorHandling(async () => {
    const ok = await requirePatron()
    if (!ok) throw new AuthenticationError("Patron oturumu gerekli")

    const auth = await getUserRole()
    const supabase = createAdminClient()

    const body = await request.json()
    const { tenantId, itemType, itemId } = body

    if (!tenantId || !itemType || !itemId) {
      throw new ValidationError("tenantId, itemType ve itemId zorunludur")
    }

    if (itemType !== "robot" && itemType !== "package") {
      throw new ValidationError("itemType 'robot' veya 'package' olmalidir")
    }

    // Duplicate purchase kontrolu
    const { data: existingPurchase } = await supabase
      .from("store_purchases")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("item_id", itemId)
      .eq("status", "active")
      .maybeSingle()

    if (existingPurchase) {
      throw new ValidationError("Bu urun zaten aktif bir abonelikte mevcut")
    }

    // Gecerli item kontrolu
    let itemName: string
    let monthlyPrice: number
    let robotsToAssign: RobotDefinition[] = []

    if (itemType === "robot") {
      const robot = getRobotById(itemId)
      if (!robot) throw new ValidationError("Gecersiz robot ID")
      itemName = robot.name
      monthlyPrice = robot.monthlyPrice
      robotsToAssign = [robot]
    } else {
      const pkg = getPackageById(itemId)
      if (!pkg) throw new ValidationError("Gecersiz paket ID")
      itemName = pkg.name
      monthlyPrice = pkg.monthlyPrice
      robotsToAssign = getRobotsForPackage(itemId)
    }

    // Satin alma kaydini olustur
    const { data: purchase, error: purchaseError } = await supabase
      .from("store_purchases")
      .insert({
        tenant_id: tenantId,
        item_type: itemType,
        item_id: itemId,
        item_name: itemName,
        monthly_price: monthlyPrice,
        status: "active",
        purchased_by: auth.userId,
      })
      .select()
      .single()

    if (purchaseError) {
      log.error("Store purchase insert error", new Error(purchaseError.message), {
        tenantId,
        itemId,
      })
      throw new Error("Satin alma islemi basarisiz oldu")
    }

    // Robotlari tenant'a ata (tenant_robots tablosuna)
    const robotInserts = robotsToAssign.map((robot) => ({
      tenant_id: tenantId,
      robot_id: robot.id,
      robot_name: robot.name,
      category: robot.category,
      status: "active",
      task_count: 0,
      purchase_id: purchase.id,
    }))

    if (robotInserts.length > 0) {
      // Onceden atanmis robotlari kontrol et — muskerrek olanlari cikar
      const { data: existingRobots } = await supabase
        .from("tenant_robots")
        .select("robot_id")
        .eq("tenant_id", tenantId)
        .eq("status", "active")

      const existingIds = new Set((existingRobots ?? []).map((r) => r.robot_id))
      const newInserts = robotInserts.filter((r) => !existingIds.has(r.robot_id))

      if (newInserts.length > 0) {
        const { error: robotError } = await supabase
          .from("tenant_robots")
          .insert(newInserts)

        if (robotError) {
          log.error("Tenant robots insert error", new Error(robotError.message), {
            tenantId,
          })
          // Devam et — satin alma basarili ama atama sorunlu
        }
      }
    }

    // Audit log
    await supabase.from("audit_log").insert({
      event_type: "store_purchase",
      actor_id: auth.userId,
      actor_email: auth.email,
      tenant_id: tenantId,
      target_table: "store_purchases",
      target_id: purchase.id,
      details: { itemType, itemId, itemName, monthlyPrice },
      severity: "info",
    })

    log.info("Store purchase completed", {
      purchaseId: purchase.id,
      tenantId,
      itemType,
      itemId,
    })

    return NextResponse.json({
      success: true,
      purchase_id: purchase.id,
      item_name: itemName,
      monthly_price: monthlyPrice,
      robots_assigned: robotsToAssign.map((r) => r.name),
    })
  })
}
