import { Suspense } from 'react'
import { LoginContainer } from '@/presentation/containers/login-container'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContainer />
    </Suspense>
  )
}
