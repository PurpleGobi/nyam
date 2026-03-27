'use client'

import { useState } from 'react'
import { Send, EyeOff } from 'lucide-react'

interface CommentInputProps {
  onSubmit: (content: string, isAnonymous: boolean) => void
  maxLength: number
  disabled?: boolean
}

export function CommentInput({ onSubmit, maxLength, disabled }: CommentInputProps) {
  const [content, setContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)

  const handleSubmit = () => {
    const trimmed = content.trim()
    if (!trimmed || trimmed.length > maxLength) return
    onSubmit(trimmed, isAnonymous)
    setContent('')
  }

  const remaining = maxLength - content.length

  return (
    <div className="flex flex-col gap-2" style={{ borderTop: '1px solid var(--border)' }}>
      <div className="flex items-end gap-2 px-4 pt-3 pb-2">
        <div className="min-w-0 flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="댓글을 입력하세요"
            maxLength={maxLength}
            rows={2}
            disabled={disabled}
            className="w-full resize-none rounded-xl px-3 py-2.5 text-[13px] text-[var(--text)] outline-none disabled:opacity-50"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
          />
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!content.trim() || disabled}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-opacity disabled:opacity-30"
          style={{ backgroundColor: 'var(--accent-social)' }}
        >
          <Send size={16} color="#FFFFFF" />
        </button>
      </div>

      <div className="flex items-center justify-between px-4 pb-3">
        <button
          type="button"
          onClick={() => setIsAnonymous(!isAnonymous)}
          className="flex items-center gap-1 text-[11px] font-semibold transition-colors"
          style={{ color: isAnonymous ? 'var(--accent-social)' : 'var(--text-hint)' }}
        >
          <EyeOff size={12} />
          {isAnonymous ? '익명 ON' : '익명 OFF'}
        </button>
        <span
          className="text-[11px]"
          style={{ color: remaining < 30 ? 'var(--negative)' : 'var(--text-hint)' }}
        >
          {remaining}/{maxLength}
        </span>
      </div>
    </div>
  )
}
