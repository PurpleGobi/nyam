"use client"

import { useState } from "react"
import { MessageCircle, Pencil } from "lucide-react"

interface AiQuestionCardProps {
  question: string
  type: "select" | "freetext"
  options?: string[]
  value: string
  onChange: (answer: string) => void
  placeholder?: string
}

export function AiQuestionCard({
  question,
  type,
  options,
  value,
  onChange,
  placeholder,
}: AiQuestionCardProps) {
  const [showFreetext, setShowFreetext] = useState(false)

  const isSelectMode = type === "select" && options && !showFreetext

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-orange-50 p-4">
      <div className="flex items-start gap-2">
        <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
        <p className="text-sm font-medium text-gray-800">{question}</p>
      </div>

      <div className="ml-6 flex flex-col gap-2">
        {isSelectMode ? (
          <>
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onChange(option)}
                className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                  value === option
                    ? "border-primary-500 bg-primary-50 text-primary-700 font-medium"
                    : "border-orange-200 bg-white text-gray-700 hover:border-orange-300"
                }`}
              >
                {option}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setShowFreetext(true)
                onChange("")
              }}
              className="flex items-center gap-1.5 self-start text-xs text-gray-400 hover:text-gray-600"
            >
              <Pencil className="h-3 w-3" />
              직접 입력
            </button>
          </>
        ) : (
          <>
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder ?? "답변을 입력하세요"}
              rows={3}
              className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-400 resize-none"
            />
            {type === "select" && showFreetext && (
              <button
                type="button"
                onClick={() => {
                  setShowFreetext(false)
                  onChange("")
                }}
                className="self-start text-xs text-gray-400 hover:text-gray-600"
              >
                선택지로 돌아가기
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
