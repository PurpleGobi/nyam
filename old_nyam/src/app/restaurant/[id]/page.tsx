import { RestaurantDetailContainer } from '@/presentation/containers/restaurant-detail-container';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RestaurantDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <RestaurantDetailContainer id={id} />;
}
