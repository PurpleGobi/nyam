import { WineDetailContainer } from '@/presentation/containers/wine-detail-container'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ bubble?: string }>
}

export default async function WineDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { bubble } = await searchParams
  return <WineDetailContainer wineId={id} bubbleId={bubble ?? null} />
}
