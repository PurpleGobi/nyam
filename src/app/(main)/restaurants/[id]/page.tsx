import { RestaurantDetailContainer } from "@/presentation/containers/restaurant-detail-container"

export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <RestaurantDetailContainer restaurantId={id} />
}
