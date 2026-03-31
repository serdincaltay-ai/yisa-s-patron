import { NextResponse } from "next/server"

/**
 * Beyin Takımı 4 robot için API key durumu.
 * memberId: ai-chat'ta kullanılan id (claude, gemini, gpt, together)
 */
const ROBOT_KEYS: Record<string, string> = {
  claude: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
  gpt: "OPENAI_API_KEY",
  together: "TOGETHER_API_KEY",
}

const FALLBACK_KEYS: Record<string, string[]> = {
  gemini: ["GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"],
  together: ["TOGETHER_AI_API_KEY"],
}

export async function GET() {
  const status: Record<string, boolean> = {}
  for (const [memberId, envKey] of Object.entries(ROBOT_KEYS)) {
    const fallbacks = FALLBACK_KEYS[memberId] ?? []
    const value = process.env[envKey] || fallbacks.reduce<string | undefined>((v, k) => v || process.env[k], undefined)
    status[memberId] = !!value && !String(value).startsWith("your_")
  }
  return NextResponse.json(status)
}
