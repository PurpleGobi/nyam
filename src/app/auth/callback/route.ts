import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/infrastructure/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    // Create user_profiles record on first login
    if (!error && data.user) {
      const { data: existing } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();

      if (!existing) {
        const meta = data.user.user_metadata;
        await supabase.from('user_profiles').insert({
          id: data.user.id,
          nickname: meta?.full_name ?? meta?.name ?? null,
          avatar_url: meta?.avatar_url ?? meta?.picture ?? null,
          preferred_ai: 'chatgpt',
          allergies: [],
          food_preferences: [],
          tier: 'explorer',
          total_verifications: 0,
          current_streak: 0,
          longest_streak: 0,
        });
      }
    }
  }

  return NextResponse.redirect(new URL('/', requestUrl.origin));
}
