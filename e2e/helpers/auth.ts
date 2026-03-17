import type { Page } from "@playwright/test"

const SUPABASE_URL = "https://gfshmpuuafjvwsgrxnie.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmc2htcHV1YWZqdndzZ3J4bmllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NTM2NjksImV4cCI6MjA4OTEyOTY2OX0.ZV0wLHULOrhgi0VfZWzV3stAr2JTJafhVQ57-WJypnY"

const TEST_EMAIL = "test@nyam.dev"
const TEST_PASSWORD = "test1234!"

const SUPABASE_REF = "gfshmpuuafjvwsgrxnie"

interface SupabaseSession {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  expires_at: number
  user: Record<string, unknown>
}

// Cache the session to avoid hitting Supabase rate limits
let cachedCookieValue: string | null = null

async function getSessionCookieValue(): Promise<string> {
  if (cachedCookieValue) return cachedCookieValue

  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    },
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Supabase sign-in failed (${res.status}): ${body}`)
  }

  const session: SupabaseSession = await res.json()

  const sessionJson = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    token_type: session.token_type,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    user: session.user,
  })

  // base64url encoding with "base64-" prefix (matching @supabase/ssr v0.9+)
  const base64urlValue = Buffer.from(sessionJson, "utf-8").toString("base64url")
  cachedCookieValue = `base64-${base64urlValue}`
  return cachedCookieValue
}

/**
 * Inject Supabase session cookies so @supabase/ssr recognises the user.
 * Caches the session across tests to avoid rate limiting.
 */
export async function authenticateTestUser(page: Page): Promise<void> {
  const cookieValue = await getSessionCookieValue()

  // Chunk if needed (max 3180 bytes per chunk when URI-encoded)
  const MAX_CHUNK_SIZE = 3180
  const encoded = encodeURIComponent(cookieValue)
  const chunks: string[] = []

  if (encoded.length <= MAX_CHUNK_SIZE) {
    chunks.push(cookieValue)
  } else {
    let pos = 0
    while (pos < encoded.length) {
      let end = Math.min(pos + MAX_CHUNK_SIZE, encoded.length)
      if (end < encoded.length) {
        const lastPercent = encoded.lastIndexOf("%", end)
        if (lastPercent > end - 3 && lastPercent >= pos) {
          end = lastPercent
        }
      }
      chunks.push(decodeURIComponent(encoded.slice(pos, end)))
      pos = end
    }
  }

  const cookieName = `sb-${SUPABASE_REF}-auth-token`
  const cookies = chunks.map((chunk, index) => ({
    name: chunks.length === 1 ? cookieName : `${cookieName}.${index}`,
    value: chunk,
    domain: "localhost",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
  }))

  await page.context().addCookies(cookies)
}

/**
 * Navigate to the login page (for unauthenticated tests).
 */
export async function loginAsTestUser(page: Page): Promise<void> {
  await page.goto("/auth/login")
  await page.waitForURL("**/auth/login**")
}
