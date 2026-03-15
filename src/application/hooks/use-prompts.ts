'use client'

import useSWR from 'swr'
import type { PromptTemplate, PromptCategory } from '@/domain/entities/prompt'
import { supabasePromptRepository } from '@/infrastructure/repositories/supabase-prompt-repository'

const mockPrompts: PromptTemplate[] = [
  {
    id: '1', authorId: null, title: '이 식당 리뷰 검증해줘',
    description: '네이버/카카오 리뷰가 진짜인지 AI로 분석합니다',
    category: 'review_verify', template: '{restaurant_name}의 최근 리뷰를 분석해서 광고 리뷰와 진짜 리뷰를 구분해줘.',
    variables: [{ key: 'restaurant_name', label: '식당 이름', type: 'input' }],
    isOfficial: true, isPublic: true, usageCount: 342, likeCount: 89, dislikeCount: 3,
    createdAt: '2026-01-01', updatedAt: '2026-03-01',
  },
  {
    id: '2', authorId: null, title: '데이트 맛집 추천',
    description: '분위기 좋은 데이트 코스 맛집을 찾아드립니다',
    category: 'situation_recommend', template: '{area} 근처에서 데이트하기 좋은 {cuisine} 맛집 추천해줘. 예산은 {budget}.',
    variables: [
      { key: 'area', label: '지역', type: 'input' },
      { key: 'cuisine', label: '음식 종류', type: 'preset' },
      { key: 'budget', label: '예산', type: 'input' },
    ],
    isOfficial: true, isPublic: true, usageCount: 521, likeCount: 156, dislikeCount: 7,
    createdAt: '2026-01-01', updatedAt: '2026-03-01',
  },
  {
    id: '3', authorId: null, title: '두 맛집 비교 분석',
    description: '두 식당을 맛/가격/서비스/분위기로 비교합니다',
    category: 'compare', template: '{restaurant_a}와 {restaurant_b}를 맛, 가격, 서비스, 분위기 기준으로 비교 분석해줘.',
    variables: [
      { key: 'restaurant_a', label: '식당 A', type: 'input' },
      { key: 'restaurant_b', label: '식당 B', type: 'input' },
    ],
    isOfficial: true, isPublic: true, usageCount: 198, likeCount: 67, dislikeCount: 2,
    createdAt: '2026-01-01', updatedAt: '2026-03-01',
  },
  {
    id: '4', authorId: null, title: '영업 정보 확인',
    description: '식당이 현재 영업 중인지, 가격 변동은 없는지 확인합니다',
    category: 'info_check', template: '{restaurant_name}이 현재 영업 중인지, 최근 가격이나 메뉴 변경사항이 있는지 확인해줘.',
    variables: [{ key: 'restaurant_name', label: '식당 이름', type: 'input' }],
    isOfficial: true, isPublic: true, usageCount: 276, likeCount: 82, dislikeCount: 5,
    createdAt: '2026-01-01', updatedAt: '2026-03-01',
  },
  {
    id: '5', authorId: null, title: '숨은 맛집 발굴',
    description: '관광객 모르는 현지인 맛집을 찾아드립니다',
    category: 'hidden_gem', template: '{area}에서 현지인만 아는 숨은 맛집 추천해줘. {cuisine} 종류로.',
    variables: [
      { key: 'area', label: '지역', type: 'input' },
      { key: 'cuisine', label: '음식 종류', type: 'preset' },
    ],
    isOfficial: true, isPublic: true, usageCount: 410, likeCount: 134, dislikeCount: 4,
    createdAt: '2026-01-01', updatedAt: '2026-03-01',
  },
  {
    id: '6', authorId: null, title: '회식 장소 추천',
    description: '인원수와 예산에 맞는 회식 장소를 찾아드립니다',
    category: 'situation_recommend', template: '{area}에서 {people}명이 회식할 만한 곳 추천해줘. 예산 1인당 {budget}.',
    variables: [
      { key: 'area', label: '지역', type: 'input' },
      { key: 'people', label: '인원수', type: 'input' },
      { key: 'budget', label: '1인 예산', type: 'input' },
    ],
    isOfficial: true, isPublic: true, usageCount: 389, likeCount: 112, dislikeCount: 6,
    createdAt: '2026-01-01', updatedAt: '2026-03-01',
  },
]

interface UsePromptsParams {
  readonly category?: PromptCategory
}

interface UsePromptsReturn {
  readonly prompts: readonly PromptTemplate[]
  readonly isLoading: boolean
  readonly error: Error | undefined
}

async function fetchPrompts(category?: PromptCategory): Promise<readonly PromptTemplate[]> {
  try {
    return category
      ? await supabasePromptRepository.findByCategory(category)
      : await supabasePromptRepository.findAll()
  } catch {
    // Supabase unavailable — use mock data
    return category
      ? mockPrompts.filter((p) => p.category === category)
      : mockPrompts
  }
}

export function usePrompts(params?: UsePromptsParams): UsePromptsReturn {
  const { category } = params ?? {}

  const { data, error, isLoading } = useSWR<readonly PromptTemplate[]>(
    ['prompts', category ?? null],
    () => fetchPrompts(category),
  )

  return {
    prompts: data ?? [],
    isLoading,
    error,
  }
}
