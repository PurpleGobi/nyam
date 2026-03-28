import { BubblerProfileContainer } from '@/presentation/containers/bubbler-profile-container'

interface Props {
  params: Promise<{ id: string; userId: string }>
}

export default async function BubblerProfilePage({ params }: Props) {
  const { id, userId } = await params
  return <BubblerProfileContainer userId={userId} bubbleId={id} />
}
