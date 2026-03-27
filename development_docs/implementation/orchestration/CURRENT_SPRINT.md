# Current Sprint

> 현재 활성 스프린트의 실시간 상태. 세션 시작 시 MASTER_TRACKER 다음으로 읽는다.

---

## 활성 스프린트

> **S2 partial + S3 partial + S4 partial — 미완성 항목 정리 필요**

```
Sprint:       S2/S3/S4 미완성 항목 마무리
시작일:       2026-03-27
목표:         mock→실 연결, 누락 파일 구현, 풀플로우 통합
선행 완료:    S1 Foundation ✅
```

---

## 미완성 항목 목록 (우선순위순)

### S2 미완성
| # | 항목 | 구체적 내용 |
|---|------|-----------|
| 2.8 | 사진 업로드 인프라 | `infrastructure/storage/image-upload.ts`(리사이즈+WebP+Storage 업로드), `application/hooks/use-photo-upload.ts` |
| 2.9 | record-flow mock→실 연결 | `record-flow-container.tsx`에서 `useCreateRecord` 실제 호출. mock setTimeout 제거 |

### S3 미완성
| # | 항목 | 구체적 내용 |
|---|------|-----------|
| 3.1 | 카메라 진입 라우트 | `/add` 또는 `/camera` 페이지 + CameraContainer 렌더링 |
| 3.1 | gemini.ts 에러 핸들링 | JSON.parse를 try-catch로 감싸기 |
| 3.1 | album-picker.tsx | 앨범 선택 전용 컴포넌트 (camera-capture에 input 대체 중이므로 LOW) |
| 3.1 | wine-confirm-container.tsx | 와인 확인 화면 컨테이너 |
| 3.2 | NearbyList GPS 연동 | `navigator.geolocation` → `/api/restaurants/nearby` fetch → NearbyList에 전달 |
| 3.3 | PostGIS RPC 함수 | `restaurants_within_radius` SQL 함수 마이그레이션 추가 |
| 3.3 | 외부 API 연동 | 카카오/네이버/구글 Places fallback (env var 없으면 skip) |
| 3.5 | EXIF 파서 실 구현 | `parseExifData` stub → 실제 TIFF IFD 파싱 또는 exif-reader 라이브러리 도입 |
| 3.7 | 풀플로우 상태 머신 | `add-flow-container.tsx`, `use-add-flow.ts`, `use-save-record.ts`, `/add/page.tsx` |

### S4 미완성
| # | 항목 | 구체적 내용 |
|---|------|-----------|
| 4.1 | bubble-expand-panel.tsx | L3b 버블 확장 패널 |
| 4.1 | nyam-score.ts | nyam 점수 계산 도메인 서비스 |
| 4.2 | wine-facts-table.tsx | 와인 상세 스펙 테이블 (독립 컴포넌트) |
| 4.2 | food-pairing-tags.tsx | 페어링 태그 표시 컴포넌트 |
| 4.3 | 기록 상세 전용 컴포넌트 8개 | mini-quadrant, aroma-display, photo-gallery, pairing-display, record-practical-info, xp-earned-section, record-actions, delete-confirm-modal |
| 4.5 | from/edit param 처리 | record-flow-container에서 `from=detail` 분기 + `edit=RECORD_ID` pre-fill 모드 |

---

## 컨텍스트 노트

> 2026-03-27 코드베이스 감사 결과:
> - S1: 완전 완료 (7/7)
> - S2: 2.1~2.7 완료, 2.8~2.10 partial (UI 존재하나 실 연결 미완)
> - S3: 개별 컴포넌트/API 대부분 존재하나 **통합 플로우(3.7) 미구현**, PostGIS RPC 없음, 진입 라우트 없음
> - S4: 라우트/컨테이너 기본 구조 존재하나 **세부 컴포넌트 다수 미구현**, record-detail 인라인 처리
> - 이전 세션에서 MASTER_TRACKER를 실제보다 낙관적으로 기록한 오류 발견 → 수정 완료

---

## 갱신 규칙

- 태스크 시작 시: "현재 태스크" 섹션 갱신
- 태스크 완료 시: "완료된 태스크" 테이블에 추가 + "다음 태스크 프리뷰" 갱신
- 세션 종료 시: "컨텍스트 노트"에 인수인계 사항 기록
- 스프린트 완료 시: MASTER_TRACKER 갱신 후 이 문서 초기화
