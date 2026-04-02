'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, UserPlus, Check, Loader2 } from 'lucide-react'
import type { SearchUserResult } from '@/domain/repositories/bubble-repository'

interface MemberInviteSectionProps {
  searchResults: SearchUserResult[]
  isSearching: boolean
  isInviting: boolean
  invitedIds: Set<string>
  onSearch: (query: string, excludeIds: string[]) => void
  onInvite: (userId: string) => void
  existingMemberIds: string[]
}

export function MemberInviteSection({
  searchResults, isSearching, isInviting, invitedIds,
  onSearch, onInvite, existingMemberIds,
}: MemberInviteSectionProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const handleInputChange = useCallback((value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onSearch(value, existingMemberIds)
    }, 300)
  }, [onSearch, existingMemberIds])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  return (
    <div className="flex flex-col gap-2">
      {/* 검색 입력 */}
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2"
        style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
      >
        <Search size={14} style={{ color: 'var(--text-hint)', flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="닉네임, 핸들 또는 이메일로 검색"
          className="flex-1 border-none bg-transparent text-[13px] outline-none"
          style={{ color: 'var(--text)' }}
        />
        {isSearching && <Loader2 size={14} className="animate-spin" style={{ color: 'var(--text-hint)' }} />}
      </div>

      {/* 검색 결과 */}
      {query.trim().length > 0 && (
        <div
          className="flex max-h-[200px] flex-col overflow-y-auto rounded-xl"
          style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
        >
          {searchResults.length === 0 && !isSearching ? (
            <p className="px-3 py-4 text-center text-[12px]" style={{ color: 'var(--text-hint)' }}>
              검색 결과가 없습니다
            </p>
          ) : (
            searchResults.map((user) => {
              const alreadyInvited = invitedIds.has(user.id)
              return (
                <div
                  key={user.id}
                  className="flex items-center gap-3 px-3 py-2.5"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  {/* 아바타 */}
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                    style={{
                      backgroundColor: user.avatarColor ?? 'var(--accent-social-light)',
                      color: '#FFFFFF',
                    }}
                  >
                    {user.nickname.charAt(0)}
                  </div>

                  {/* 정보 */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
                      {user.nickname}
                    </p>
                    {user.handle && (
                      <p className="truncate text-[11px]" style={{ color: 'var(--text-hint)' }}>
                        @{user.handle}
                      </p>
                    )}
                  </div>

                  {/* 초대 버튼 */}
                  <button
                    type="button"
                    onClick={() => onInvite(user.id)}
                    disabled={alreadyInvited || isInviting}
                    className="flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-opacity disabled:opacity-50"
                    style={{
                      backgroundColor: alreadyInvited ? 'var(--positive-light, rgba(16,185,129,0.1))' : 'var(--accent-social)',
                      color: alreadyInvited ? 'var(--positive)' : '#FFFFFF',
                    }}
                  >
                    {alreadyInvited ? (
                      <><Check size={12} /> 초대됨</>
                    ) : (
                      <><UserPlus size={12} /> 초대</>
                    )}
                  </button>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
