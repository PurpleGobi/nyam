import { WineDetailContainer } from '@/presentation/containers/wine-detail-container'

interface Props {
  params: Promise<{ id: string }>
}

export default async function WineDetailPage({ params }: Props) {
  const { id } = await params
  return <WineDetailContainer wineId={id} />
}
