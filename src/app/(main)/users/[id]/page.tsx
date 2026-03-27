import { BubblerProfileContainer } from '@/presentation/containers/bubbler-profile-container'

interface Props {
  params: Promise<{ id: string }>
}

export default async function BubblerProfilePage({ params }: Props) {
  const { id } = await params
  return <BubblerProfileContainer userId={id} />
}
