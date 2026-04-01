// src/infrastructure/api/gemini.ts
// AI 인식 로직 — 프롬프트 + 응답 파싱 (provider 무관)
// 서버 전용

import { callVision, callText } from '@/infrastructure/api/llm'

function safeJsonParse(text: string): Record<string, unknown> | Record<string, unknown>[] {
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

export async function recognizeRestaurant(imageUrl: string): Promise<RestaurantRecognition> {
  const text = await callVision(imageUrl, RESTAURANT_PROMPT)

  let parsed: Record<string, unknown>
  try {
    parsed = safeJsonParse(text) as Record<string, unknown>
  } catch {
    const lower = text.toLowerCase()
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
      if (lower.includes(keyword)) {
        detectedGenre = genre
        keywords.push(keyword)
        break
      }
    }
    return { foodType: null, genre: detectedGenre, restaurantName: null, searchKeywords: keywords, confidence: 0.3 }
  }

  if (parsed.error === 'not_food') throw new Error('NOT_FOOD')

  return {
    foodType: (parsed.food_type as string) ?? null,
    genre: (parsed.genre as string) ?? null,
    restaurantName: (parsed.restaurant_name as string) ?? null,
    searchKeywords: Array.isArray(parsed.search_keywords) ? parsed.search_keywords as string[] : [],
    confidence: (parsed.confidence as number) ?? 0,
  }
}

// ─── 와인 라벨 OCR (확장) ───

const WINE_LABEL_PROMPT = `당신은 와인 전문 소믈리에입니다. 사진에서 와인 정보를 추출하고, 라벨에 없는 정보는 와인 지식으로 추론하세요.

■ 반드시 지킬 제약조건 (위반 시 시스템 오류 발생):

[wine_type] 다음 7개만 허용: "red", "white", "rose", "sparkling", "orange", "fortified", "dessert"

[country] 다음 15개국만 허용 (해당 없으면 가장 가까운 것 선택):
France, Germany, Austria, Hungary, Greece, Italy, Spain, Portugal, USA, Canada, Chile, Argentina, South Africa, Australia, New Zealand

[region] country에 따라 아래 값만 허용:
- France: Bordeaux, South West France, Burgundy, Beaujolais, Alsace, Loire Valley, Rhône Valley, Southern France
- Germany: Mosel, Nahe, Rheingau, Rheinhessen, Pfalz, Baden, Franken
- Austria: Niederösterreich, Burgenland
- Hungary: Tokaj
- Greece: Naoussa, Nemea, Santorini
- Italy: Trentino-Alto Adige, Friuli-Venezia Giulia, Veneto, Piedmont, Tuscany, Marche, Umbria, Lazio, Abruzzo, Campania, Puglia, Basilicata, Sicily
- Spain: The Upper Ebro, Catalunya, The Duero Valley, The North West, The Levante, Castilla-La Mancha, Castilla y León
- Portugal: Vinho Verde, Douro, Dão, Bairrada, Alentejo, Lisboa, Alentejano
- USA: California, Oregon, Washington, New York
- Canada: Ontario, British Columbia
- Chile: Coquimbo Region, Aconcagua Region, Central Valley, Southern Region
- Argentina: Salta, San Juan, Mendoza, Patagonia
- South Africa: Coastal Region, Breede River Valley, Cape South Coast
- Australia: South Eastern Australia, South Australia, Victoria, New South Wales, Tasmania, Western Australia
- New Zealand: North Island, South Island

[sub_region] region에 따라 허용되는 값이 다름. 주요 예시:
- Bordeaux → Médoc, Haut-Médoc, Saint-Estèphe, Pauillac, Saint-Julien, Margaux, Graves, Pessac-Léognan, Saint-Émilion, Pomerol, Sauternes, Barsac, Côtes de Bordeaux, Entre-Deux-Mers
- Burgundy → Chablis, Côte de Nuits, Côte de Beaune, Côte Chalonnaise, Mâconnais
- Rhône Valley → Côtes du Rhône, Côte-Rôtie, Condrieu, Hermitage, Crozes-Hermitage, Cornas, Châteauneuf-du-Pape, Gigondas, Vacqueyras, Lirac, Tavel
- California → Napa Valley, Sonoma County, Mendocino County, Paso Robles, Santa Maria Valley, Lodi
- South Australia → Barossa, Clare Valley, Adelaide Hills, McLaren Vale, Coonawarra
- 해당 없으면 null

[appellation] sub_region의 하위 AOC/AVA. 일부만 해당:
- Côte de Nuits → Gevrey-Chambertin, Vougeot, Vosne-Romanée, Nuits-Saint-Georges
- Côte de Beaune → Aloxe-Corton, Beaune, Pommard, Volnay, Meursault, Puligny-Montrachet, Chassagne-Montrachet
- Côte Chalonnaise → Rully, Mercurey, Givry, Montagny
- Mâconnais → Pouilly-Fuissé, Saint-Véran
- Napa Valley → Rutherford, Oakville, Stags Leap District, Howell Mountain, Mt. Veeder, Los Carneros, St. Helena, Calistoga
- Sonoma County → Russian River Valley, Alexander Valley, Dry Creek Valley, Sonoma Coast
- Barossa → Barossa Valley, Eden Valley
- Walker Bay → Hemel-en-Aarde Wards
- 해당 없으면 null

[variety] 대표 품종 1개. 반드시 아래 정확한 이름만 사용 ("Merlot Blend" 같은 조합명 금지):
- Red: Cabernet Sauvignon, Merlot, Pinot Noir, Syrah / Shiraz, Grenache, Malbec, Tempranillo, Cabernet Franc, Zinfandel, Mourvèdre, Carménère, Petit Verdot, Gamay, Pinotage, Sangiovese, Nebbiolo, Barbera, Primitivo, Montepulciano, Nero d'Avola, Aglianico, Dolcetto, Corvina
- White: Chardonnay, Sauvignon Blanc, Riesling, Pinot Grigio, Gewürztraminer, Viognier, Chenin Blanc, Sémillon, Grüner Veltliner, Albariño, Marsanne, Roussanne, Muscadet, Torrontés, Vermentino, Trebbiano, Garganega, Fiano, Arneis
- Rose: Grenache, Syrah / Shiraz, Mourvèdre, Cinsault, Pinot Noir, Sangiovese, Tempranillo
- Sparkling: Chardonnay, Pinot Noir, Pinot Meunier, Glera
[grape_varieties] [{name, pct}] 배열. name은 위 품종명만 사용. pct는 0~100 정수, 합계=100. 단일 품종이면 [{name:"...", pct:100}].
[body_level] 정수만. 1=Light, 2=Medium-, 3=Medium, 4=Medium+, 5=Full. 반드시 1~5 범위.
[acidity_level] 정수만. 1=낮음, 2=보통, 3=높음. 반드시 1~3 범위.
[sweetness_level] 정수만. 1=Dry, 2=Medium, 3=Sweet. 반드시 1~3 범위.
[abv] 소수점 1자리 (예: 13.5). 모르면 null.
[vivino_rating] 소수점 1자리, 1.0~5.0 범위. 모르면 null.
[critic_scores] {RP?: 50~100, WS?: 50~100, JR?: 12.0~20.0, JH?: 50~100}. 모르면 null.
[reference_price_min/max] 한국 와인샵/온라인몰 실거래 기준 적정 구매가 범위(원화 정수). 과도한 마진이 붙은 레스토랑/호텔 가격 제외. 현실적인 좋은 구매가(min)와 일반 소매가(max)로 제시. 모르면 null.
[price_review] 당신은 냉정한 와인 바이어입니다. 국내·해외 시세 기준으로 실제 적정가를 판단하고, 이 가격대에서의 체급과 경쟁 와인 대비 위치, 가격 거품 여부를 분석하세요.
  - verdict: "buy"(구매) / "conditional_buy"(조건부 구매) / "avoid"(비추천) 중 하나.
  - summary: 왜 그런 판단인지 한국어 1~2문장. 예: "이 가격대에서 가장 뛰어난 가성비. 5만원 이하면 즉시 구매 추천"
  - alternatives: 같은 가격대에서 더 나은 대안 와인 2개. [{name, price}]. 대안 불필요 시 빈 배열.
[vintage] 정수 연도. NV이면 null.
[drinking_window_start/end] 정수 연도. 모르면 null.

■ JSON 응답 형식 (이 구조 정확히 따르기):
{
  "wine_name": "string",
  "producer": "string|null",
  "vintage": "number|null",
  "country": "string",
  "region": "string",
  "sub_region": "string|null",
  "appellation": "string|null",
  "wine_type": "string",
  "variety": "string",
  "grape_varieties": [{"name":"string","pct":"number"}],
  "abv": "number|null",
  "classification": "string|null",
  "body_level": "number(1-5)",
  "acidity_level": "number(1-3)",
  "sweetness_level": "number(1-3)",
  "food_pairings": ["string"],
  "serving_temp": "string|null",
  "decanting": "string|null",
  "reference_price_min": "number|null",
  "reference_price_max": "number|null",
  "price_review": {"verdict":"buy|conditional_buy|avoid","summary":"string","alternatives":[{"name":"string","price":"string"}]},
  "drinking_window_start": "number|null",
  "drinking_window_end": "number|null",
  "vivino_rating": "number|null",
  "critic_scores": {"RP":"number","WS":"number"}|null,
  "tasting_notes": "이 와인의 포지셔닝(어떤 상황/가격대에서 빛나는지)과 기대할 수 있는 핵심 향·맛을 한국어 1문장으로. 예: '가성비 칠레 블렌드로 블랙커런트와 삼나무 향이 특징이며 스테이크와 잘 어울림'",
  "confidence": "number(0-1)"
}

와인과 전혀 무관한 사진만 {"error": "not_wine_label"}로 응답.`

export interface WineLabelRecognition {
  wineName: string | null
  producer: string | null
  vintage: number | null
  region: string | null
  subRegion: string | null
  appellation: string | null
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
  referencePriceMin: number | null
  referencePriceMax: number | null
  priceReview: { verdict: string; summary: string; alternatives: Array<{ name: string; price: string }> } | null
  drinkingWindowStart: number | null
  drinkingWindowEnd: number | null
  vivinoRating: number | null
  criticScores: { RP?: number; WS?: number; JR?: number; JH?: number } | null
  tastingNotes: string | null
  confidence: number
}

function parseWineLabelResponse(parsed: Record<string, unknown>): WineLabelRecognition {
  const grapeVarieties = Array.isArray(parsed.grape_varieties)
    ? (parsed.grape_varieties as Array<{ name: string; pct: number }>)
    : null

  return {
    wineName: (parsed.wine_name as string) ?? null,
    producer: (parsed.producer as string) ?? null,
    vintage: parsed.vintage ? Number(parsed.vintage) : null,
    region: (parsed.region as string) ?? null,
    subRegion: (parsed.sub_region as string) ?? null,
    appellation: (parsed.appellation as string) ?? null,
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
    referencePriceMin: parsed.reference_price_min ? Number(parsed.reference_price_min) : null,
    referencePriceMax: parsed.reference_price_max ? Number(parsed.reference_price_max) : null,
    priceReview: parsed.price_review && typeof parsed.price_review === 'object'
      ? parsed.price_review as { verdict: string; summary: string; alternatives: Array<{ name: string; price: string }> }
      : null,
    drinkingWindowStart: parsed.drinking_window_start ? Number(parsed.drinking_window_start) : null,
    drinkingWindowEnd: parsed.drinking_window_end ? Number(parsed.drinking_window_end) : null,
    vivinoRating: parsed.vivino_rating ? Number(parsed.vivino_rating) : null,
    criticScores: parsed.critic_scores && typeof parsed.critic_scores === 'object'
      ? parsed.critic_scores as { RP?: number; WS?: number; JR?: number; JH?: number }
      : null,
    tastingNotes: (parsed.tasting_notes as string) ?? null,
    confidence: (parsed.confidence as number) ?? 0,
  }
}

export async function recognizeWineLabel(imageUrl: string): Promise<WineLabelRecognition> {
  const text = await callVision(imageUrl, WINE_LABEL_PROMPT)
  const parsed = safeJsonParse(text) as Record<string, unknown>

  if (parsed.error === 'not_wine_label') throw new Error('NOT_WINE_LABEL')

  return parseWineLabelResponse(parsed)
}

// ─── 와인 이름 검색 (텍스트만) ───

const WINE_SEARCH_PROMPT = (query: string) => `You are a wine expert sommelier. Given the user's search query, recommend up to 5 most likely wine matches.

Search query: "${query}"

Rules:
- The "name" field MUST be the official English wine name (e.g. "Domaine Faiveley Bourgogne Pinot Noir", NOT "부르고뉴 피노 누아"). Never use Korean for the name field.
- If the query is a producer/winery name, always include their entry-level/basic wine first, then higher-tier wines.
  Example: "Faiveley" → include "Domaine Faiveley Bourgogne Pinot Noir" before "Domaine Faiveley Gevrey-Chambertin".
- Only recommend wines where the query words directly appear in the wine name, producer, or winery.
- Do not recommend wines with merely similar-sounding names.
- Prioritize wines available in Korea.
- Match Korean search terms to English wine names (e.g. "오퍼스" → "Opus One").
- Include the full official name with producer (e.g. "Domaine Faiveley Bourgogne Pinot Noir", not just "Bourgogne Pinot Noir").

Respond with JSON array only:
[
  {
    "name": "Official English wine name including producer",
    "name_ko": "Korean name (null if none)",
    "producer": "Producer/Winery",
    "vintage": null,
    "wine_type": "red/white/rose/sparkling/orange/fortified/dessert",
    "region": "Region",
    "country": "Country",
    "confidence": 0.0~1.0
  }
]

Return empty array [] if query is unrelated to wine.`

export interface WineSearchCandidate {
  name: string
  nameKo: string | null
  producer: string | null
  vintage: number | null
  wineType: string
  region: string | null
  country: string | null
  confidence: number
  labelImageUrl: string | null
}

export async function searchWineByName(query: string): Promise<WineSearchCandidate[]> {
  const text = await callText(WINE_SEARCH_PROMPT(query))
  const parsed = safeJsonParse(text)

  const arr = Array.isArray(parsed) ? parsed : (parsed as Record<string, unknown>)
  if (!Array.isArray(arr)) return []

  return arr.map((item: Record<string, unknown>) => ({
    name: (item.name as string) ?? '',
    nameKo: (item.name_ko as string) ?? null,
    producer: (item.producer as string) ?? null,
    vintage: item.vintage ? Number(item.vintage) : null,
    wineType: (item.wine_type as string) ?? 'red',
    region: (item.region as string) ?? null,
    country: (item.country as string) ?? null,
    confidence: (item.confidence as number) ?? 0,
    labelImageUrl: null,
  }))
}

// ─── 와인 상세 정보 (텍스트만) ───

const WINE_DETAIL_PROMPT = (name: string, producer: string | null, vintage: number | null) => {
  let desc = `"${name}"`
  if (producer) desc += ` by ${producer}`
  if (vintage) desc += ` (${vintage})`
  return `당신은 와인 전문 소믈리에입니다. 다음 와인의 상세 정보를 제공하세요.

와인: ${desc}

■ 반드시 지킬 제약조건 (위반 시 시스템 오류 발생):

[wine_type] "red"|"white"|"rose"|"sparkling"|"orange"|"fortified"|"dessert" 중 하나만.
[country] France|Germany|Austria|Hungary|Greece|Italy|Spain|Portugal|USA|Canada|Chile|Argentina|South Africa|Australia|New Zealand 중 하나.
[region] country별 허용값:
- France: Bordeaux, South West France, Burgundy, Beaujolais, Alsace, Loire Valley, Rhône Valley, Southern France
- Germany: Mosel, Nahe, Rheingau, Rheinhessen, Pfalz, Baden, Franken
- Italy: Trentino-Alto Adige, Friuli-Venezia Giulia, Veneto, Piedmont, Tuscany, Marche, Umbria, Lazio, Abruzzo, Campania, Puglia, Basilicata, Sicily
- Spain: The Upper Ebro, Catalunya, The Duero Valley, The North West, The Levante, Castilla-La Mancha, Castilla y León
- USA: California, Oregon, Washington, New York
- Chile: Coquimbo Region, Aconcagua Region, Central Valley, Southern Region
- Argentina: Salta, San Juan, Mendoza, Patagonia
- Australia: South Eastern Australia, South Australia, Victoria, New South Wales, Tasmania, Western Australia
- New Zealand: North Island, South Island
- 기타 국가도 동일 패턴으로.
[sub_region] 해당 region의 세부산지. 없으면 null.
[appellation] sub_region의 하위 AOC/AVA/Ward. 없으면 null.
[variety] 대표 품종 1개. 정확한 품종명만 (Merlot, Cabernet Sauvignon 등). "Merlot Blend" 같은 조합명 금지.
[grape_varieties] [{name, pct}]. name은 정확한 품종명만. pct 합계=100.
[body_level] 정수 1~5만. 1=Light, 2=Medium-, 3=Medium, 4=Medium+, 5=Full.
[acidity_level] 정수 1~3만. 1=낮음, 2=보통, 3=높음.
[sweetness_level] 정수 1~3만. 1=Dry, 2=Medium, 3=Sweet.
[abv] 소수점 1자리. 모르면 null.
[grape_varieties] [{name, pct}]. pct 합계=100. 단일 품종이면 [{name:"...", pct:100}].
[vivino_rating] 1.0~5.0 소수 1자리. 모르면 null.
[critic_scores] {RP?: 50~100, WS?: 50~100, JR?: 12.0~20.0, JH?: 50~100}. 모르면 null.
[reference_price_min/max] 한국 와인샵/온라인몰 실거래 기준 적정 구매가 범위(원화 정수). 과도한 마진이 붙은 레스토랑/호텔 가격 제외. 현실적인 좋은 구매가(min)와 일반 소매가(max)로 제시. 모르면 null.
[price_review] 당신은 냉정한 와인 바이어입니다. 국내·해외 시세 기준으로 실제 적정가를 판단하고, 이 가격대에서의 체급과 경쟁 와인 대비 위치, 가격 거품 여부를 분석하세요.
  - verdict: "buy"(구매) / "conditional_buy"(조건부 구매) / "avoid"(비추천) 중 하나.
  - summary: 왜 그런 판단인지 한국어 1~2문장.
  - alternatives: 같은 가격대에서 더 나은 대안 와인 2개. [{name, price}]. 대안 불필요 시 빈 배열.

■ JSON 응답:
{
  "wine_name": "${name}",
  "producer": "string|null",
  "vintage": ${vintage ?? 'null'},
  "country": "string",
  "region": "string",
  "sub_region": "string|null",
  "appellation": "string|null",
  "wine_type": "string",
  "variety": "string",
  "grape_varieties": [{"name":"string","pct":"number"}],
  "abv": "number|null",
  "classification": "string|null",
  "body_level": "number(1-5)",
  "acidity_level": "number(1-3)",
  "sweetness_level": "number(1-3)",
  "food_pairings": ["string 3~5개"],
  "serving_temp": "string|null",
  "decanting": "string|null",
  "reference_price_min": "number|null",
  "reference_price_max": "number|null",
  "price_review": {"verdict":"buy|conditional_buy|avoid","summary":"string","alternatives":[{"name":"string","price":"string"}]},
  "drinking_window_start": "number|null",
  "drinking_window_end": "number|null",
  "vivino_rating": "number|null",
  "critic_scores": {"RP":"number","WS":"number"}|null,
  "tasting_notes": "이 와인의 포지셔닝(어떤 상황/가격대에서 빛나는지)과 기대할 수 있는 핵심 향·맛을 한국어 1문장으로. 예: '가성비 칠레 블렌드로 블랙커런트와 삼나무 향이 특징이며 스테이크와 잘 어울림'",
  "confidence": "number(0-1)"
}`
}

export async function getWineDetailByName(
  name: string,
  producer: string | null,
  vintage: number | null,
): Promise<WineLabelRecognition> {
  const text = await callText(WINE_DETAIL_PROMPT(name, producer, vintage))
  const parsed = safeJsonParse(text) as Record<string, unknown>

  const result = parseWineLabelResponse(parsed)
  return {
    ...result,
    wineName: result.wineName ?? name,
    producer: result.producer ?? producer,
    vintage: result.vintage ?? vintage,
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

export async function recognizeWineShelf(imageUrl: string): Promise<ShelfRecognition> {
  const text = await callVision(imageUrl, WINE_SHELF_PROMPT)
  const parsed = safeJsonParse(text) as Record<string, unknown>
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

export async function recognizeWineReceipt(imageUrl: string): Promise<ReceiptRecognition> {
  const text = await callVision(imageUrl, WINE_RECEIPT_PROMPT)
  const parsed = safeJsonParse(text) as Record<string, unknown>
  return {
    items: (parsed.items as ReceiptRecognition['items']) ?? [],
    total: (parsed.total as number) ?? null,
  }
}
