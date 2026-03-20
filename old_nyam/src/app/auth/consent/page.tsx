import { Suspense } from "react"
import { ConsentContainer } from "@/presentation/containers/consent-container"

export default function ConsentPage() {
  return (
    <Suspense>
      <ConsentContainer />
    </Suspense>
  )
}
