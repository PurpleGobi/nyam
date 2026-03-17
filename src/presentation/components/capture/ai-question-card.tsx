"use client"

import { useState } from "react"
import { MessageCircle, ChevronRight } from "lucide-react"

interface AiQuestionCardProps {
  question: string
  placeholder?: string
  onAnswer: (answer: string) => void
}

export function AiQuestionCard({ question, placeholder, onAnswer }: AiQuestionCardProps) {
  const [answer, setAnswer] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => {
    if (!answer.trim()) return
    onAnswer(answer.trim())
    setSubmitted(true)
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-orange-50 p-4">
      <div className="flex items-start gap-2">
        <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
        <p className="text-sm font-medium text-gray-800">{question}</p>
      </div>

      {submitted ? (
        <p className="ml-6 text-sm text-gray-600">{answer}</p>
      ) : (
        <div className="ml-6 flex gap-2">
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={placeholder ?? "답변을 입력하세요"}
            className="flex-1 rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          <button
            onClick={handleSubmit}
            disabled={!answer.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500 text-white disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
