/**
 * Mock implementation of RestaurantRepository
 * Falls back to this when Supabase is unavailable
 */

import type { Restaurant, RestaurantWithSummary } from '@/domain/entities/restaurant'
import type { VerificationLevel } from '@/domain/entities/verification'
import type {
  RestaurantRepository,
  RestaurantFilter,
  PaginationOptions,
  PaginatedResult,
} from '@/domain/repositories/restaurant-repository'

const mockData: RestaurantWithSummary[] = [
  {
    id: '1', name: '을지로 골뱅이', address: '서울특별시 중구 을지로3가 을지로 119', shortAddress: '중구 을지로',
    phone: '02-2266-0527', cuisine: '골뱅이무침', cuisineCategory: '한식', priceRange: '$$', hours: null,
    mood: ['회식', '친구모임'], region: '을지로', imageUrl: null, naverMapUrl: null, kakaoMapUrl: null, googleMapUrl: null,
    latitude: null, longitude: null, isActive: true, createdAt: '2026-01-01', updatedAt: '2026-03-01',
    verificationCount: 12, avgTaste: 4.5, avgValue: 4.3, avgService: 4.0, avgAmbiance: 3.8,
    verificationLevel: 'verified' as VerificationLevel, ratings: [
      { id: 'r1', restaurantId: '1', source: 'naver', rating: 4.5, reviewCount: 320, fetchedAt: '2026-03-01' },
      { id: 'r2', restaurantId: '1', source: 'kakao', rating: 4.3, reviewCount: 180, fetchedAt: '2026-03-01' },
    ],
  },
  {
    id: '2', name: '스시 오마카세 준', address: '서울특별시 강남구 압구정로 234', shortAddress: '강남 압구정',
    phone: '02-541-1234', cuisine: '오마카세', cuisineCategory: '일식', priceRange: '$$$$', hours: null,
    mood: ['데이트', '기념일'], region: '강남', imageUrl: null, naverMapUrl: null, kakaoMapUrl: null, googleMapUrl: null,
    latitude: null, longitude: null, isActive: true, createdAt: '2026-01-01', updatedAt: '2026-03-01',
    verificationCount: 8, avgTaste: 4.8, avgValue: 3.5, avgService: 4.7, avgAmbiance: 4.6,
    verificationLevel: 'verified' as VerificationLevel, ratings: [
      { id: 'r3', restaurantId: '2', source: 'naver', rating: 4.7, reviewCount: 250, fetchedAt: '2026-03-01' },
      { id: 'r4', restaurantId: '2', source: 'google', rating: 4.6, reviewCount: 120, fetchedAt: '2026-03-01' },
    ],
  },
  {
    id: '3', name: '홍대 돈카츠 명가', address: '서울특별시 마포구 와우산로 112', shortAddress: '마포 홍대',
    phone: '02-332-5678', cuisine: '돈카츠', cuisineCategory: '일식', priceRange: '$$', hours: null,
    mood: ['혼밥', '친구모임'], region: '홍대', imageUrl: null, naverMapUrl: null, kakaoMapUrl: null, googleMapUrl: null,
    latitude: null, longitude: null, isActive: true, createdAt: '2026-01-01', updatedAt: '2026-03-01',
    verificationCount: 15, avgTaste: 4.4, avgValue: 4.6, avgService: 4.2, avgAmbiance: 3.9,
    verificationLevel: 'partial' as VerificationLevel, ratings: [
      { id: 'r5', restaurantId: '3', source: 'naver', rating: 4.3, reviewCount: 450, fetchedAt: '2026-03-01' },
      { id: 'r6', restaurantId: '3', source: 'kakao', rating: 4.5, reviewCount: 280, fetchedAt: '2026-03-01' },
    ],
  },
  {
    id: '4', name: '진진 짜장면', address: '서울특별시 종로구 인사동길 45', shortAddress: '종로 인사동',
    phone: '02-722-3456', cuisine: '짜장면', cuisineCategory: '중식', priceRange: '$', hours: null,
    mood: ['혼밥', '가족모임'], region: '종로', imageUrl: null, naverMapUrl: null, kakaoMapUrl: null, googleMapUrl: null,
    latitude: null, longitude: null, isActive: true, createdAt: '2026-01-01', updatedAt: '2026-03-01',
    verificationCount: 20, avgTaste: 4.2, avgValue: 4.8, avgService: 3.8, avgAmbiance: 3.5,
    verificationLevel: 'verified' as VerificationLevel, ratings: [
      { id: 'r7', restaurantId: '4', source: 'naver', rating: 4.1, reviewCount: 620, fetchedAt: '2026-03-01' },
    ],
  },
  {
    id: '5', name: '이태원 파스타 바', address: '서울특별시 용산구 이태원로 178', shortAddress: '용산 이태원',
    phone: '02-797-8901', cuisine: '파스타', cuisineCategory: '양식', priceRange: '$$$', hours: null,
    mood: ['데이트', '비즈니스'], region: '이태원', imageUrl: null, naverMapUrl: null, kakaoMapUrl: null, googleMapUrl: null,
    latitude: null, longitude: null, isActive: true, createdAt: '2026-01-01', updatedAt: '2026-03-01',
    verificationCount: 6, avgTaste: 4.6, avgValue: 3.8, avgService: 4.5, avgAmbiance: 4.7,
    verificationLevel: 'partial' as VerificationLevel, ratings: [
      { id: 'r8', restaurantId: '5', source: 'google', rating: 4.5, reviewCount: 190, fetchedAt: '2026-03-01' },
    ],
  },
  {
    id: '6', name: '성수 카페 로우', address: '서울특별시 성동구 성수이로 88', shortAddress: '성동 성수',
    phone: '02-462-1234', cuisine: '커피/디저트', cuisineCategory: '카페', priceRange: '$$', hours: null,
    mood: ['데이트', '혼밥'], region: '성수', imageUrl: null, naverMapUrl: null, kakaoMapUrl: null, googleMapUrl: null,
    latitude: null, longitude: null, isActive: true, createdAt: '2026-01-01', updatedAt: '2026-03-01',
    verificationCount: 10, avgTaste: 4.3, avgValue: 3.9, avgService: 4.4, avgAmbiance: 4.8,
    verificationLevel: 'partial' as VerificationLevel, ratings: [
      { id: 'r9', restaurantId: '6', source: 'naver', rating: 4.4, reviewCount: 380, fetchedAt: '2026-03-01' },
    ],
  },
  {
    id: '7', name: '여의도 쌀국수', address: '서울특별시 영등포구 여의대로 108', shortAddress: '영등포 여의도',
    phone: '02-780-5678', cuisine: '쌀국수', cuisineCategory: '아시안', priceRange: '$', hours: null,
    mood: ['혼밥', '비즈니스'], region: '여의도', imageUrl: null, naverMapUrl: null, kakaoMapUrl: null, googleMapUrl: null,
    latitude: null, longitude: null, isActive: true, createdAt: '2026-01-01', updatedAt: '2026-03-01',
    verificationCount: 18, avgTaste: 4.1, avgValue: 4.7, avgService: 4.0, avgAmbiance: 3.6,
    verificationLevel: 'verified' as VerificationLevel, ratings: [
      { id: 'r10', restaurantId: '7', source: 'kakao', rating: 4.2, reviewCount: 410, fetchedAt: '2026-03-01' },
    ],
  },
  {
    id: '8', name: '잠실 떡볶이 천국', address: '서울특별시 송파구 올림픽로 300', shortAddress: '송파 잠실',
    phone: '02-412-3456', cuisine: '떡볶이', cuisineCategory: '분식', priceRange: '$', hours: null,
    mood: ['친구모임', '혼밥'], region: '잠실', imageUrl: null, naverMapUrl: null, kakaoMapUrl: null, googleMapUrl: null,
    latitude: null, longitude: null, isActive: true, createdAt: '2026-01-01', updatedAt: '2026-03-01',
    verificationCount: 25, avgTaste: 4.0, avgValue: 4.9, avgService: 3.7, avgAmbiance: 3.4,
    verificationLevel: 'verified' as VerificationLevel, ratings: [
      { id: 'r11', restaurantId: '8', source: 'naver', rating: 4.0, reviewCount: 720, fetchedAt: '2026-03-01' },
    ],
  },
]

class MockRestaurantRepository implements RestaurantRepository {
  async search(
    query: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Restaurant>> {
    const q = query.toLowerCase()
    const filtered = mockData.filter(
      (r) => r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q),
    )
    const page = pagination?.page ?? 1
    const limit = pagination?.limit ?? 20
    const start = (page - 1) * limit
    return { data: filtered.slice(start, start + limit), total: filtered.length, page, limit, hasMore: start + limit < filtered.length }
  }

  async findMany(
    filter?: RestaurantFilter,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<RestaurantWithSummary>> {
    let filtered = [...mockData]

    if (filter?.cuisineCategory) {
      filtered = filtered.filter((r) => r.cuisineCategory === filter.cuisineCategory)
    }
    if (filter?.query) {
      const q = filter.query.toLowerCase()
      filtered = filtered.filter(
        (r) => r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q) || (r.region?.toLowerCase().includes(q) ?? false),
      )
    }
    if (filter?.region) {
      filtered = filtered.filter((r) => r.region === filter.region)
    }

    const page = pagination?.page ?? 1
    const limit = pagination?.limit ?? 20
    const start = (page - 1) * limit
    const data = filtered.slice(start, start + limit)

    return { data, total: filtered.length, page, limit, hasMore: start + limit < filtered.length }
  }

  async findById(id: string): Promise<RestaurantWithSummary | null> {
    return mockData.find((r) => r.id === id) ?? null
  }
}

export const mockRestaurantRepository = new MockRestaurantRepository()
