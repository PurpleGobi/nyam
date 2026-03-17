"use client"

import { useEffect } from "react"
import Link from "next/link"
import {
  PartyPopper,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { useRecordDetail } from "@/application/hooks/use-record-detail"
import { useRecordCompletion } from "@/application/hooks/use-record-completion"
import { AiQuestionCard } from "@/presentation/components/capture/ai-question-card"
import { BlogPreview } from "@/presentation/components/capture/blog-preview"
import { ROUTES } from "@/shared/constants/routes"

interface ReviewCompletionContainerProps {
  recordId: string
}

export function ReviewCompletionContainer({ recordId }: ReviewCompletionContainerProps) {
  const { record } = useRecordDetail(recordId)
  const {
    stage,
    questions,
    answers,
    currentStep,
    blog,
    isLoading,
    error,
    allAnswered,
    fetchQuestions,
    setAnswer,
    goNext,
    goPrev,
    generateBlog,
    completeReview,
  } = useRecordCompletion()

  useEffect(() => {
    fetchQuestions(recordId)
  }, [recordId, fetchQuestions])

  const photoUrls = record?.photos.map(p => p.photoUrl) ?? []

  if (stage === "complete") {
    return (
      <div className="flex flex-col items-center justify-center gap-6 px-4 pt-20 pb-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-50 text-primary-500">
          <PartyPopper className="h-10 w-10" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-neutral-800">
            블로그 리뷰 완성!
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            AI와 함께 멋진 리뷰를 작성했어요
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link
            href={ROUTES.recordDetail(recordId)}
            className="flex h-12 items-center justify-center rounded-xl bg-primary-500 text-sm font-semibold text-white hover:bg-primary-600 active:scale-[0.98] transition-all"
          >
            기록 보기
          </Link>
          <Link
            href={ROUTES.HOME}
            className="flex h-12 items-center justify-center rounded-xl bg-neutral-100 text-sm font-semibold text-neutral-600 hover:bg-neutral-200 active:scale-[0.98] transition-all"
          >
            홈으로
          </Link>
        </div>
      </div>
    )
  }

  if (stage === "generating") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 pt-32 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
        <p className="text-sm font-medium text-neutral-600">
          블로그를 만들고 있어요...
        </p>
        <p className="text-xs text-neutral-400">
          답변을 바탕으로 매거진 스타일 리뷰를 작성 중이에요
        </p>
      </div>
    )
  }

  if (stage === "preview" && blog) {
    return (
      <div className="flex flex-col gap-4 pb-24">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white/80 backdrop-blur-sm px-4 py-3 border-b border-neutral-100">
          <h1 className="text-lg font-bold text-neutral-800">블로그 미리보기</h1>
        </div>

        <BlogPreview review={{
          title: blog.title,
          summary: "",
          sections: blog.sections.map(s => ({
            heading: "",
            content: s.content,
            photoIndex: s.photoIndex,
          })),
          tags: blog.tags,
          overallImpression: "",
        }} photos={photoUrls} />

        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-neutral-100 p-4">
          <button
            type="button"
            onClick={completeReview}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-primary-500 text-sm font-semibold text-white hover:bg-primary-600 active:scale-[0.98] transition-all"
          >
            저장하기
          </button>
        </div>
      </div>
    )
  }

  // Stage: questions
  const currentQuestion = questions[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === questions.length - 1

  return (
    <div className="flex flex-col gap-4 px-4 pb-24 pt-4">
      {/* Record Summary Card */}
      {record && (
        <div className="flex flex-col gap-1 rounded-2xl bg-neutral-50 p-4">
          <h2 className="text-base font-bold text-neutral-800">
            {record.menuName || "기록"}
          </h2>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            {record.genre && <span>{record.genre}</span>}
            {record.genre && record.createdAt && <span>·</span>}
            <span>{new Date(record.createdAt).toLocaleDateString("ko-KR")}</span>
          </div>
          {record.ratingOverall !== null && (
            <div className="mt-1 flex items-center gap-1">
              <span className="text-sm font-semibold text-primary-500">
                {record.ratingOverall}
              </span>
              <span className="text-xs text-neutral-400">/100</span>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading questions */}
      {isLoading && questions.length === 0 && (
        <div className="flex flex-col items-center gap-3 pt-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <p className="text-sm text-neutral-500">질문을 준비하고 있어요...</p>
        </div>
      )}

      {/* Questions */}
      {questions.length > 0 && currentQuestion && (
        <>
          {/* Progress */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-neutral-100 overflow-hidden">
              <div
                className="h-full bg-primary-500 transition-all duration-300"
                style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-neutral-400">
              {currentStep + 1}/{questions.length}
            </span>
          </div>

          {/* Current Question */}
          <AiQuestionCard
            key={currentQuestion.id}
            question={currentQuestion.question}
            type={currentQuestion.type}
            options={currentQuestion.options}
            value={answers[currentQuestion.id] ?? ""}
            onChange={(value) => setAnswer(currentQuestion.id, value)}
          />

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={goPrev}
              disabled={isFirstStep}
              className="flex items-center gap-1 text-sm text-neutral-500 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
              이전
            </button>

            {/* Dot Indicators */}
            <div className="flex items-center gap-1.5">
              {questions.map((_, i) => (
                <div
                  key={questions[i].id}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    i === currentStep ? "bg-primary-500" : "bg-neutral-200"
                  }`}
                />
              ))}
            </div>

            {isLastStep ? (
              <button
                type="button"
                onClick={() => generateBlog(recordId)}
                disabled={!allAnswered}
                className="flex items-center gap-1 text-sm font-semibold text-primary-500 disabled:opacity-30"
              >
                완료
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                disabled={!answers[currentQuestion.id]?.trim()}
                className="flex items-center gap-1 text-sm text-neutral-500 disabled:opacity-30"
              >
                다음
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
