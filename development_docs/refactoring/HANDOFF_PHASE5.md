# Phase 5 핸드오프 — lists/records 분리 코드 수정

> **전체 완료** — DB 마이그레이션 + 코드 수정 모두 적용됨

---

## 완료된 작업

### DB (모두 적용 완료)
- [x] Phase 1: 불필요 테이블 삭제 (5개)
- [x] Phase 2: record_photos.thumbnail_url 추가
- [x] Phase 3: bubble_shares.target_id, target_type 비정규화
- [x] Phase 4: XP 테이블 리네이밍 + xp_seed_rules
- [x] Phase 5 DB: lists + records_new 생성, 데이터 마이그레이션, FK 재매핑, RLS

### 코드 (Phase 1~4 완료)
- [x] 넛지/추천 코드 전체 삭제
- [x] container.ts, types.ts, home-container.tsx 정리
- [x] record_photos 관련 코드에 thumbnailUrl 추가
- [x] bubble_shares 관련 코드에 targetId, targetType 추가
- [x] XP 테이블명 변경 (.from() 호출 전부 수정)

### Phase 5 코드 (전체 완료)
- [x] C-1: types.ts — records 타입 갱신 (list_id, private_note 추가, status/wine_status/tips 제거), lists 타입 추가
- [x] C-2: supabase-record-repository.ts — 전면 재작성 (lists upsert → records INSERT)
- [x] C-3: wishlist 파일 삭제 (entity, repository interface, implementation)
- [x] C-4: record-repository.ts — 인터페이스에 list 메서드 통합 (findOrCreateList, updateListStatus, findListsByUser, findListByUserAndTarget, deleteList)
- [x] C-5: wishlist-repository.ts 삭제
- [x] D-1: filter-matcher.ts — visits[0] 접근 제거, satisfaction/visitDate 직접 참조
- [x] D-2: filter-query-builder.ts — avg_satisfaction→satisfaction, latest_visit_date→visit_date
- [x] D-3: xp-calculator.ts — record.visits[0] → record 직접 접근
- [x] E: 애플리케이션 훅 수정 (use-home-records, use-record-detail, use-calendar-records, use-restaurant-detail, use-wine-detail, use-restaurant-stats, use-wine-stats, use-wishlist, use-create-record, use-reactions)
- [x] F-1: supabase-restaurant-repository.ts — mapDbToRecord 재작성, findQuadrantRefs 새 구조
- [x] F-2: supabase-wine-repository.ts — 동일
- [x] F-3: supabase-bubble-repository.ts — avg_satisfaction→satisfaction, visits JSONB→직접 컬럼
- [x] F-4: supabase-profile-repository.ts — 동일 + wine_status→lists 테이블 조회
- [x] F-5: supabase-onboarding-repository.ts — records INSERT → lists upsert
- [x] F-6: 프레젠테이션 컨테이너 (home, record-flow, restaurant-detail, wine-detail, discover, add-flow, bubble-detail, bubbler-profile)
- [x] F-7: 프레젠테이션 컴포넌트 (record-timeline, share-list-sheet, wine-card, record-card)
- [x] G: DI 컨테이너 정리 (wishlistRepo 제거) + **pnpm build 통과 확인**

---

## 검증 후 정리 (완료)

- [x] `DROP TABLE records_old CASCADE;`
- [x] `DROP TABLE wishlists CASCADE;`
- [x] `ALTER TABLE records DROP COLUMN legacy_record_id;`
- [x] `types.ts`에서 wishlists 타입 제거 + legacy_record_id 제거
- [x] 마이그레이션 파일: `supabase/migrations/032_cleanup_legacy_tables.sql`
- [x] pnpm build 통과 확인

---

## 참조 문서
- 전체 계획: `development_docs/refactoring/SCHEMA_REFACTORING.md`
- 스키마 개념: `docs/Nyam 개념문서/백앤드스키마.md`
