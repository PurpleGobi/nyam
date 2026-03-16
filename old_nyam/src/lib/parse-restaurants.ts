import type { Restaurant } from "@/types"

interface RawSearchResult {
  url: string
  title: string
  content: string
  score: string
}

/**
 * Parse restaurant information from Tavily search results.
 * Uses text pattern matching to extract structured data.
 */
export function parseRestaurantsFromResults(
  results: RawSearchResult[],
  answers: string[],
  filters: { areas: string[]; cuisines: string[] }
): Restaurant[] {
  const restaurants: Restaurant[] = []
  const seenNames = new Set<string>()

  // Extract from answer text first (most structured)
  for (const answer of answers) {
    const parsed = extractRestaurantsFromText(answer, filters)
    for (const r of parsed) {
      if (!seenNames.has(r.name)) {
        seenNames.add(r.name)
        restaurants.push(r)
      }
    }
  }

  // Extract from individual search results
  for (const result of results) {
    const text = `${result.title}\n${result.content}`
    const parsed = extractRestaurantsFromText(text, filters)
    for (const r of parsed) {
      if (!seenNames.has(r.name)) {
        seenNames.add(r.name)
        // Enrich with source URL
        const enriched = enrichWithUrl(r, result.url)
        restaurants.push(enriched)
      }
    }
  }

  return restaurants.map((r, i) => ({
    ...r,
    id: r.id || `search-${Date.now()}-${i}`,
  }))
}

function extractRestaurantsFromText(
  text: string,
  filters: { areas: string[]; cuisines: string[] }
): Restaurant[] {
  const restaurants: Restaurant[] = []

  // Pattern: numbered list items often contain restaurant names
  // e.g., "1. 스시 오마카세 - 강남구 역삼동..."
  // e.g., "**식당이름** - 설명"
  const patterns = [
    // "1. 식당이름" or "1) 식당이름"
    /(?:^|\n)\s*\d+[.)]\s*\*{0,2}([가-힣a-zA-Z\s&·']{2,20})\*{0,2}/g,
    // "**식당이름**"
    /\*\*([가-힣a-zA-Z\s&·']{2,20})\*\*/g,
    // "- 식당이름:"
    /[-•]\s*([가-힣a-zA-Z\s&·']{2,20})[:：]/g,
  ]

  const names = new Set<string>()

  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].trim()
      if (isLikelyRestaurantName(name)) {
        names.add(name)
      }
    }
  }

  for (const name of names) {
    const surrounding = extractSurroundingText(text, name)
    restaurants.push(buildRestaurant(name, surrounding, filters))
  }

  return restaurants
}

function isLikelyRestaurantName(name: string): boolean {
  if (name.length < 2 || name.length > 20) return false
  // Filter out common non-restaurant strings
  const exclude = [
    "맛집", "추천", "리뷰", "후기", "소개", "정보", "예약",
    "영업시간", "메뉴", "가격", "주소", "전화", "위치",
    "네이버", "카카오", "구글", "블로그", "지도",
    "장점", "단점", "특징", "분위기", "서비스",
  ]
  return !exclude.some((ex) => name === ex)
}

function extractSurroundingText(text: string, name: string): string {
  const idx = text.indexOf(name)
  if (idx === -1) return ""
  const start = Math.max(0, idx - 50)
  const end = Math.min(text.length, idx + name.length + 300)
  return text.slice(start, end)
}

function buildRestaurant(
  name: string,
  context: string,
  filters: { areas: string[]; cuisines: string[] }
): Restaurant {
  const address = extractAddress(context)
  const region = filters.areas[0] || extractRegion(context)
  const cuisine = filters.cuisines[0] || extractCuisine(context)
  const phone = extractPhone(context)
  const price = extractPrice(context)
  const menus = extractMenus(context)
  const rating = extractRating(context)

  return {
    id: "",
    name,
    address,
    shortAddress: address ? shortenAddress(address) : region,
    phone,
    cuisine,
    priceRange: price,
    hours: extractHours(context),
    rating: {
      naver: rating,
      kakao: null,
      google: null,
      average: rating ?? 0,
    },
    representativeMenus: menus.slice(0, 3),
    menu: menus,
    mood: extractMoods(context),
    region,
    verificationStatus: "unverified",
    verifiedAt: null,
    recentReviews: [],
    naverMapUrl: "",
    kakaoMapUrl: "",
    imageUrl: "",
  }
}

function extractAddress(text: string): string {
  // Korean address patterns
  const patterns = [
    /(?:서울|경기|인천|부산|대구|대전|광주|울산|세종|강원|충[남북]|전[남북]|경[남북]|제주)[시도]?\s?[가-힣]+[시군구]\s?[가-힣]+[동읍면로길]\s?[\d-]*/,
  ]
  for (const p of patterns) {
    const match = text.match(p)
    if (match) return match[0].trim()
  }
  return ""
}

function shortenAddress(address: string): string {
  // "서울시 강남구 역삼동 123-4" -> "강남구 역삼동"
  const match = address.match(/([가-힣]+[구군시])\s*([가-힣]+[동읍면로길])/)
  if (match) return `${match[1]} ${match[2]}`
  return address.slice(0, 15)
}

function extractRegion(text: string): string {
  const regions = [
    "강남", "홍대", "이태원", "명동", "종로", "신촌", "건대",
    "잠실", "여의도", "성수", "을지로", "광화문", "압구정",
    "청담", "삼성", "역삼", "서초", "송파", "마포", "용산",
  ]
  for (const r of regions) {
    if (text.includes(r)) return r
  }
  return ""
}

function extractCuisine(text: string): string {
  const cuisines: Record<string, string> = {
    한식: "한식", 한정식: "한식", 국밥: "한식", 비빔밥: "한식",
    일식: "일식", 스시: "일식", 초밥: "일식", 오마카세: "일식", 라멘: "일식",
    중식: "중식", 중국집: "중식", 짜장: "중식", 딤섬: "중식",
    양식: "양식", 파스타: "양식", 스테이크: "양식", 피자: "양식",
    카페: "카페", 디저트: "카페",
    고기: "고기", 삼겹살: "고기", 소고기: "고기", 갈비: "고기", 구이: "고기",
    해산물: "해산물", 회: "해산물", 해물: "해산물",
    치킨: "치킨", 분식: "분식", 베트남: "아시안", 태국: "아시안",
  }
  for (const [keyword, category] of Object.entries(cuisines)) {
    if (text.includes(keyword)) return category
  }
  return ""
}

function extractPhone(text: string): string {
  const match = text.match(/0\d{1,2}[-)\s]?\d{3,4}[-\s]?\d{4}/)
  return match ? match[0] : ""
}

function extractPrice(text: string): string {
  if (/프리미엄|파인다이닝|특선/.test(text)) return "premium"
  if (/고급|럭셔리|비싼/.test(text)) return "expensive"
  if (/가성비|저렴|싼/.test(text)) return "cheap"
  return "moderate"
}

function extractHours(text: string): string {
  const match = text.match(
    /(?:영업시간|운영시간|오픈)[:\s]*(\d{1,2}:\d{2}\s*[-~]\s*\d{1,2}:\d{2})/
  )
  return match ? match[1] : ""
}

function extractMenus(
  text: string
): { name: string; price: number; description?: string }[] {
  const menus: { name: string; price: number }[] = []
  // Pattern: "메뉴이름 12,000원" or "메뉴이름 12000원"
  const pattern = /([가-힣a-zA-Z\s]{2,15})\s+([\d,]+)\s*원/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    const name = match[1].trim()
    const price = parseInt(match[2].replace(/,/g, ""), 10)
    if (price > 0 && price < 1_000_000 && name.length >= 2) {
      menus.push({ name, price })
    }
  }
  return menus
}

function extractRating(text: string): number | null {
  const match = text.match(/(?:평점|별점|rating)[:\s]*(\d+\.?\d*)/i)
  if (match) {
    const rating = parseFloat(match[1])
    if (rating > 0 && rating <= 5) return rating
  }
  return null
}

function extractMoods(text: string): string[] {
  const moodKeywords: Record<string, string> = {
    분위기좋은: "분위기 좋은",
    조용한: "조용한",
    아늑한: "아늑한",
    모던: "모던한",
    트렌디: "트렌디한",
    캐주얼: "캐주얼",
    고급스러운: "고급스러운",
    로맨틱: "로맨틱",
    활기찬: "활기찬",
    전통적: "전통적인",
    이색적: "이색적인",
    뷰맛집: "뷰맛집",
  }
  const moods: string[] = []
  for (const [keyword, mood] of Object.entries(moodKeywords)) {
    if (text.includes(keyword)) moods.push(mood)
  }
  return moods
}

function enrichWithUrl(restaurant: Restaurant, url: string): Restaurant {
  if (url.includes("naver.com")) {
    return { ...restaurant, naverMapUrl: url }
  }
  if (url.includes("kakao.com")) {
    return { ...restaurant, kakaoMapUrl: url }
  }
  return restaurant
}
