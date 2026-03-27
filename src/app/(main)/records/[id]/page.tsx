import { RecordDetailContainer } from '@/presentation/containers/record-detail-container'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RecordDetailPage({ params }: Props) {
  const { id } = await params
  return <RecordDetailContainer recordId={id} />
}
