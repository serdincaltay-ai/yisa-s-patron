import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/middleware/role-auth"

/**
 * GET /api/auth/login
 * Returns the current user's role for client-side redirect
 */
export async function GET() {
  try {
    const auth = await getUserRole()

    if (!auth.userId || !auth.role) {
      return NextResponse.json({ role: null, error: "No role assigned" }, { status: 200 })
    }

    return NextResponse.json({
      role: auth.role,
      email: auth.email,
      tenantId: auth.tenantId,
    })
  } catch {
    return NextResponse.json({ role: null, error: "Auth error" }, { status: 500 })
  }
}
