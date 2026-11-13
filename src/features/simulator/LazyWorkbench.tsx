import { lazy, Suspense } from 'react';
import type { WorkbenchProps } from './Workbench';

const Impl = lazy(() => import('./Workbench').then((m) => ({ default: m.Workbench })));

/**
 * The workbench (machine panel + ladder editor + PLC engine) is the heaviest part of the app, so pages load
 * it as its own chunk: the page heading and instructions paint first, the workbench fills in below.
 * The placeholder holds roughly the workbench's height so the page doesn't jump when it arrives.
 */
export function Workbench(props: WorkbenchProps) {
  return (
    <Suspense fallback={<div className="workbench-skeleton" role="status" aria-busy="true" aria-label="Loading the workbench"><div className="skeleton" /><div className="skeleton" /></div>}>
      <Impl {...props} />
    </Suspense>
  );
}
