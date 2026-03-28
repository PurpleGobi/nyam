import { InviteLandingContainer } from '@/presentation/containers/invite-landing-container'

interface Props {
  params: Promise<{ code: string }>
}

export default async function InvitePage({ params }: Props) {
  const { code } = await params
  return <InviteLandingContainer inviteCode={code} />
}
