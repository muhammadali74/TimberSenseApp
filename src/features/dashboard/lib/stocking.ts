/** WS-I. Stocking status vs the project's SPH target. */
import type {Project} from '@/types';

export type StockingClass = 'stocked' | 'satisfactory' | 'below' | 'unknown';

export const STOCKING_LABEL: Record<StockingClass, string> = {
  stocked: 'Stocked',
  satisfactory: 'Satisfactory',
  below: 'Below target',
  unknown: 'Not assessed',
};

export const STOCKING_STATUS_KEY = {
  stocked: 'good',
  satisfactory: 'warning',
  below: 'critical',
  unknown: 'neutral',
} as const;

export function stockingClass(project: Project, sph: number | null): StockingClass {
  if (sph == null) return 'unknown';
  const r = sph / project.targets.sph;
  if (r >= 1) return 'stocked';
  if (r >= 0.8) return 'satisfactory';
  return 'below';
}
