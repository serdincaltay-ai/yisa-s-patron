import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * yisa-s-patron middleware
 * Sadece app.yisa-s.com domain'ini kabul eder.
 * Geliştirme ortamında localhost'a izin verir.
 * Vercel preview deploy'larına izin verir.
 * Supabase auth session'ını yeniler.
 */
export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0]; // Port'u kaldır

  // İzin verilen domain
  const allowedHosts = ["app.yisa-s.com"];

  // Geliştirme ortamı kontrolü
  const isDevelopment =
    hostname === "localhost" || hostname === "127.0.0.1";

  // Vercel preview deploy'ları
  const isVercelPreview = hostname.endsWith(".vercel.app");

  if (!isDevelopment && !isVercelPreview && !allowedHosts.includes(hostname)) {
    return new NextResponse("Bu domain için yetki yok.", { status: 403 });
  }

  // Supabase auth session'ını yenile
  const { response } = await updateSession(request);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
