import { RestaurantDetailContainer } from '@/presentation/containers/restaurant-detail-container'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RestaurantDetailPage({ params }: Props) {
  const { id } = await params
  return <RestaurantDetailContainer restaurantId={id} />
}
