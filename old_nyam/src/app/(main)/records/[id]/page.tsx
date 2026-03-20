import { RecordDetailContainer } from "@/presentation/containers/record-detail-container"

export default async function RecordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <RecordDetailContainer recordId={id} />
}
