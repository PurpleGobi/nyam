interface LoginButtonsProps {
  onSignIn: (provider: 'kakao' | 'google' | 'naver') => void
}

export function LoginButtons({ onSignIn }: LoginButtonsProps) {
  return (
    <div className="flex w-full max-w-[280px] flex-col gap-3">
      <button
        type="button"
        onClick={() => onSignIn('kakao')}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] text-sm font-semibold text-[#191919] transition-all hover:brightness-95 active:scale-[0.98]"
      >
        카카오로 시작하기
      </button>
      <button
        type="button"
        onClick={() => onSignIn('naver')}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#03C75A] text-sm font-semibold text-white transition-all hover:brightness-95 active:scale-[0.98]"
      >
        네이버로 시작하기
      </button>
      <button
        type="button"
        onClick={() => onSignIn('google')}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#F2F2F2] text-sm font-semibold text-[#1F1F1F] transition-all hover:brightness-95 active:scale-[0.98]"
      >
        Google로 시작하기
      </button>
    </div>
  )
}
