import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * yisa-s-patron middleware
 * Sadece app.yisa-s.com domain'ini kabul eder.
 * Geliştirme ortamında localhost'a, Vercel preview'da *.vercel.app'e izin verir.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0]; // Port'u kaldır

  // İzin verilen domain
  const allowedHosts = ["app.yisa-s.com"];

  // Geliştirme ortamı kontrolü
  const isDevelopment =
    hostname === "localhost" || hostname === "127.0.0.1";

  // Vercel preview URL'leri (.vercel.app)
  const isVercelPreview = hostname.endsWith(".vercel.app");

  if (!isDevelopment && !isVercelPreview && !allowedHosts.includes(hostname)) {
    return new NextResponse("Bu domain için yetki yok.", { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
