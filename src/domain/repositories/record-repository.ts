// src/domain/repositories/record-repository.ts
// R1: domain 인터페이스 — 외부 의존 0
// infrastructure에서 implements로 구현

import type { DiningRecord, ListItem, ListStatus, RecordTargetType, CreateRecordInput, RecordWithTarget, RecordSource } from '@/domain/entities/record'
import type { RecordPhoto } from '@/domain/entities/record-photo'

/**
 * Record Repository 인터페이스
 * lists + records 2-테이블 구조
 * infrastructure/repositories/supabase-record-repository.ts에서 구현
 */
export interface RecordRepository {
  // ─── List (사용자 × 대상 관계) ───

  /** lists upsert — 이미 존재하면 반환, 없으면 생성 */
  findOrCreateList(userId: string, targetId: string, targetType: RecordTargetType, status: ListStatus): Promise<ListItem>

  /** list status 변경 (e.g. wishlist → visited) */
  updateListStatus(listId: string, status: ListStatus): Promise<void>

  /** 사용자의 list 항목 조회 (status 필터) */
  findListsByUser(userId: string, targetType: RecordTargetType, status?: ListStatus): Promise<ListItem[]>

  /** 특정 대상의 list 존재 여부 + status 조회 */
  findListByUserAndTarget(userId: string, targetId: string, targetType: RecordTargetType): Promise<ListItem | null>

  /** list 삭제 (연결된 records도 CASCADE 삭제) */
  deleteList(listId: string): Promise<void>

  // ─── Record (방문/시음 1회) ───

  /** 기록 생성: lists upsert → records INSERT */
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

  /** 홈 피드용 통합 조회 — views에 해당하는 소스를 1회 enrich */
  findHomeRecords(
    userId: string,
    targetType: RecordTargetType,
    views: RecordSource[],
  ): Promise<RecordWithTarget[]>

  /** visited records의 target 중 팔로잉 유저도 기록한 targetId Set 반환 */
  findFollowingTargetIds(
    userId: string,
    targetIds: string[],
    targetType: RecordTargetType,
  ): Promise<Set<string>>
}
