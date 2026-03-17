import { Suspense } from 'react'
import { CompatibilityContainer } from '@/presentation/containers/compatibility-container'

export default function CompatibilityPage() {
  return (
    <Suspense>
      <CompatibilityContainer />
    </Suspense>
  )
}
