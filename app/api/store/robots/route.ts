import { NextResponse } from "next/server"
import { ROBOTS, PACKAGES } from "@/lib/store/robots-config"

/**
 * GET /api/store/robots
 * Robot ve paket listesini dondurur (public — fiyat katalogu).
 */
export async function GET() {
  return NextResponse.json({
    robots: ROBOTS.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      features: r.features,
      icon: r.icon,
      color: r.color,
      monthlyPrice: r.monthlyPrice,
      category: r.category,
    })),
    packages: PACKAGES.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      robotIds: p.robotIds,
      monthlyPrice: p.monthlyPrice,
      savings: p.savings,
      badge: p.badge,
      color: p.color,
    })),
  })
}
