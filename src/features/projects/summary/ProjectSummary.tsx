/** WS-I owns. Project summary tab content (PLAN.md §3.4). Phase placeholder rendered by WS-H's ProjectPage. */
import {PlaceholderPage} from '@/components/ui';
import type {Project} from '@/types';

export function ProjectSummary({project}: {project: Project}) {
  return <PlaceholderPage title={`${project.name} — summary`} owner="WS-I" />;
}
