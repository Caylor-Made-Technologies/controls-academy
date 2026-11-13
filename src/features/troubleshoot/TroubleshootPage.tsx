import { lazy, Suspense } from 'react';
import { RouteHead } from '../../components/Brand';
import { SkeletonPage } from '../../components/Skeleton';

// Every machine's faults, the meter and the workbench live in this chunk; the heading paints before it arrives.
const HuntScreens = lazy(() => import('./HuntScreens'));

export default function TroubleshootPage({ huntId }: { huntId?: string }) {
  return (
    <>
      {!huntId && <RouteHead seg="troubleshoot" />}
      <Suspense fallback={<SkeletonPage />}>
        <HuntScreens huntId={huntId} />
      </Suspense>
    </>
  );
}
