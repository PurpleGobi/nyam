import { BubblerProfileContainer } from '@/presentation/containers/bubbler-profile-container'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string; bubble?: string }>
}

export default async function BubblerProfilePage({ params, searchParams }: Props) {
  const { id } = await params
  const { bubble } = await searchParams
  return <BubblerProfileContainer userId={id} bubbleId={bubble ?? null} />
}
