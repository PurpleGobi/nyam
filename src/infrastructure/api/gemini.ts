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
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

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
        temperature: 0.1,
        maxOutputTokens: 1024,
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

const RESTAURANT_PROMPT = `이 음식/식당 사진을 분석해주세요. JSON으로 응답해주세요.
{
  "food_type": "인식된 음식 종류 (예: 초밥, 파스타, 삼겹살)",
  "genre": "음식 장르 (한식/일식/양식/중식/이탈리안/프렌치/동남아/태국/베트남/인도/스페인/멕시칸/아시안/파인다이닝/비스트로/카페/베이커리/바/주점 중 하나)",
  "restaurant_name": "간판이 보이면 식당 이름, 없으면 null",
  "confidence": 0.0~1.0
}
음식이 아닌 사진이면 {"error": "not_food"}로 응답.`

export interface RestaurantRecognition {
  foodType: string | null
  genre: string | null
  restaurantName: string | null
  confidence: number
}

export async function recognizeRestaurant(imageBase64: string): Promise<RestaurantRecognition> {
  const response = await callGeminiVision({ imageBase64, prompt: RESTAURANT_PROMPT })
  const parsed = safeJsonParse(response.text)

  if (parsed.error === 'not_food') {
    throw new Error('NOT_FOOD')
  }

  return {
    foodType: (parsed.food_type as string) ?? null,
    genre: (parsed.genre as string) ?? null,
    restaurantName: (parsed.restaurant_name as string) ?? null,
    confidence: (parsed.confidence as number) ?? 0,
  }
}

// ─── 와인 라벨 OCR ───

const WINE_LABEL_PROMPT = `이 와인 라벨 사진을 분석해주세요. JSON으로 응답해주세요.
{
  "wine_name": "와인 이름",
  "producer": "생산자/와이너리 이름 (없으면 null)",
  "vintage": "빈티지 연도 (숫자, 없으면 null)",
  "region": "산지 (예: Bordeaux, Napa Valley)",
  "country": "국가 (예: France, Italy)",
  "wine_type": "red/white/rose/sparkling/orange/fortified/dessert 중 하나",
  "confidence": 0.0~1.0
}
와인 라벨이 아닌 사진이면 {"error": "not_wine_label"}로 응답.`

export interface WineLabelRecognition {
  wineName: string | null
  producer: string | null
  vintage: number | null
  region: string | null
  country: string | null
  wineType: string | null
  confidence: number
}

export async function recognizeWineLabel(imageBase64: string): Promise<WineLabelRecognition> {
  const response = await callGeminiVision({ imageBase64, prompt: WINE_LABEL_PROMPT })
  const parsed = safeJsonParse(response.text)

  if (parsed.error === 'not_wine_label') {
    throw new Error('NOT_WINE_LABEL')
  }

  return {
    wineName: (parsed.wine_name as string) ?? null,
    producer: (parsed.producer as string) ?? null,
    vintage: parsed.vintage ? Number(parsed.vintage) : null,
    region: (parsed.region as string) ?? null,
    country: (parsed.country as string) ?? null,
    wineType: (parsed.wine_type as string) ?? null,
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
