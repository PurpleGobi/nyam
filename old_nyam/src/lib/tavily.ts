import { TavilyClient } from "tavily"

const client = new TavilyClient({
  apiKey: process.env.TAVILY_API_KEY,
})

const FOOD_DOMAINS = [
  "naver.com",
  "kakao.com",
  "mangoplate.com",
  "diningcode.com",
  "catchtable.co.kr",
]

interface SearchRestaurantsParams {
  areas: string[]
  cuisines: string[]
  occasions: string[]
  priceRange: string[]
  moods: string[]
  partySize: string
}

const OCCASION_KEYWORDS: Record<string, string> = {
  데이트: "데이트 맛집",
  회식: "회식 장소",
  가족모임: "가족 외식",
  소개팅: "소개팅 맛집",
  접대: "접대 식당",
  혼밥: "혼밥 맛집",
  기념일: "기념일 레스토랑",
  생일: "생일 파티 맛집",
}

const PRICE_KEYWORDS: Record<string, string> = {
  cheap: "가성비",
  moderate: "",
  expensive: "고급",
  premium: "프리미엄 파인다이닝",
}

function buildSearchQueries(params: SearchRestaurantsParams): string[] {
  const areas = params.areas.length > 0 ? params.areas : ["서울"]
  const cuisines = params.cuisines.length > 0 ? params.cuisines : [""]

  const queries: string[] = []

  for (const area of areas) {
    for (const cuisine of cuisines) {
      const parts: string[] = [area]

      if (cuisine) parts.push(cuisine)

      // occasion
      for (const occasion of params.occasions) {
        const keyword = OCCASION_KEYWORDS[occasion] || `${occasion} 맛집`
        parts.push(keyword)
      }

      // price
      for (const price of params.priceRange) {
        const keyword = PRICE_KEYWORDS[price]
        if (keyword) parts.push(keyword)
      }

      // mood
      if (params.moods.length > 0) {
        parts.push(params.moods.join(" "))
      }

      // party size hint
      if (params.partySize && parseInt(params.partySize) >= 10) {
        parts.push("단체석")
      }

      if (!parts.some((p) => p.includes("맛집") || p.includes("식당") || p.includes("레스토랑"))) {
        parts.push("맛집 추천")
      }

      parts.push("2024 2025")

      queries.push(parts.filter(Boolean).join(" "))
    }
  }

  // Limit to 3 queries to avoid excessive API calls
  return queries.slice(0, 3)
}

export async function searchRestaurants(params: SearchRestaurantsParams) {
  const queries = buildSearchQueries(params)

  const results = await Promise.allSettled(
    queries.map((query) =>
      client.search({
        query,
        search_depth: "advanced",
        include_answer: true,
        max_results: 5,
        include_domains: FOOD_DOMAINS,
      })
    )
  )

  const allResults: { url: string; title: string; content: string; score: string }[] = []
  const answers: string[] = []
  const seenUrls = new Set<string>()

  for (const result of results) {
    if (result.status === "fulfilled") {
      if (result.value.answer) {
        answers.push(result.value.answer)
      }
      for (const item of result.value.results) {
        if (!seenUrls.has(item.url)) {
          seenUrls.add(item.url)
          allResults.push(item)
        }
      }
    }
  }

  return { results: allResults, answers }
}

export async function verifyRestaurant(name: string, address: string) {
  const query = `${name} ${address} 식당 영업`

  const [mainResult, reviewResult] = await Promise.allSettled([
    client.search({
      query,
      search_depth: "basic",
      include_answer: true,
      include_images: true,
      max_results: 5,
      include_domains: ["naver.com", "kakao.com", "google.com"],
    }),
    client.search({
      query: `${name} ${address} 리뷰 후기`,
      search_depth: "basic",
      max_results: 3,
      include_domains: FOOD_DOMAINS,
    }),
  ])

  const mainResults =
    mainResult.status === "fulfilled" ? mainResult.value : null
  const reviewResults =
    reviewResult.status === "fulfilled" ? reviewResult.value : null

  return { mainResults, reviewResults }
}
