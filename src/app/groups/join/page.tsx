import { Suspense } from 'react'
import { GroupJoinContainer } from '@/presentation/containers/group-join-container'

export default function GroupJoinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center px-4 pt-20">
          <div className="h-48 w-full max-w-sm animate-pulse rounded-xl bg-[var(--color-neutral-100)]" />
        </div>
      }
    >
      <GroupJoinContainer />
    </Suspense>
  )
}
