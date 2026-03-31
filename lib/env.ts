import { z } from "zod"

/**
 * Environment variables validation schema
 * Tüm environment variable'lar burada tanımlanır ve validate edilir
 */
// Build sırasında env yoksa veya geçersizse placeholder (collect page data hatasını önler)
function toValidUrl(s: string | undefined): string {
  const v = (s ?? "").trim()
  if (!v || v === "undefined") return "https://placeholder.supabase.co"
  try {
    new URL(v)
    return v
  } catch {
    return "https://placeholder.supabase.co"
  }
}
const urlOrPlaceholder = z
  .string()
  .optional()
  .default("")
  .transform(toValidUrl)
  .pipe(z.string().url())
const anonKeyOrPlaceholder = z
  .string()
  .optional()
  .default("")
  .transform((s) => {
    const v = (s ?? "").trim()
    return !v || v === "undefined" ? "placeholder-anon-key" : v
  })
  .pipe(z.string().min(1))

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: urlOrPlaceholder,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKeyOrPlaceholder,
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_WEBHOOK_SECRET: z.string().min(1).optional(),

  // Resend (Email)
  RESEND_API_KEY: z.string().min(1).optional(),

  // SMS
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  NETGSM_USERNAME: z.string().optional(),
  NETGSM_PASSWORD: z.string().optional(),

  // Payment
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  PAYTR_MERCHANT_ID: z.string().optional(),
  PAYTR_MERCHANT_KEY: z.string().optional(),
  PAYTR_MERCHANT_SALT: z.string().optional(),

  // AI APIs
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GOOGLE_GEMINI_API_KEY: z.string().optional(),
  TOGETHER_API_KEY: z.string().optional(),

  // Vercel Blob
  BLOB_READ_WRITE_TOKEN: z.string().optional(),

  // App URLs
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_VITRIN_URL: z.string().url().default("http://localhost:3000"),

  // Rate Limiting
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),

  // Logging
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  SENTRY_DSN: z
    .string()
    .optional()
    .transform((s) => (s && (s.startsWith("http://") || s.startsWith("https://")) ? s : undefined)),

  // Node Environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
})

/**
 * Validated environment variables
 * Runtime'da environment variable'ları validate eder
 */
function validateEnv() {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    console.error("❌ Invalid environment variables:")
    console.error(parsed.error.flatten().fieldErrors)
    throw new Error("Invalid environment variables")
  }

  return parsed.data
}

// Validate ve export et
export const env = validateEnv()

// Type export
export type Env = z.infer<typeof envSchema>
