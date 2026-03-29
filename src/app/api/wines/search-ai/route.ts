import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import { searchWineByName } from '@/infrastructure/api/gemini'
import type { WineSearchCandidate } from '@/infrastructure/api/gemini'

export interface WineSearchAIResponse {
  success: boolean
  candidates: WineSearchCandidate[]
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<WineSearchAIResponse>> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ success: false, candidates: [], error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = await request.json()
  const query = body.query as string

  if (!query || query.length < 2) {
    return NextResponse.json({ success: false, candidates: [], error: 'QUERY_TOO_SHORT' }, { status: 400 })
  }

  try {
    const candidates = await searchWineByName(query)
    return NextResponse.json({ success: true, candidates })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    return NextResponse.json({ success: false, candidates: [], error: message }, { status: 500 })
  }
}
