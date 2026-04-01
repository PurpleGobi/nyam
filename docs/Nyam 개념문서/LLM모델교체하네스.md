# LLM 모델 교체 하네스

## 개요

LLM provider(Gemini, OpenAI, Anthropic, Grok 등)와 모델을 **한 곳에서** 관리한다.
사용처별로 다른 provider/model 조합을 쓸 수 있고, 교체 시 config 파일 한 줄만 수정하면 된다.

---

## 파일 구조

```
src/
├── shared/constants/
│   └── llm-config.ts              ← 모델 교체는 이 파일만 수정
│
├── infrastructure/api/
│   ├── llm.ts                     ← 통합 호출 (config → provider 라우팅)
│   ├── ai-recognition.ts          ← 프롬프트 + 응답 파싱 (provider 무관)
│   └── providers/
│       └── gemini.ts              ← Gemini API 전용 호출
│       └── (openai.ts)            ← 추가 시
│       └── (anthropic.ts)         ← 추가 시
│
└── app/api/                       ← API Routes (호출부)
    ├── records/identify/route.ts  ← 이미지 인식 (vision)
    ├── wines/search-ai/route.ts   ← 와인 검색 (text)
    └── wines/detail-ai/route.ts   ← 와인 상세 (text)
```

---

## 호출 흐름

```
API Route
  → ai-recognition.ts (프롬프트 조립 + 응답 파싱)
    → llm.ts (callVision / callText)
      → llm-config.ts 읽어서 provider 결정
        → providers/gemini.ts (실제 API 호출)
```

---

## 모델 교체 방법

### 같은 provider 내 모델 변경

`src/shared/constants/llm-config.ts`에서 model만 변경:

```typescript
export const LLM_CONFIG = {
  vision: { provider: 'gemini', model: 'gemini-2.5-flash' },   // ← 여기
  text:   { provider: 'gemini', model: 'gemini-2.5-flash' },   // ← 여기
}
```

예시: vision을 gemini-2.5-pro로 바꾸고 싶으면:
```typescript
  vision: { provider: 'gemini', model: 'gemini-2.5-pro' },
```

### 다른 provider로 교체

1. `src/infrastructure/api/providers/`에 provider 파일 추가
2. `src/infrastructure/api/llm.ts`의 switch에 case 추가
3. `src/shared/constants/llm-config.ts`에서 provider + model 변경
4. `.env.local`에 API 키 추가

---

## 새 provider 추가 가이드

### 1단계: provider 파일 작성

`src/infrastructure/api/providers/openai.ts` 예시:

```typescript
function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY is not configured')
  return key
}

export async function openaiVision(model: string, imageUrl: string, prompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      }],
      temperature: 0,
      max_tokens: 2048,
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`OpenAI API error: ${response.status} — ${body}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? ''
}

export async function openaiText(model: string, prompt: string): Promise<string> {
  // vision과 동일 구조, image 파트만 제거
}
```

### 2단계: llm.ts에 라우팅 추가

```typescript
import { openaiVision, openaiText } from '@/infrastructure/api/providers/openai'

export async function callVision(imageUrl: string, prompt: string): Promise<string> {
  const { provider, model } = LLM_CONFIG.vision
  switch (provider) {
    case 'gemini':
      return geminiVision(model, imageUrl, prompt)
    case 'openai':                                    // ← 추가
      return openaiVision(model, imageUrl, prompt)
    default:
      throw new Error(`Unsupported vision provider: ${provider}`)
  }
}
```

### 3단계: config 변경

```typescript
export const LLM_CONFIG = {
  vision: { provider: 'openai', model: 'gpt-4o' },       // ← 변경
  text:   { provider: 'gemini', model: 'gemini-2.5-flash' },  // vision과 text를 다른 provider로 가능
}
```

### 4단계: 환경변수 추가

`.env.local`:
```
OPENAI_API_KEY=sk-...
```

---

## 각 파일의 역할

| 파일 | 역할 | 수정 시점 |
|------|------|-----------|
| `shared/constants/llm-config.ts` | 사용처별 provider + model 설정 | 모델 교체 시 |
| `infrastructure/api/llm.ts` | config → provider 라우팅 | 새 provider 추가 시 |
| `infrastructure/api/providers/gemini.ts` | Gemini REST API 호출 | Gemini API 스펙 변경 시 |
| `infrastructure/api/ai-recognition.ts` | 프롬프트 정의 + JSON 응답 파싱 | 프롬프트 수정 시 |

---

## 사용처 정리

| 용도 | config key | 호출 함수 | 사용 위치 |
|------|------------|-----------|-----------|
| 음식 사진 인식 | `vision` | `recognizeRestaurant` | `/api/records/identify` |
| 와인 라벨 인식 | `vision` | `recognizeWineLabel` | `/api/records/identify` |
| 와인 진열장 인식 | `vision` | `recognizeWineShelf` | `/api/records/identify` |
| 와인 영수증 인식 | `vision` | `recognizeWineReceipt` | `/api/records/identify` |
| 와인 이름 검색 | `text` | `searchWineByName` | `/api/wines/search-ai` |
| 와인 상세 조회 | `text` | `getWineDetailByName` | `/api/wines/detail-ai` |

---

## 제약사항

- **vision provider**: 이미지 URL을 직접 받을 수 있어야 함 (Supabase Storage public URL)
- **응답 형식**: 모든 provider가 JSON 텍스트를 반환해야 함 (프롬프트로 강제)
- **API 키**: `.env.local`에 서버 전용으로 관리, 클라이언트 노출 금지
- **이미지 포맷**: 현재 WebP (`image/webp`)로 통일. provider별 지원 형식 확인 필요
