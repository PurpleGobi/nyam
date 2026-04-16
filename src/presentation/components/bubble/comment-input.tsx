'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, EyeOff, X } from 'lucide-react'

interface CommentInputProps {
  onSubmit: (content: string, isAnonymous: boolean) => void
  maxLength: number
  disabled?: boolean
  disabledMessage?: string
  replyTarget?: { commentId: string; authorName: string } | null
  onCancelReply?: () => void
}

export function CommentInput({ onSubmit, maxLength, disabled, disabledMessage, replyTarget, onCancelReply }: CommentInputProps) {
  const [content, setContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 답글 모드 진입 시 포커스
  useEffect(() => {
    if (replyTarget) textareaRef.current?.focus()
  }, [replyTarget])

  const handleSubmit = () => {
    const trimmed = content.trim()
    if (!trimmed || trimmed.length > maxLength) return
    onSubmit(trimmed, isAnonymous)
    setContent('')
  }

  const remaining = maxLength - content.length
  const cautionThreshold = 20
  const dangerThreshold = 0

  const counterColor =
    remaining <= dangerThreshold
      ? 'var(--negative)'
      : remaining <= cautionThreshold
        ? 'var(--caution)'
        : 'var(--text-hint)'

  return (
    <div className="flex flex-col gap-2" style={{ borderTop: '1px solid var(--border)' }}>
      {/* 답글 표시 바 */}
      {replyTarget && (
        <div
          className="flex items-center justify-between px-4 pt-2"
          style={{ color: 'var(--accent-social)' }}
        >
          <span className="text-[11px] font-semibold">
            {replyTarget.authorName}에게 답글
          </span>
          <button type="button" onClick={onCancelReply} className="p-1">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 px-4 pt-3 pb-2">
        <div className="min-w-0 flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              disabled && disabledMessage
                ? disabledMessage
                : replyTarget
                  ? `${replyTarget.authorName}에게 답글...`
                  : '댓글을 입력하세요'
            }
            maxLength={maxLength}
            rows={2}
            disabled={disabled}
            className="nyam-input w-full resize-none rounded-xl px-3 py-2.5 text-[13px] disabled:opacity-50"
          />
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!content.trim() || disabled}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-opacity disabled:opacity-30"
          style={{ backgroundColor: 'var(--accent-social)' }}
        >
          <Send size={16} color="var(--text-inverse)" />
        </button>
      </div>

      <div className="flex items-center justify-between px-4 pb-3">
        <button
          type="button"
          onClick={() => setIsAnonymous(!isAnonymous)}
          disabled={disabled}
          className="flex items-center gap-1 text-[11px] font-semibold transition-colors disabled:opacity-50"
          style={{ color: isAnonymous ? 'var(--accent-social)' : 'var(--text-hint)' }}
        >
          <EyeOff size={12} />
          {isAnonymous ? '익명 ON' : '익명 OFF'}
        </button>
        <span
          className="text-[11px]"
          style={{ color: counterColor }}
        >
          {remaining}/{maxLength}
        </span>
      </div>
    </div>
  )
}
