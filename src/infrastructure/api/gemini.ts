const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
const GEMINI_TIMEOUT_MS = 30_000

export async function fetchImageAsBase64(url: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    const base64 = Buffer.from(buffer).toString("base64")
    const mimeType = res.headers.get("content-type") ?? "image/jpeg"
    return { mimeType, data: base64 }
  } catch {
    return null
  }
}

export async function callGemini(parts: Array<Record<string, unknown>>, temperature = 0.2): Promise<Record<string, unknown>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)
  const response = await fetch(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature, responseMimeType: "application/json" },
    }),
    signal: controller.signal,
  })
  clearTimeout(timer)

  if (!response.ok) {
    throw new Error("Gemini API request failed")
  }

  const data = await response.json()
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}"
  return JSON.parse(rawText)
}

export async function prepareImageParts(photoUrls: string[]): Promise<Array<Record<string, unknown>>> {
  const imagePromises = photoUrls.slice(0, 8).map(fetchImageAsBase64)
  const images = await Promise.all(imagePromises)
  const parts: Array<Record<string, unknown>> = []
  for (const img of images) {
    if (img) {
      parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } })
    }
  }
  return parts
}
