// src/domain/repositories/record-repository.ts
// R1: domain 인터페이스 — 외부 의존 0
// infrastructure에서 implements로 구현

import type { DiningRecord, RecordTargetType, CreateRecordInput, AddVisitInput, RecordWithTarget } from '@/domain/entities/record'
import type { RecordPhoto } from '@/domain/entities/record-photo'

/**
 * Record Repository 인터페이스
 * infrastructure/repositories/supabase-record-repository.ts에서 구현
 * application/hooks에서 이 인터페이스에만 의존 (R3 준수)
 */
export interface RecordRepository {
  // ─── 기록 CRUD ───

  create(input: CreateRecordInput): Promise<DiningRecord>

  /** 기존 기록에 새 방문 추가 */
  addVisit(input: AddVisitInput): Promise<DiningRecord>

  findById(id: string): Promise<DiningRecord | null>

  /**
   * 사용자 ID + 대상 타입으로 기록 목록 조회
   * visit_date DESC 정렬 (최신순)
   */
  findByUserId(userId: string, targetType?: RecordTargetType): Promise<DiningRecord[]>

  /**
   * 사용자 기록 + 대상(식당/와인) 메타데이터 JOIN 조회
   * 홈 화면 카드에서 이름/사진/장르 표시용
   */
  findByUserIdWithTarget(userId: string, targetType?: RecordTargetType): Promise<RecordWithTarget[]>

  /**
   * 사용자의 특정 대상(식당/와인)에 대한 기록 목록 조회
   * 사분면 참조 점 표시용
   */
  findByUserAndTarget(userId: string, targetId: string): Promise<DiningRecord[]>

  update(id: string, data: Partial<DiningRecord>): Promise<DiningRecord>

  /**
   * 기록 삭제
   * record_photos는 ON DELETE CASCADE로 자동 삭제
   */
  delete(id: string): Promise<void>

  // ─── 사진 (읽기/삭제만 — 사진 저장은 PhotoRepository 책임, DEC-007) ───

  findPhotosByRecordId(recordId: string): Promise<RecordPhoto[]>

  deletePhoto(id: string): Promise<void>

  // ─── 찜 연동 ───

  /**
   * 기록 저장 시 동일 대상의 찜(wishlist)을 방문 처리
   * 찜이 없으면 아무 동작 안 함
   */
  markWishlistVisited(userId: string, targetId: string, targetType: RecordTargetType): Promise<void>
}
