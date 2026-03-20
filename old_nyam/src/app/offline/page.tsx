import { EmptyState } from "@/presentation/components/ui/empty-state"
import { WifiOff } from "lucide-react"

export default function OfflinePage() {
  return (
    <div className="px-4 pt-6 pb-4">
      <EmptyState
        icon={WifiOff}
        title="오프라인"
        description="인터넷 연결을 확인해주세요"
      />
    </div>
  )
}
