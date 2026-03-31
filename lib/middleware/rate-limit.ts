/**
 * YİSA-S Rate Limiting Middleware
 * IP ve email bazlı rate limiting
 */

import { NextRequest, NextResponse } from "next/server"
import { RateLimitError } from "@/lib/errors"
import { log } from "@/lib/logger"
import { env } from "@/lib/env"

interface RateLimitStore {
  [key: string]: {
    count: number
    resetAt: number
  }
}

// In-memory store (production'da Redis kullanılmalı)
const rateLimitStore: RateLimitStore = {}

/**
 * Rate limit config
 */
interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  keyGenerator?: (request: NextRequest) => string
}

/**
 * Default rate limit config
 */
const defaultConfig: RateLimitConfig = {
  maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
}

/**
 * IP adresini alır
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")
  const ip = forwarded?.split(",")[0] || realIP || "unknown"
  return ip
}

/**
 * Rate limit key generator
 */
function defaultKeyGenerator(request: NextRequest): string {
  const ip = getClientIP(request)
  const pathname = request.nextUrl.pathname
  return `${ip}:${pathname}`
}

/**
 * Email bazlı rate limit key generator
 */
function emailKeyGenerator(request: NextRequest): string {
  try {
    const body = request.clone().json()
    // Body'den email al (async işlem, burada basit versiyon)
    return `email:${request.nextUrl.pathname}`
  } catch {
    return defaultKeyGenerator(request)
  }
}

/**
 * Rate limit kontrolü yapar
 */
export async function rateLimit(
  request: NextRequest,
  config: Partial<RateLimitConfig> = {}
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const finalConfig = { ...defaultConfig, ...config }
  const keyGenerator = finalConfig.keyGenerator || defaultKeyGenerator
  const key = await keyGenerator(request)

  const now = Date.now()
  const entry = rateLimitStore[key]

  // İlk istek veya window süresi dolmuş
  if (!entry || entry.resetAt < now) {
    rateLimitStore[key] = {
      count: 1,
      resetAt: now + finalConfig.windowMs,
    }

    // Eski entry'leri temizle (memory leak önleme)
    cleanupOldEntries(now)

    return {
      allowed: true,
      remaining: finalConfig.maxRequests - 1,
      resetAt: now + finalConfig.windowMs,
    }
  }

  // Rate limit aşılmış
  if (entry.count >= finalConfig.maxRequests) {
    log.warn("Rate limit exceeded", { key, count: entry.count })
    throw new RateLimitError(
      `Rate limit exceeded. Try again after ${Math.ceil((entry.resetAt - now) / 1000)} seconds.`
    )
  }

  // İsteğe izin ver, count artır
  entry.count++

  return {
    allowed: true,
    remaining: finalConfig.maxRequests - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * Eski rate limit entry'lerini temizle
 */
function cleanupOldEntries(now: number): void {
  const keys = Object.keys(rateLimitStore)
  for (const key of keys) {
    if (rateLimitStore[key].resetAt < now) {
      delete rateLimitStore[key]
    }
  }
}

/**
 * Rate limit middleware wrapper
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<Response>,
  config?: Partial<RateLimitConfig>
) {
  return async (request: NextRequest): Promise<Response> => {
    try {
      await rateLimit(request, config)
      return await handler(request)
    } catch (error) {
      if (error instanceof RateLimitError) {
        return NextResponse.json(
          {
            error: {
              message: error.message,
              code: error.code,
              statusCode: error.statusCode,
            },
          },
          { status: 429 }
        )
      }
      throw error
    }
  }
}

/**
 * Email bazlı rate limiting (demo request formu için)
 */
export async function rateLimitByEmail(
  email: string,
  maxRequests: number = 3,
  windowMs: number = 24 * 60 * 60 * 1000 // 24 saat
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `email:${email}`
  const now = Date.now()
  const entry = rateLimitStore[key]

  if (!entry || entry.resetAt < now) {
    rateLimitStore[key] = {
      count: 1,
      resetAt: now + windowMs,
    }
    return { allowed: true, remaining: maxRequests - 1 }
  }

  if (entry.count >= maxRequests) {
    log.warn("Email rate limit exceeded", { email, count: entry.count })
    throw new RateLimitError(
      `Bu email adresinden 24 saatte en fazla ${maxRequests} talep gönderebilirsiniz.`
    )
  }

  entry.count++
  return { allowed: true, remaining: maxRequests - entry.count }
}
