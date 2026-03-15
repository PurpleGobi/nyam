'use client';

import { useAuth } from '@/application/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function LoginContainer() {
  const { user, isLoading, signIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !isLoading) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary-500)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-2">
        <h1
          className="text-4xl font-bold text-[var(--color-primary-500)]"
          style={{ fontFamily: 'var(--font-logo)' }}
        >
          nyam
        </h1>
        <p className="text-sm text-[var(--color-neutral-500)]">AI 검증 맛집 추천</p>
      </div>

      <div className="flex w-full max-w-[280px] flex-col gap-3">
        <button
          type="button"
          onClick={() => signIn('kakao')}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] text-sm font-semibold text-[#191919] transition-opacity hover:opacity-90"
        >
          카카오로 시작하기
        </button>
        <button
          type="button"
          onClick={() => signIn('google')}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-neutral-200)] bg-white text-sm font-semibold text-[var(--color-neutral-700)] transition-opacity hover:opacity-90"
        >
          Google로 시작하기
        </button>
      </div>
    </div>
  );
}
