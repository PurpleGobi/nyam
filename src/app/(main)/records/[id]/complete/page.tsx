import { ReviewCompletionContainer } from "@/presentation/containers/review-completion-container"

export default async function RecordCompletePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ReviewCompletionContainer recordId={id} />
}
