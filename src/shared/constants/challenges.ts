import type { Challenge } from '@/domain/entities/challenge'

export const CHALLENGE_TEMPLATES: readonly Challenge[] = [
  {
    id: 'new-category',
    title: '새로운 카테고리 도전',
    description: '이번 주에 평소 안 먹던 카테고리 기록하기',
    type: 'category',
    target: 1,
    icon: 'Grid3x3',
  },
  {
    id: 'three-records',
    title: '기록 3개 달성',
    description: '이번 주에 기록 3개 남기기',
    type: 'frequency',
    target: 3,
    icon: 'Zap',
  },
  {
    id: 'five-records',
    title: '기록 5개 달성',
    description: '이번 주에 기록 5개 남기기',
    type: 'frequency',
    target: 5,
    icon: 'Zap',
  },
  {
    id: 'new-region',
    title: '새로운 동네 탐험',
    description: '이번 주에 새로운 지역 식당 방문하기',
    type: 'region',
    target: 1,
    icon: 'MapPin',
  },
  {
    id: 'variety-3',
    title: '다양한 카테고리',
    description: '이번 주에 3가지 이상 다른 카테고리 기록하기',
    type: 'variety',
    target: 3,
    icon: 'Grid3x3',
  },
  {
    id: 'photo-record',
    title: '사진과 함께',
    description: '이번 주에 사진 포함 기록 2개 남기기',
    type: 'frequency',
    target: 2,
    icon: 'Zap',
  },
] as const
