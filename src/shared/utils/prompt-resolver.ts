/**
 * Enhanced prompt engine: builds rich context from restaurant data,
 * user profile, and taste history, then generates expert-level prompts.
 */

import type { RestaurantWithSummary } from '@/domain/entities/restaurant'
import type { UserProfile } from '@/domain/entities/user'
import type { UserTasteProfile, DiningExperience } from '@/domain/entities/user-taste'
import type { PromptTemplate, PromptVariable } from '@/domain/entities/prompt'

// ── Context types ───────────────────────────────────────────────

/** All context needed for prompt generation */
export interface PromptContext {
  readonly restaurant?: RestaurantContextData
  readonly user?: UserContextData
  readonly situation?: SituationContextData

  // Legacy fields for backward compatibility with resolveVariables
  readonly restaurantName?: string
  readonly region?: string
  readonly cuisine?: string
}

export interface RestaurantContextData {
  readonly name: string
  readonly address: string
  readonly cuisine: string
  readonly cuisineCategory: string
  readonly priceRange: string | null
  readonly region: string | null
  readonly externalRatings: readonly {
    readonly source: string
    readonly rating: number | null
    readonly reviewCount: number
  }[]
  readonly verificationCount: number
  readonly avgScores: {
    readonly taste: number | null
    readonly value: number | null
    readonly service: number | null
    readonly ambiance: number | null
  }
}

export interface UserContextData {
  readonly allergies: readonly string[]
  readonly foodPreferences: readonly string[]
  readonly preferredAi: string
  readonly priorities: readonly string[]
  readonly spiceTolerance: string
  readonly portionPreference: string
  readonly diningNotes: readonly string[]
  readonly recentExperiences: readonly {
    readonly restaurantName: string
    readonly liked: readonly string[]
    readonly disliked: readonly string[]
    readonly feeling: string
  }[]
}

export interface SituationContextData {
  readonly occasion?: string
  readonly partySize?: number
  readonly budget?: string
  readonly mood?: string
}

// ── Legacy variable-to-context mapping (backward compat) ────────

const VAR_TO_CONTEXT: Record<string, keyof PromptContext> = {
  restaurant_name: 'restaurantName',
  region: 'region',
  cuisine: 'cuisine',
  restaurant_a: 'restaurantName',
}

/**
 * Resolve template variables using context (legacy API).
 */
export function resolveVariables(
  template: PromptTemplate,
  context: PromptContext,
): Record<string, string> {
  const resolved: Record<string, string> = {}

  for (const v of template.variables) {
    const contextKey = VAR_TO_CONTEXT[v.key]
    if (contextKey) {
      const value = context[contextKey]
      if (typeof value === 'string') {
        resolved[v.key] = value
      }
    }

    // Also try from restaurant context data
    if (!resolved[v.key] && context.restaurant) {
      const r = context.restaurant
      if (v.key === 'restaurant_name') resolved[v.key] = r.name
      else if (v.key === 'region') resolved[v.key] = r.region ?? r.address
      else if (v.key === 'cuisine') resolved[v.key] = r.cuisineCategory
    }
  }

  return resolved
}

/**
 * Get variables that still need user input.
 */
export function getUnfilledVariables(
  template: PromptTemplate,
  resolved: Record<string, string>,
): PromptVariable[] {
  return template.variables.filter(v => !resolved[v.key])
}

// ── Context builders ────────────────────────────────────────────

/**
 * Build a PromptContext from a RestaurantWithSummary entity.
 */
export function buildContextFromRestaurant(
  restaurant: RestaurantWithSummary,
): PromptContext {
  return {
    restaurant: {
      name: restaurant.name,
      address: restaurant.shortAddress ?? restaurant.address,
      cuisine: restaurant.cuisine,
      cuisineCategory: restaurant.cuisineCategory,
      priceRange: restaurant.priceRange,
      region: restaurant.region,
      externalRatings: restaurant.ratings.map(r => ({
        source: r.source,
        rating: r.rating,
        reviewCount: r.reviewCount,
      })),
      verificationCount: restaurant.verificationCount,
      avgScores: {
        taste: restaurant.avgTaste,
        value: restaurant.avgValue,
        service: restaurant.avgService,
        ambiance: restaurant.avgAmbiance,
      },
    },
    // Legacy compat
    restaurantName: restaurant.name,
    region: restaurant.shortAddress ?? restaurant.region ?? undefined,
    cuisine: restaurant.cuisineCategory,
  }
}

/**
 * Build user context from profile + taste data.
 */
export function buildUserContext(
  profile: UserProfile,
  tasteProfile: UserTasteProfile | null,
  recentExperiences: readonly DiningExperience[],
): UserContextData {
  return {
    allergies: profile.allergies,
    foodPreferences: profile.foodPreferences,
    preferredAi: profile.preferredAi,
    priorities: tasteProfile?.priorities ?? ['맛', '가성비', '서비스', '분위기'],
    spiceTolerance: tasteProfile?.spiceTolerance ?? 'medium',
    portionPreference: tasteProfile?.portionPreference ?? 'medium',
    diningNotes: tasteProfile?.diningNotes ?? [],
    recentExperiences: recentExperiences.slice(0, 5).map(exp => ({
      restaurantName: exp.restaurantName,
      liked: exp.liked,
      disliked: exp.disliked,
      feeling: exp.overallFeeling,
    })),
  }
}

// ── Enhanced prompt builder ─────────────────────────────────────

/**
 * Generate an expert-level, personalized prompt by combining template + full context.
 * Replaces simple bracket substitution with rich context injection.
 */
export function buildEnhancedPrompt(
  template: PromptTemplate,
  context: PromptContext,
  customVariables?: Record<string, string>,
): string {
  let basePrompt = template.template

  // Step 1: Replace template variables with custom values
  if (customVariables) {
    for (const [key, value] of Object.entries(customVariables)) {
      const label = template.variables.find(v => v.key === key)?.label ?? key
      basePrompt = basePrompt.replaceAll(`[${label}]`, value)
    }
  }

  // Step 2: Auto-fill restaurant variables
  if (context.restaurant) {
    const r = context.restaurant
    basePrompt = basePrompt.replaceAll('[식당명]', r.name)
    basePrompt = basePrompt.replaceAll('[지역]', r.region ?? r.address)
    basePrompt = basePrompt.replaceAll('[음식종류]', r.cuisine)
    basePrompt = basePrompt.replaceAll('[음식 종류]', r.cuisine)
  }

  // Step 3: Auto-fill situation variables
  if (context.situation) {
    if (context.situation.occasion) {
      basePrompt = basePrompt.replaceAll('[상황]', context.situation.occasion)
    }
    if (context.situation.partySize) {
      basePrompt = basePrompt.replaceAll('[인원]', String(context.situation.partySize))
      basePrompt = basePrompt.replaceAll('[N]', String(context.situation.partySize))
    }
    if (context.situation.budget) {
      basePrompt = basePrompt.replaceAll('[예산]', context.situation.budget)
      basePrompt = basePrompt.replaceAll('[금액]', context.situation.budget)
    }
    if (context.situation.mood) {
      basePrompt = basePrompt.replaceAll('[분위기]', context.situation.mood)
      basePrompt = basePrompt.replaceAll('[키워드]', context.situation.mood)
    }
  }

  // Step 4: Auto-fill user allergy/exclude variables
  if (context.user && context.user.allergies.length > 0) {
    basePrompt = basePrompt.replaceAll('[알러지/비선호]', context.user.allergies.join(', '))
    basePrompt = basePrompt.replaceAll('[제외]', context.user.allergies.join(', '))
  }

  // Step 5: Replace remaining unfilled brackets with placeholders
  basePrompt = basePrompt.replace(/\[[^\]]+\]/g, '___')

  // Step 6: Build final prompt with context blocks
  const sections: string[] = [basePrompt]

  if (context.restaurant) {
    sections.push(buildRestaurantContextBlock(context.restaurant))
  }

  if (context.user) {
    sections.push(buildUserContextBlock(context.user))
  }

  sections.push(buildVerificationInstructions())

  return sections.join('\n\n')
}

// ── Private helpers ─────────────────────────────────────────────

function buildRestaurantContextBlock(r: RestaurantContextData): string {
  const lines: string[] = ['---', '참고 정보 (이 식당의 현재 데이터):']

  lines.push(`- 식당명: ${r.name}`)
  lines.push(`- 주소: ${r.address}`)
  lines.push(`- 음식 종류: ${r.cuisineCategory} (${r.cuisine})`)
  if (r.priceRange) lines.push(`- 가격대: ${r.priceRange}`)

  if (r.externalRatings.length > 0) {
    lines.push('- 외부 평점:')
    for (const rating of r.externalRatings) {
      const ratingStr = rating.rating !== null ? `${rating.rating}점` : '평점 없음'
      lines.push(`  - ${rating.source}: ${ratingStr} (리뷰 ${rating.reviewCount}개)`)
    }
  }

  if (r.verificationCount > 0) {
    lines.push(`- Nyam 커뮤니티 검증: ${r.verificationCount}회`)
    const scores = r.avgScores
    if (scores.taste !== null) {
      lines.push(
        `  - 맛: ${(scores.taste / 10).toFixed(1)}, ` +
        `가성비: ${((scores.value ?? 0) / 10).toFixed(1)}, ` +
        `서비스: ${((scores.service ?? 0) / 10).toFixed(1)}, ` +
        `분위기: ${((scores.ambiance ?? 0) / 10).toFixed(1)}`,
      )
    }
  }

  return lines.join('\n')
}

function buildUserContextBlock(u: UserContextData): string {
  const lines: string[] = ['---', '내 취향 정보 (이 정보를 반영해서 답변해줘):']

  if (u.allergies.length > 0) {
    lines.push(`- 알러지/비선호: ${u.allergies.join(', ')}`)
  }
  if (u.foodPreferences.length > 0) {
    lines.push(`- 선호 음식: ${u.foodPreferences.join(', ')}`)
  }

  lines.push(`- 중요시하는 순서: ${u.priorities.join(' > ')}`)

  const spiceMap: Record<string, string> = {
    none: '못 먹음',
    mild: '약간',
    medium: '보통',
    hot: '매운 거 좋아함',
    very_hot: '아주 매운 거 좋아함',
  }
  lines.push(`- 매운맛: ${spiceMap[u.spiceTolerance] ?? '보통'}`)

  if (u.diningNotes.length > 0) {
    lines.push(`- 참고사항: ${u.diningNotes.join(', ')}`)
  }

  // Include recent experiences for context
  if (u.recentExperiences.length > 0) {
    lines.push('')
    lines.push('최근 경험 (내 취향 파악 참고):')
    for (const exp of u.recentExperiences.slice(0, 3)) {
      const liked = exp.liked.length > 0 ? `좋았던 점: ${exp.liked.join(', ')}` : ''
      const disliked = exp.disliked.length > 0 ? `아쉬웠던 점: ${exp.disliked.join(', ')}` : ''
      const parts = [liked, disliked].filter(Boolean).join(' / ')
      if (parts) {
        lines.push(`- ${exp.restaurantName}: ${parts}`)
      }
    }
  }

  return lines.join('\n')
}

function buildVerificationInstructions(): string {
  return [
    '---',
    '검증 지침:',
    '1. 반드시 네이버, 구글맵, 인스타그램 등 여러 소스의 정보를 교차 확인해줘.',
    '2. 체험단/협찬 리뷰는 구분해서 알려줘.',
    '3. 최근 6개월 이내의 최신 정보를 우선해줘.',
    '4. 폐업, 휴업, 메뉴 변경 등 영업 상태도 확인해줘.',
    '5. 확실하지 않은 정보는 "확인 필요"라고 표시해줘.',
    '6. 실제 방문 가치를 10점 만점으로 솔직하게 평가해줘.',
  ].join('\n')
}
