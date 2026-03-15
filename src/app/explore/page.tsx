import { Suspense } from 'react';
import { ExploreContainer } from '@/presentation/containers/explore-container';

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center"><p className="text-neutral-400">로딩 중...</p></div>}>
      <ExploreContainer />
    </Suspense>
  );
}
