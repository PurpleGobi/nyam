import { BubbleSettingsPageContainer } from '@/presentation/containers/bubble-settings-page-container'

interface Props {
  params: Promise<{ id: string }>
}

export default async function BubbleSettingsPage({ params }: Props) {
  const { id } = await params
  return <BubbleSettingsPageContainer bubbleId={id} />
}
