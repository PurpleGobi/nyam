'use client'

import { useEffect, useState } from 'react'
import { X, MapPin, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import type { ImportStatus, NaverPlace, ImportResult } from '@/application/hooks/use-naver-import'

interface NaverImportSheetProps {
  isOpen: boolean
  onClose: () => void
  status: ImportStatus
  folderName: string
  places: NaverPlace[]
  result: ImportResult | null
  errorMessage: string
  onFetch: (url: string) => void
  onImport: () => void
  onReset: () => void
}

export function NaverImportSheet({
  isOpen,
  onClose,
  status,
  folderName,
  places,
  result,
  errorMessage,
  onFetch,
  onImport,
  onReset,
}: NaverImportSheetProps) {
  const [url, setUrl] = useState('')

  const handleClose = () => {
    setUrl('')
    onReset()
    onClose()
  }

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  })

  if (!isOpen) return null

  return (
    <>
      <div className="bottom-sheet-overlay" onClick={handleClose} />

      <div className="bottom-sheet flex flex-col" style={{ maxHeight: '85vh' }}>
        {/* Handle */}
        <div className="flex justify-center">
          <div className="bottom-sheet-handle" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>
            네이버 지도 가져오기
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: 'var(--bg)' }}
          >
            <X size={16} style={{ color: 'var(--text-sub)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {/* Step 1: URL 입력 */}
          {(status === 'idle' || status === 'fetching' || status === 'error') && (
            <div className="flex flex-col gap-3">
              <p style={{ fontSize: '13px', color: 'var(--text-sub)', lineHeight: 1.5 }}>
                네이버 지도 앱에서 저장 목록의 <strong style={{ color: 'var(--text)' }}>공유하기</strong> 버튼을 눌러 링크를 복사한 뒤 붙여넣으세요.
              </p>

              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://naver.me/... 또는 공유 링크"
                className="w-full rounded-xl px-4 py-3"
                style={{
                  fontSize: '14px',
                  border: `1px solid ${status === 'error' ? 'var(--negative)' : 'var(--border)'}`,
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text)',
                  outline: 'none',
                }}
              />

              {status === 'error' && (
                <div className="flex items-center gap-2" style={{ color: 'var(--negative)', fontSize: '13px' }}>
                  <AlertCircle size={14} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div
                className="rounded-xl px-4 py-3"
                style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 8%, transparent)' }}
              >
                <p style={{ fontSize: '12px', color: 'var(--text-sub)', lineHeight: 1.6 }}>
                  1. 네이버 지도 앱 → 내 저장 → 폴더 선택<br />
                  2. 우측 상단 <strong style={{ color: 'var(--text)' }}>공유</strong> 버튼 → 링크 복사<br />
                  3. 복사한 링크를 위에 붙여넣기
                </p>
              </div>
            </div>
          )}

          {/* Step 2: 미리보기 */}
          {status === 'previewing' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--accent-food) 15%, transparent)' }}
                >
                  <MapPin size={16} style={{ color: 'var(--accent-food)' }} />
                </div>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                    {folderName}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
                    {places.length}개 장소
                  </p>
                </div>
              </div>

              <div
                className="flex flex-col rounded-xl"
                style={{ border: '1px solid var(--border)', maxHeight: '300px', overflow: 'auto' }}
              >
                {places.map((place, i) => (
                  <div
                    key={place.naverPlaceId}
                    className="flex items-center gap-3 px-4 py-2.5"
                    style={{
                      borderBottom: i < places.length - 1 ? '1px solid var(--border)' : undefined,
                    }}
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: 'var(--bg)', fontSize: '11px', color: 'var(--text-hint)', fontWeight: 600 }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate" style={{ fontSize: '14px', color: 'var(--text)' }}>
                        {place.name}
                      </p>
                      <p className="truncate" style={{ fontSize: '11px', color: 'var(--text-hint)' }}>
                        {place.address}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: '12px', color: 'var(--text-hint)', lineHeight: 1.5 }}>
                가져온 식당은 Nyam에 등록되고 자동으로 찜 목록에 추가됩니다.
              </p>
            </div>
          )}

          {/* Step 3: 가져오는 중 */}
          {status === 'importing' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
              <p style={{ fontSize: '15px', color: 'var(--text)' }}>
                {places.length}개 식당을 가져오는 중...
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-hint)' }}>
                잠시만 기다려주세요
              </p>
            </div>
          )}

          {/* Step 3: Fetching */}
          {status === 'fetching' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
              <p style={{ fontSize: '15px', color: 'var(--text)' }}>
                목록을 불러오는 중...
              </p>
            </div>
          )}

          {/* Step 4: 완료 */}
          {status === 'done' && result && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{ backgroundColor: 'color-mix(in srgb, var(--positive) 15%, transparent)' }}
              >
                <CheckCircle2 size={28} style={{ color: 'var(--positive)' }} />
              </div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                가져오기 완료
              </p>
              <div
                className="w-full rounded-xl px-4 py-3"
                style={{ backgroundColor: 'var(--bg)' }}
              >
                <div className="flex flex-col gap-1.5" style={{ fontSize: '14px' }}>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-sub)' }}>전체</span>
                    <span style={{ color: 'var(--text)', fontWeight: 600 }}>{result.total}개</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-sub)' }}>새로 등록</span>
                    <span style={{ color: 'var(--positive)', fontWeight: 600 }}>{result.created}개</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-sub)' }}>기존 식당 매칭</span>
                    <span style={{ color: 'var(--text)', fontWeight: 600 }}>{result.existing}개</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-sub)' }}>찜 추가</span>
                    <span style={{ color: 'var(--accent-food)', fontWeight: 600 }}>{result.bookmarked}개</span>
                  </div>
                  {result.failed > 0 && (
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-sub)' }}>실패</span>
                      <span style={{ color: 'var(--negative)', fontWeight: 600 }}>{result.failed}개</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 pb-8 pt-3">
          {(status === 'idle' || status === 'error') && (
            <button
              type="button"
              disabled={!url.trim()}
              onClick={() => onFetch(url)}
              className="w-full rounded-xl py-3 text-center transition-opacity"
              style={{
                fontSize: '15px',
                fontWeight: 700,
                backgroundColor: url.trim() ? 'var(--primary)' : 'var(--border)',
                color: url.trim() ? '#FFFFFF' : 'var(--text-hint)',
              }}
            >
              목록 불러오기
            </button>
          )}

          {status === 'previewing' && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-xl py-3 text-center"
                style={{ fontSize: '15px', fontWeight: 600, border: '1px solid var(--border)', color: 'var(--text-sub)' }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={onImport}
                className="flex-1 rounded-xl py-3 text-center"
                style={{ fontSize: '15px', fontWeight: 700, backgroundColor: 'var(--accent-food)', color: '#FFFFFF' }}
              >
                {places.length}개 가져오기
              </button>
            </div>
          )}

          {status === 'done' && (
            <button
              type="button"
              onClick={handleClose}
              className="w-full rounded-xl py-3 text-center"
              style={{ fontSize: '15px', fontWeight: 700, backgroundColor: 'var(--primary)', color: '#FFFFFF' }}
            >
              확인
            </button>
          )}
        </div>
      </div>
    </>
  )
}
