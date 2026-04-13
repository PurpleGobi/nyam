'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Link2, Copy, Share2, Search, UserPlus, Check, Loader2 } from 'lucide-react'
import Image from 'next/image'
import type { SearchUserResult } from '@/domain/repositories/bubble-repository'

interface InvitePopupProps {
  bubbleName: string
  /** 이미 생성된 초대 코드 (없으면 팝업 열릴 때 자동 생성) */
  inviteCode: string | null
  isLinkLoading: boolean
  onGenerateLink: () => void
  onCopyLink: (code: string) => void
  onClose: () => void
  /** 직접 초대 — 검색 */
  searchResults: SearchUserResult[]
  isSearching: boolean
  invitedIds: Set<string>
  onSearchUsers: (query: string) => void
  onInviteUser: (userId: string) => void
  isInviting: boolean
}

export function InvitePopup({
  bubbleName,
  inviteCode,
  isLinkLoading,
  onGenerateLink,
  onCopyLink,
  onClose,
  searchResults,
  isSearching,
  invitedIds,
  onSearchUsers,
  onInviteUser,
  isInviting,
}: InvitePopupProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [copied, setCopied] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 팝업 열릴 때 초대 코드가 없으면 자동 생성
  useEffect(() => {
    if (!inviteCode && !isLinkLoading) {
      onGenerateLink()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fullUrl = inviteCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/bubbles/invite/${inviteCode}`
    : ''

  const handleCopy = useCallback(() => {
    if (!inviteCode) return
    onCopyLink(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [inviteCode, onCopyLink])

  const handleShare = useCallback(async () => {
    if (!fullUrl) return
    try {
      await navigator.share({ title: `${bubbleName} 버블 초대`, url: fullUrl })
    } catch {
      // share dialog dismissed
    }
  }, [fullUrl, bubbleName])

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (!value.trim()) {
      onSearchUsers('')
      return
    }
    searchTimerRef.current = setTimeout(() => {
      onSearchUsers(value.trim())
    }, 300)
  }, [onSearchUsers])

  // cleanup timer
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-5" onClick={onClose}>
      {/* 오버레이 */}
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} />

      {/* 팝업 */}
      <div
        className="relative z-10 flex w-full max-w-[340px] flex-col rounded-2xl shadow-xl"
        style={{ backgroundColor: 'var(--bg-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-[16px] font-bold" style={{ color: 'var(--text)' }}>
            초대하기
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full transition-opacity active:opacity-70"
            style={{ backgroundColor: 'var(--bg-section)' }}
          >
            <X size={15} style={{ color: 'var(--text-hint)' }} />
          </button>
        </div>

        {/* ─── 초대 링크 섹션 ─── */}
        <div className="px-5 pb-4">
          <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--text-hint)' }}>
            <Link2 size={13} /> 초대 링크
          </p>
          {isLinkLoading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 size={18} className="animate-spin" style={{ color: 'var(--text-hint)' }} />
            </div>
          ) : inviteCode ? (
            <div className="flex flex-col gap-2">
              <div
                className="truncate rounded-lg px-3 py-2 font-mono text-[11px]"
                style={{ backgroundColor: 'var(--bg)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
              >
                {fullUrl}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-semibold transition-all"
                  style={{
                    backgroundColor: copied ? 'var(--positive)' : 'var(--accent-social)',
                    color: 'var(--primary-foreground)',
                  }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? '복사됨' : '복사'}
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-semibold"
                  style={{ backgroundColor: 'var(--bg)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
                >
                  <Share2 size={13} />
                  공유
                </button>
              </div>
              <p className="text-[11px]" style={{ color: 'var(--text-hint)' }}>
                3일 후 만료됩니다
              </p>
            </div>
          ) : null}
        </div>

        {/* 구분선 */}
        <div className="mx-5 h-px" style={{ backgroundColor: 'var(--border)' }} />

        {/* ─── 직접 초대 섹션 ─── */}
        <div className="px-5 pt-4 pb-5">
          <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--text-hint)' }}>
            <UserPlus size={13} /> 직접 초대
          </p>

          {/* 검색 입력 */}
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
          >
            <Search size={14} style={{ color: 'var(--text-hint)' }} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="닉네임 또는 이메일로 검색"
              className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--text-hint)]"
              style={{ color: 'var(--text)' }}
            />
            {isSearching && (
              <Loader2 size={14} className="animate-spin" style={{ color: 'var(--text-hint)' }} />
            )}
          </div>

          {/* 검색 결과 */}
          {searchResults.length > 0 && (
            <div className="mt-2 flex max-h-[180px] flex-col gap-1 overflow-y-auto">
              {searchResults.map((u) => {
                const alreadyInvited = invitedIds.has(u.id)
                return (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2"
                    style={{ backgroundColor: 'var(--bg)' }}
                  >
                    {/* 아바타 */}
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                      style={{
                        backgroundColor: u.avatarColor ?? 'var(--accent-social-light)',
                        color: 'var(--primary-foreground)',
                      }}
                    >
                      {u.avatarUrl ? (
                        <Image src={u.avatarUrl} alt="" width={32} height={32} className="h-full w-full rounded-full object-cover" />
                      ) : (
                        (u.nickname ?? '?').charAt(0)
                      )}
                    </div>

                    {/* 이름 */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
                        {u.nickname}
                      </p>
                      {u.handle && (
                        <p className="truncate text-[11px]" style={{ color: 'var(--text-hint)' }}>
                          @{u.handle}
                        </p>
                      )}
                    </div>

                    {/* 초대 버튼 */}
                    <button
                      type="button"
                      onClick={() => onInviteUser(u.id)}
                      disabled={alreadyInvited || isInviting}
                      className="flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all disabled:opacity-60"
                      style={{
                        backgroundColor: alreadyInvited ? 'var(--bg-section)' : 'var(--accent-social)',
                        color: alreadyInvited ? 'var(--text-hint)' : 'var(--primary-foreground)',
                      }}
                    >
                      {alreadyInvited ? (
                        <><Check size={11} /> 초대됨</>
                      ) : (
                        <><UserPlus size={11} /> 초대</>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* 검색 중인데 결과 없음 */}
          {searchQuery.trim() && !isSearching && searchResults.length === 0 && (
            <p className="mt-3 text-center text-[12px]" style={{ color: 'var(--text-hint)' }}>
              검색 결과가 없어요
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
