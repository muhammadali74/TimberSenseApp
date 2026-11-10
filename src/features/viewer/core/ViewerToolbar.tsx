/**
 * WS-B owns the toolbar frame and the core items. Other workstreams render their own buttons
 * through their `*ToolbarItems` component (already wired below) — no edits to this file needed.
 */
import {Pill} from '@/components/ui';
import {FlythroughToolbarItems} from '../flythrough/FlythroughToolbarItems';
import {ReplayToolbarItems} from '../replay/ReplayToolbarItems';
import {TreesToolbarItems} from '../trees/TreesToolbarItems';
import {CoreToolbarItems} from './CoreToolbarItems';

export function ViewerToolbar() {
  return (
    <div className="pointer-events-none absolute top-3 left-3 z-10 flex flex-col gap-2">
      <Pill className="pointer-events-auto flex-col items-stretch">
        <CoreToolbarItems />
        <TreesToolbarItems />
        <ReplayToolbarItems />
        <FlythroughToolbarItems />
      </Pill>
    </div>
  );
}
