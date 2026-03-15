import { NextRequest, NextResponse } from "next/server"

import { verifyRestaurant } from "@/lib/tavily"

interface VerifyRequest {
  name: string
  address: string
}

interface VerifyResponse {
  verified: boolean
  reviews: { source: string; author: string; content: string; date: string; rating: number }[]
  status: "open" | "closed" | "unknown"
  imageUrl: string | null
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<VerifyRequest>

    if (!body.name) {
      return NextResponse.json(
        { error: "Restaurant name is required" },
        { status: 400 }
      )
    }

    const name = body.name
    const address = body.address ?? ""

    const { mainResults, reviewResults } = await verifyRestaurant(name, address)

    const response = buildVerifyResponse(name, address, mainResults, reviewResults)

    return NextResponse.json(response)
  } catch (error) {
    console.error("[verify] Verification failed:", error)

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      )
    }

    const message =
      error instanceof Error ? error.message : "Internal server error"
    const status = message.includes("rate") || message.includes("429") ? 429 : 500

    return NextResponse.json({ error: message }, { status })
  }
}

function buildVerifyResponse(
  name: string,
  address: string,
  mainResults: Awaited<ReturnType<typeof verifyRestaurant>>["mainResults"],
  reviewResults: Awaited<ReturnType<typeof verifyRestaurant>>["reviewResults"]
): VerifyResponse {
  let verified = false
  let status: VerifyResponse["status"] = "unknown"
  const reviews: VerifyResponse["reviews"] = []

  if (mainResults) {
    // Check if the restaurant name appears in search results
    const nameMatches = mainResults.results.filter(
      (r) => r.title.includes(name) || r.content.includes(name)
    )
    verified = nameMatches.length >= 1

    // Check for closure indicators
    const allText = mainResults.results.map((r) => r.content).join(" ")
    if (/폐업|영업종료|문 닫|closed permanently/.test(allText)) {
      status = "closed"
      verified = true // Confirmed existence but closed
    } else if (verified) {
      status = "open"
    }

    // If address provided, check address match
    if (address && verified) {
      const addressTerms = address.split(/\s+/).filter((t) => t.length >= 2)
      const addressMatch = nameMatches.some((r) =>
        addressTerms.some(
          (term) => r.content.includes(term) || r.title.includes(term)
        )
      )
      if (!addressMatch) {
        // Name matches but address doesn't — less confident
        verified = nameMatches.length >= 2
      }
    }
  }

  if (reviewResults) {
    for (const result of reviewResults.results) {
      const review = parseReview(result)
      if (review) reviews.push(review)
    }
  }

  // If we have recent reviews, that's a strong signal it's open
  if (reviews.length > 0 && status === "unknown") {
    status = "open"
    verified = true
  }

  // Extract image URL from search results
  let imageUrl: string | null = null
  if (mainResults) {
    for (const result of mainResults.results) {
      // Look for image URLs in results (Tavily includes images when available)
      if ('image' in result && typeof (result as Record<string, unknown>).image === 'string') {
        imageUrl = (result as Record<string, unknown>).image as string
        break
      }
    }
    // Also check rawContent for og:image patterns
    if (!imageUrl) {
      for (const result of mainResults.results) {
        if ('rawContent' in result) {
          const ogMatch = String((result as Record<string, unknown>).rawContent).match(/og:image[^"]*"([^"]+)"/i)
          if (ogMatch) {
            imageUrl = ogMatch[1]
            break
          }
        }
      }
    }
  }

  return { verified, reviews: reviews.slice(0, 5), status, imageUrl }
}

function parseReview(result: {
  url: string
  title: string
  content: string
}): VerifyResponse["reviews"][number] | null {
  const source = getSourceName(result.url)
  const content = result.content.slice(0, 200)

  // Try to extract date
  const dateMatch = result.content.match(
    /(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/
  )
  const date = dateMatch
    ? `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`
    : ""

  // Try to extract rating
  const ratingMatch = result.content.match(
    /(?:평점|별점|rating)[:\s]*(\d+\.?\d*)/i
  )
  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0

  if (!content.trim()) return null

  return {
    source,
    author: "",
    content,
    date,
    rating: Math.min(rating, 5),
  }
}

function getSourceName(url: string): string {
  if (url.includes("naver.com")) return "네이버"
  if (url.includes("kakao.com")) return "카카오"
  if (url.includes("mangoplate.com")) return "망고플레이트"
  if (url.includes("diningcode.com")) return "다이닝코드"
  if (url.includes("catchtable.co.kr")) return "캐치테이블"
  if (url.includes("google.com")) return "구글"
  return new URL(url).hostname
}
