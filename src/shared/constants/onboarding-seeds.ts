// src/shared/constants/onboarding-seeds.ts
// 온보딩 시드 데이터 (정적 상수)

import type { OnboardingBubbleTemplate, OnboardingSeedBubble } from '@/domain/entities/onboarding'

export const BUBBLE_TEMPLATES: OnboardingBubbleTemplate[] = [
  {
    id: 'template-family',
    name: '우리 가족 맛집',
    description: '가족끼리 공유하는 맛집 리스트',
    icon: '👨‍👩‍👧‍👦',
    iconBgColor: '#FF6038',
    joinPolicy: 'invite_only',
    focusType: 'all',
  },
  {
    id: 'template-friends',
    name: '친구들 맛집',
    description: '친구들과 발견한 맛집 모음',
    icon: '🍻',
    iconBgColor: '#7A9BAE',
    joinPolicy: 'invite_only',
    focusType: 'all',
  },
  {
    id: 'template-coworkers',
    name: '직장 동료 맛집',
    description: '회사 근처 점심 맛집 공유',
    icon: '💼',
    iconBgColor: '#8B7396',
    joinPolicy: 'invite_only',
    focusType: 'all',
  },
]

export const SEED_BUBBLES: OnboardingSeedBubble[] = [
  {
    id: 'seed-seoul-foodies',
    name: '서울 맛집 탐험대',
    description: '서울 전역의 숨은 맛집을 발굴하는 모임',
    icon: '🗺️',
    iconBgColor: '#FF6038',
    memberCount: 128,
    minLevel: 0,
    joinPolicy: 'open',
  },
  {
    id: 'seed-wine-beginners',
    name: '와인 입문자 모임',
    description: '와인을 처음 시작하는 사람들의 정보 공유',
    icon: '🍷',
    iconBgColor: '#8B7396',
    memberCount: 85,
    minLevel: 0,
    joinPolicy: 'open',
  },
  {
    id: 'seed-fine-dining',
    name: '파인다이닝 클럽',
    description: '특별한 날을 위한 파인다이닝 리뷰',
    icon: '✨',
    iconBgColor: '#C9A96E',
    memberCount: 42,
    minLevel: 3,
    joinPolicy: 'auto_approve',
  },
  {
    id: 'seed-local-gems',
    name: '동네 보석 찾기',
    description: '내 동네 숨은 맛집을 공유해요',
    icon: '💎',
    iconBgColor: '#7EAE8B',
    memberCount: 67,
    minLevel: 1,
    joinPolicy: 'open',
  },
]

export const SEED_RESTAURANTS = {
  을지로: [
    { id: 'seed-r-001', name: '을지로골뱅이', genre: '한식', address: '을지로 3가' },
    { id: 'seed-r-002', name: '을지다락', genre: '카페', address: '을지로 4가' },
    { id: 'seed-r-003', name: '양미옥', genre: '한식', address: '을지로 2가' },
  ],
  광화문: [
    { id: 'seed-r-010', name: '토속촌', genre: '한식', address: '광화문' },
    { id: 'seed-r-011', name: '광화문미진', genre: '한식', address: '광화문' },
    { id: 'seed-r-012', name: '정식당', genre: '파인다이닝', address: '광화문' },
  ],
  성수: [
    { id: 'seed-r-020', name: '도토리', genre: '일식', address: '성수동' },
    { id: 'seed-r-021', name: '센터커피', genre: '카페', address: '성수동' },
    { id: 'seed-r-022', name: '떡볶이공장', genre: '한식', address: '성수동' },
  ],
  강남: [
    { id: 'seed-r-030', name: '본초밥', genre: '일식', address: '강남역' },
    { id: 'seed-r-031', name: '봉피양', genre: '한식', address: '강남역' },
    { id: 'seed-r-032', name: '리베', genre: '이탈리안', address: '신사동' },
  ],
  홍대: [
    { id: 'seed-r-040', name: '키친크래프트', genre: '양식', address: '홍대입구' },
    { id: 'seed-r-041', name: '제순식당', genre: '한식', address: '연남동' },
    { id: 'seed-r-042', name: '메이사스', genre: '멕시칸', address: '상수동' },
  ],
  이태원: [
    { id: 'seed-r-050', name: '라일락', genre: '프렌치', address: '이태원' },
    { id: 'seed-r-051', name: '한남동 도피오', genre: '카페', address: '한남동' },
    { id: 'seed-r-052', name: '플랜트', genre: '이탈리안', address: '이태원' },
  ],
} as const
