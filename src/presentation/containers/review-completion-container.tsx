'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'
import { useRecordCompletion } from '@/application/hooks/use-record-completion'
import { AiQuestionCard } from '@/presentation/components/review/ai-question-card'
import { BlogPreview } from '@/presentation/components/review/blog-preview'

export function ReviewCompletionContainer() {
  const params = useParams()
  const router = useRouter()
  const recordId = typeof params.id === 'string' ? params.id : undefined

  const {
    step,
    record,
    photoUrls,
    questions,
    answers,
    blog,
    xpEarned,
    error,
    isLoading,
    setAnswer,
    generateBlog,
    saveBlog,
  } = useRecordCompletion(recordId)

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

  const answeredCount = Object.keys(answers).length
  const allAnswered = answeredCount >= questions.length && questions.length > 0

  if (isLoading || step === 'loading') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6038]" />
        <p className="text-sm text-[var(--color-neutral-500)]">기록을 불러오는 중...</p>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 pt-20">
        <p className="text-sm text-[var(--color-neutral-500)]">기록을 찾을 수 없습니다</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-medium text-[#FF6038]"
        >
          돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-100)]"
          aria-label="뒤로 가기"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold text-[var(--color-neutral-800)]">
          기록 완성하기
        </h1>
        <div className="h-8 w-8" />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Record Summary */}
      {step !== 'complete' && (
        <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-base font-semibold text-[var(--color-neutral-800)]">
              {record.menuName || '이름 없는 기록'}
            </span>
            <div className="flex items-center gap-2 text-xs text-[var(--color-neutral-500)]">
              {record.category && <span>{record.category}</span>}
              <span>
                {new Date(record.createdAt).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            {record.ratingOverall > 0 && (
              <div className="flex items-center gap-1 text-sm">
                <span className="text-[#FF6038] font-semibold">{Math.round(record.ratingOverall)}</span>
                <span className="text-[var(--color-neutral-400)]">/ 100</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Questions Step */}
      {step === 'questions' && questions.length > 0 && (
        <div className="flex flex-col gap-4">
          {/* Progress */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-[var(--color-neutral-100)]">
              <div
                className="h-1.5 rounded-full bg-[#FF6038] transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
            <span className="text-xs text-[var(--color-neutral-500)]">
              {currentQuestionIndex + 1}/{questions.length}
            </span>
          </div>

          {/* Current Question */}
          <AiQuestionCard
            question={questions[currentQuestionIndex].question}
            options={questions[currentQuestionIndex].options}
            type={questions[currentQuestionIndex].type}
            value={answers[questions[currentQuestionIndex].id] ?? ''}
            onChange={(value) => setAnswer(questions[currentQuestionIndex].id, value)}
          />

          {/* Navigation */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-neutral-200)] text-[var(--color-neutral-500)] disabled:opacity-30"
              aria-label="이전 질문"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="flex-1" />

            {currentQuestionIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                className="flex h-10 items-center gap-1.5 rounded-xl bg-[var(--color-neutral-100)] px-4 text-sm font-medium text-[var(--color-neutral-700)]"
              >
                다음
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={generateBlog}
                disabled={!allAnswered}
                className="flex h-10 items-center gap-1.5 rounded-xl bg-[#FF6038] px-5 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
              >
                <Sparkles className="h-4 w-4" />
                AI 리뷰 생성하기
              </button>
            )}
          </div>

          {/* Quick dots */}
          <div className="flex items-center justify-center gap-1.5">
            {questions.map((q, i) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrentQuestionIndex(i)}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === currentQuestionIndex
                    ? 'bg-[#FF6038]'
                    : answers[q.id]
                      ? 'bg-[#FF6038]/40'
                      : 'bg-[var(--color-neutral-200)]'
                }`}
                aria-label={`질문 ${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Generating Step */}
      {step === 'generating' && (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
          <div className="relative">
            <Loader2 className="h-10 w-10 animate-spin text-[#FF6038]" />
            <Sparkles className="absolute -right-1 -top-1 h-5 w-5 text-[#FF6038] animate-pulse" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-medium text-[var(--color-neutral-700)]">
              AI가 리뷰를 작성하고 있습니다...
            </p>
            <p className="text-xs text-[var(--color-neutral-400)]">
              잠시만 기다려주세요
            </p>
          </div>
        </div>
      )}

      {/* Preview Step */}
      {step === 'preview' && blog && (
        <div className="flex flex-col gap-4">
          <BlogPreview
            title={blog.title}
            sections={blog.sections}
            summary={blog.summary}
            recommendFor={blog.recommendFor}
            photoUrls={photoUrls}
          />

          <button
            type="button"
            onClick={saveBlog}
            className="w-full rounded-xl bg-[#FF6038] py-3.5 text-sm font-semibold text-white transition-opacity"
          >
            저장하기 (+15 XP)
          </button>
        </div>
      )}

      {/* Saving Step */}
      {step === 'saving' && (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF6038]" />
          <p className="text-sm text-[var(--color-neutral-500)]">저장 중...</p>
        </div>
      )}

      {/* Complete Step */}
      {step === 'complete' && (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FF6038]/10">
            <CheckCircle2 className="h-8 w-8 text-[#FF6038]" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-lg font-bold text-[var(--color-neutral-800)]">
              리뷰 완성!
            </p>
            <p className="text-sm text-[var(--color-neutral-500)]">
              블로그 리뷰가 저장되었습니다
            </p>
          </div>
          {xpEarned > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-[#FF6038]/10 px-4 py-2">
              <Sparkles className="h-4 w-4 text-[#FF6038]" />
              <span className="text-sm font-semibold text-[#FF6038]">
                +{xpEarned} XP
              </span>
            </div>
          )}
          <div className="flex w-full flex-col gap-2 pt-4">
            <button
              type="button"
              onClick={() => router.push(`/records/${recordId}`)}
              className="w-full rounded-xl bg-[#FF6038] py-3.5 text-sm font-semibold text-white"
            >
              기록 보러가기
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full rounded-xl border border-[var(--color-neutral-200)] bg-white py-3.5 text-sm font-medium text-[var(--color-neutral-700)]"
            >
              홈으로
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
