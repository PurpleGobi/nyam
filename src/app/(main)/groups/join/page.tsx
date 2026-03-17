import { Suspense } from "react"
import { GroupJoinContainer } from "@/presentation/containers/group-join-container"

export default function GroupJoinPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    }>
      <GroupJoinContainer />
    </Suspense>
  )
}
