import { BubbleDetailContainer } from '@/presentation/containers/bubble-detail-container'

interface Props {
  params: Promise<{ id: string }>
}

export default async function BubbleDetailPage({ params }: Props) {
  const { id } = await params
  return <BubbleDetailContainer bubbleId={id} />
}
