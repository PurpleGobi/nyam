import { RestaurantDetailContainer } from '@/presentation/containers/restaurant-detail-container'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ bubble?: string }>
}

export default async function RestaurantDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { bubble } = await searchParams
  return <RestaurantDetailContainer restaurantId={id} bubbleId={bubble ?? null} />
}
