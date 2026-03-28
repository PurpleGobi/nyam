// src/infrastructure/api/gemini.ts
// 서버 전용 — GEMINI_API_KEY 클라이언트 노출 금지

interface GeminiVisionRequest {
  imageBase64: string
  prompt: string
}

interface GeminiVisionResponse {
  text: string
  confidence: number
}

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

async function callGeminiVision(request: GeminiVisionRequest): Promise<GeminiVisionResponse> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: request.prompt },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: request.imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 2048,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  return { text, confidence: data.candidates?.[0]?.avgLogProbs ?? 0 }
}

function safeJsonParse(text: string): Record<string, unknown> {
  // Gemini가 ```json ... ``` 블록으로 감싸는 경우 대응
  const cleaned = text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error('AI_PARSE_ERROR')
  }
}

// ─── 식당 인식 ───

const RESTAURANT_PROMPT = `당신은 음식 사진 분석 전문가입니다. 이 사진에서 음식이나 식당 관련 단서를 최대한 추출해주세요.

규칙:
- 음식, 음료, 디저트, 간식, 포장 용기, 메뉴판, 영수증, 식당 내부/외부 등 식사와 조금이라도 관련있으면 분석하세요.
- 확실하지 않아도 최선의 추측을 해주세요. "not_food"는 음식과 전혀 무관한 사진(풍경, 사람, 동물 등)에만 사용하세요.
- search_keywords는 한국 카카오맵에서 근처 식당을 찾기 위한 키워드입니다. 구체적인 음식명을 포함하세요.

JSON으로만 응답:
{
  "food_type": "인식된 음식 (예: 햄버거, 초밥, 파스타, 아메리카노)",
  "genre": "한식/일식/중식/태국/베트남/인도/이탈리안/프렌치/스페인/지중해/미국/멕시칸/카페/바·주점/베이커리/기타 중 하나",
  "restaurant_name": "간판/메뉴판/영수증/포장지 등에서 식당 이름이 보이면 기입, 없으면 null",
  "search_keywords": ["구체적 음식명 키워드 (예: '햄버거', '수제버거', '버거킹')를 1~3개"],
  "confidence": 0.0~1.0
}

음식과 전혀 무관한 사진만 {"error": "not_food"}로 응답.`

export interface RestaurantRecognition {
  foodType: string | null
  genre: string | null
  restaurantName: string | null
  searchKeywords: string[]
  confidence: number
}

export async function recognizeRestaurant(imageBase64: string): Promise<RestaurantRecognition> {
  const response = await callGeminiVision({ imageBase64, prompt: RESTAURANT_PROMPT })

  let parsed: Record<string, unknown>
  try {
    parsed = safeJsonParse(response.text)
  } catch {
    // JSON 파싱 실패 → 텍스트에서 힌트 추출 시도
    const text = response.text.toLowerCase()
    const genreHints: Record<string, string> = {
      '햄버거': '미국', '버거': '미국', '피자': '이탈리안', '파스타': '이탈리안',
      '초밥': '일식', '라멘': '일식', '짬뽕': '중식', '짜장': '중식',
      '삼겹살': '한식', '김치': '한식', '비빔밥': '한식', '불고기': '한식',
      '커피': '카페', '카페': '카페', '빵': '베이커리', '케이크': '베이커리',
      '쌀국수': '베트남', '팟타이': '태국', '카레': '인도',
    }
    let detectedGenre: string | null = null
    const keywords: string[] = []
    for (const [keyword, genre] of Object.entries(genreHints)) {
      if (text.includes(keyword)) {
        detectedGenre = genre
        keywords.push(keyword)
        break
      }
    }
    return {
      foodType: null,
      genre: detectedGenre,
      restaurantName: null,
      searchKeywords: keywords,
      confidence: 0.3,
    }
  }

  if (parsed.error === 'not_food') {
    throw new Error('NOT_FOOD')
  }

  return {
    foodType: (parsed.food_type as string) ?? null,
    genre: (parsed.genre as string) ?? null,
    restaurantName: (parsed.restaurant_name as string) ?? null,
    searchKeywords: Array.isArray(parsed.search_keywords) ? parsed.search_keywords as string[] : [],
    confidence: (parsed.confidence as number) ?? 0,
  }
}

// ─── 와인 라벨 OCR (확장) ───

const WINE_LABEL_PROMPT = `당신은 와인 전문 소믈리에이자 데이터 분석가입니다. 이 사진에서 와인 정보를 최대한 추출하고, 라벨에 없는 정보는 와인 지식으로 추론해주세요.

규칙:
- 와인 라벨, 와인 병, 와인 잔, 와인 관련 사진이면 분석하세요.
- 라벨에서 직접 읽은 정보와 추론한 정보를 구분하되, 모두 포함하세요.
- 가격은 한국 소매 기준 원화(KRW)로 추정하세요.
- vivino_rating은 Vivino에서의 일반적인 평점을 추정하세요 (해당 와인의 일반적 평판 기반).
- 확실하지 않아도 최선의 추측을 해주세요.

JSON으로만 응답:
{
  "wine_name": "와인 정식 이름 (라벨에서 읽은 그대로)",
  "producer": "생산자/와이너리 이름 (없으면 null)",
  "vintage": 빈티지 연도(숫자, 없으면 null),
  "region": "산지 (예: Bordeaux, Napa Valley)",
  "sub_region": "세부 산지 (예: Saint-Émilion, Rutherford, 없으면 null)",
  "country": "국가 (예: France, Italy)",
  "wine_type": "red/white/rose/sparkling/orange/fortified/dessert 중 하나",
  "variety": "주요 포도 품종 (예: Cabernet Sauvignon, Pinot Noir)",
  "grape_varieties": [{"name": "품종명", "pct": 비율(0~100)}],
  "abv": 알코올 도수(숫자, 예: 13.5, 없으면 null),
  "classification": "등급 (예: Grand Cru Classé, DOC, AVA, 없으면 null)",
  "body_level": 바디감(1~5, 1=라이트 5=풀바디),
  "acidity_level": 산도(1~5, 1=낮음 5=높음),
  "sweetness_level": 당도(1~5, 1=드라이 5=스위트),
  "food_pairings": ["추천 음식 페어링 3~5개"],
  "serving_temp": "적정 서빙 온도 (예: 16-18°C)",
  "decanting": "디캔팅 추천 (예: 1시간, 불필요, 없으면 null)",
  "reference_price": 한국 소매 추정가(원화 숫자, 예: 45000),
  "drinking_window_start": 음용 시작 연도(숫자, 없으면 null),
  "drinking_window_end": 음용 마감 연도(숫자, 없으면 null),
  "vivino_rating": Vivino 추정 평점(소수점 1자리, 예: 4.2, 모르면 null),
  "tasting_notes": "간단한 테이스팅 노트 (1~2문장, 한국어)",
  "confidence": 0.0~1.0
}

와인과 전혀 무관한 사진만 {"error": "not_wine_label"}로 응답.`

export interface WineLabelRecognition {
  wineName: string | null
  producer: string | null
  vintage: number | null
  region: string | null
  subRegion: string | null
  country: string | null
  wineType: string | null
  variety: string | null
  grapeVarieties: Array<{ name: string; pct: number }> | null
  abv: number | null
  classification: string | null
  bodyLevel: number | null
  acidityLevel: number | null
  sweetnessLevel: number | null
  foodPairings: string[] | null
  servingTemp: string | null
  decanting: string | null
  referencePrice: number | null
  drinkingWindowStart: number | null
  drinkingWindowEnd: number | null
  vivinoRating: number | null
  tastingNotes: string | null
  confidence: number
}

export async function recognizeWineLabel(imageBase64: string): Promise<WineLabelRecognition> {
  const response = await callGeminiVision({ imageBase64, prompt: WINE_LABEL_PROMPT })
  const parsed = safeJsonParse(response.text)

  if (parsed.error === 'not_wine_label') {
    throw new Error('NOT_WINE_LABEL')
  }

  const grapeVarieties = Array.isArray(parsed.grape_varieties)
    ? (parsed.grape_varieties as Array<{ name: string; pct: number }>)
    : null

  return {
    wineName: (parsed.wine_name as string) ?? null,
    producer: (parsed.producer as string) ?? null,
    vintage: parsed.vintage ? Number(parsed.vintage) : null,
    region: (parsed.region as string) ?? null,
    subRegion: (parsed.sub_region as string) ?? null,
    country: (parsed.country as string) ?? null,
    wineType: (parsed.wine_type as string) ?? null,
    variety: (parsed.variety as string) ?? null,
    grapeVarieties,
    abv: parsed.abv ? Number(parsed.abv) : null,
    classification: (parsed.classification as string) ?? null,
    bodyLevel: parsed.body_level ? Number(parsed.body_level) : null,
    acidityLevel: parsed.acidity_level ? Number(parsed.acidity_level) : null,
    sweetnessLevel: parsed.sweetness_level ? Number(parsed.sweetness_level) : null,
    foodPairings: Array.isArray(parsed.food_pairings) ? (parsed.food_pairings as string[]) : null,
    servingTemp: (parsed.serving_temp as string) ?? null,
    decanting: (parsed.decanting as string) ?? null,
    referencePrice: parsed.reference_price ? Number(parsed.reference_price) : null,
    drinkingWindowStart: parsed.drinking_window_start ? Number(parsed.drinking_window_start) : null,
    drinkingWindowEnd: parsed.drinking_window_end ? Number(parsed.drinking_window_end) : null,
    vivinoRating: parsed.vivino_rating ? Number(parsed.vivino_rating) : null,
    tastingNotes: (parsed.tasting_notes as string) ?? null,
    confidence: (parsed.confidence as number) ?? 0,
  }
}

// ─── 와인 진열장 OCR ───

const WINE_SHELF_PROMPT = `이 와인 진열장/매장 사진에서 보이는 와인들을 인식해주세요. JSON으로 응답해주세요.
{
  "wines": [
    {"name": "와인 이름", "price": 가격(숫자, 없으면 null)},
    ...
  ]
}
와인이 보이지 않으면 {"wines": []}로 응답.`

export interface ShelfRecognition {
  wines: Array<{ name: string; price: number | null }>
}

export async function recognizeWineShelf(imageBase64: string): Promise<ShelfRecognition> {
  const response = await callGeminiVision({ imageBase64, prompt: WINE_SHELF_PROMPT })
  const parsed = safeJsonParse(response.text)
  return { wines: (parsed.wines as ShelfRecognition['wines']) ?? [] }
}

// ─── 와인 영수증 OCR ───

const WINE_RECEIPT_PROMPT = `이 영수증에서 와인 항목을 추출해주세요. JSON으로 응답해주세요.
{
  "items": [
    {"name": "와인/상품명", "price": 가격(숫자), "qty": 수량(숫자, 기본 1)},
    ...
  ],
  "total": 총합(숫자, 없으면 null)
}
영수증이 아니면 {"items": [], "total": null}로 응답.`

export interface ReceiptRecognition {
  items: Array<{ name: string; price: number | null; qty: number }>
  total: number | null
}

export async function recognizeWineReceipt(imageBase64: string): Promise<ReceiptRecognition> {
  const response = await callGeminiVision({ imageBase64, prompt: WINE_RECEIPT_PROMPT })
  const parsed = safeJsonParse(response.text)
  return {
    items: (parsed.items as ReceiptRecognition['items']) ?? [],
    total: (parsed.total as number) ?? null,
  }
}
