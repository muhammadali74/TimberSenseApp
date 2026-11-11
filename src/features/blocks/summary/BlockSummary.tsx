/** WS-I owns. Block summary tab content (PLAN.md §3.5). Placeholder rendered by WS-H's BlockPage. */
import {PlaceholderPage} from '@/components/ui';
import type {Block, Project} from '@/types';

export function BlockSummary({block}: {project: Project; block: Block}) {
  return <PlaceholderPage title={`${block.name} — summary`} owner="WS-I" />;
}
