import { GroupDetailContainer } from "@/presentation/containers/group-detail-container"

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <GroupDetailContainer groupId={id} />
}
