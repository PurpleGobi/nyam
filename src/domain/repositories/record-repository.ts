// src/domain/repositories/record-repository.ts
// R1: domain 인터페이스 — 외부 의존 0
// infrastructure에서 implements로 구현

import type { DiningRecord, RecordTargetType, CreateRecordInput, RecordWithTarget } from '@/domain/entities/record'
import type { RecordPhoto } from '@/domain/entities/record-photo'

/**
 * Record Repository 인터페이스
 * records 단일 테이블 구조 (lists 테이블 제거됨)
 * infrastructure/repositories/supabase-record-repository.ts에서 구현
 */
export interface RecordRepository {
  // ─── Record (방문/시음 1회) ───

  /** 기록 생성: records INSERT */
  create(input: CreateRecordInput): Promise<DiningRecord>

  findById(id: string): Promise<DiningRecord | null>

  /** 사용자의 records 조회 (visit_date DESC) */
  findByUserId(userId: string, targetType?: RecordTargetType): Promise<DiningRecord[]>

  /** records + 대상 메타데이터 JOIN (홈 피드용) */
  findByUserIdWithTarget(userId: string, targetType?: RecordTargetType): Promise<RecordWithTarget[]>

  /** 특정 대상에 대한 records (사분면 참조점 등) */
  findByUserAndTarget(userId: string, targetId: string): Promise<DiningRecord[]>

  update(id: string, data: Partial<DiningRecord>): Promise<DiningRecord>

  /** 기록 삭제 (record_photos는 ON DELETE CASCADE) */
  delete(id: string): Promise<void>

  // ─── 사진 (읽기/삭제만) ───

  findPhotosByRecordId(recordId: string): Promise<RecordPhoto[]>

  deletePhoto(id: string): Promise<void>

  // ─── 홈 피드 최적화 ───

  /** target_type별 평균 만족도 (satisfaction이 있는 기록만) */
  getAvgSatisfactionByType(userId: string, targetType: RecordTargetType): Promise<number | null>
}
