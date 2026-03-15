import { Suspense } from 'react';
import { PromptsContainer } from '@/presentation/containers/prompts-container';

export default function PromptsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center"><p className="text-neutral-400">로딩 중...</p></div>}>
      <PromptsContainer />
    </Suspense>
  );
}
