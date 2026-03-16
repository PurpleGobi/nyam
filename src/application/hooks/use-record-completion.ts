'use client'

import { useState, useCallback, useEffect } from 'react'
import useSWR from 'swr'
import { createClient } from '@/infrastructure/supabase/client'
import { getRecordRepository } from '@/di/repositories'
import type { AiQuestion, BlogSection } from '@/domain/entities/record'

export type CompletionStep = 'loading' | 'questions' | 'generating' | 'preview' | 'saving' | 'complete'

interface BlogContent {
  title: string
  sections: BlogSection[]
  summary: string
  recommendFor: string[]
}

export function useRecordCompletion(recordId: string | undefined) {
  const recordRepo = getRecordRepository()

  const { data: record, isLoading: recordLoading, mutate: mutateRecord } = useSWR(
    recordId ? ['record', recordId] : null,
    () => recordRepo.getById(recordId!),
  )

  // Fetch photo URLs for preview
  const { data: photoUrls } = useSWR(
    recordId ? ['record-photos', recordId] : null,
    async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('record_photos')
        .select('photo_url, order_index')
        .eq('record_id', recordId!)
        .order('order_index', { ascending: true })
      return (data ?? []).map(p => p.photo_url)
    },
  )

  const [step, setStep] = useState<CompletionStep>('loading')
  const [questions, setQuestions] = useState<AiQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [blog, setBlog] = useState<BlogContent | null>(null)
  const [xpEarned, setXpEarned] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const fetchQuestions = useCallback(async () => {
    if (!recordId) return
    setError(null)

    try {
      const res = await fetch('/api/records/generate-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId, answers: {} }),
      })

      const data = await res.json()
      if (!data.success) {
        setError(data.error ?? 'AI 질문 생성에 실패했습니다')
        return
      }

      setQuestions(data.questions)
      setStep('questions')
    } catch {
      setError('네트워크 오류가 발생했습니다')
    }
  }, [recordId])

  const setAnswer = useCallback((questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }, [])

  const generateBlog = useCallback(async () => {
    if (!recordId) return
    setStep('generating')
    setError(null)

    try {
      // Map answers from question IDs to question text for better context
      const mappedAnswers: Record<string, string> = {}
      for (const q of questions) {
        const answer = answers[q.id]
        if (answer) {
          mappedAnswers[q.question] = answer
        }
      }

      const res = await fetch('/api/records/generate-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId, answers: mappedAnswers }),
      })

      const data = await res.json()
      if (!data.success) {
        setError(data.error ?? 'AI 블로그 생성에 실패했습니다')
        setStep('questions')
        return
      }

      setBlog(data.blog)
      setStep('preview')
    } catch {
      setError('네트워크 오류가 발생했습니다')
      setStep('questions')
    }
  }, [recordId, questions, answers])

  const saveBlog = useCallback(async () => {
    if (!recordId || !blog || !record) return
    setStep('saving')
    setError(null)

    try {
      const supabase = createClient()

      // Upsert journal with blog content
      await supabase
        .from('record_journals' as never)
        .upsert({
          record_id: recordId,
          blog_title: blog.title,
          blog_content: blog.sections.filter(s => s.type === 'text').map(s => s.content).join('\n\n'),
          blog_sections: blog.sections,
          ai_questions: questions,
          user_answers: answers,
          published: false,
        } as never, { onConflict: 'record_id' } as never)

      // Update record phase_status to 2
      await supabase
        .from('records')
        .update({
          phase_status: 2,
          phase2_completed_at: new Date().toISOString(),
        } as never)
        .eq('id', recordId)

      // Award 15 XP via phase_completions
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('phase_completions' as never)
          .insert({
            user_id: user.id,
            record_id: recordId,
            phase: 2,
            xp_earned: 15,
          } as never)

        // Update user_stats points
        const { data: completions } = await supabase
          .from('phase_completions' as never)
          .select('xp_earned' as never)
          .eq('user_id' as never, user.id as never)

        if (completions) {
          const totalPoints = (completions as Array<{ xp_earned: number }>).reduce(
            (sum, c) => sum + c.xp_earned,
            0,
          )
          await supabase
            .from('user_stats')
            .update({ points: totalPoints } as never)
            .eq('user_id', user.id)
        }
      }

      setXpEarned(15)
      await mutateRecord()
      setStep('complete')
    } catch {
      setError('저장에 실패했습니다')
      setStep('preview')
    }
  }, [recordId, blog, record, questions, answers, mutateRecord])

  // Auto-fetch questions when record is loaded
  useEffect(() => {
    if (record && !recordLoading && step === 'loading') {
      fetchQuestions()
    }
  }, [record, recordLoading, step, fetchQuestions])

  return {
    step,
    record,
    photoUrls: photoUrls ?? [],
    questions,
    answers,
    blog,
    xpEarned,
    error,
    isLoading: recordLoading,
    setAnswer,
    generateBlog,
    saveBlog,
    fetchQuestions,
  }
}
