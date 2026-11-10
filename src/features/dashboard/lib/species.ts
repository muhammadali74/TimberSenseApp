/** WS-I. Deterministic species composition per project (stems share). */
import {catalog} from '@/data/catalog';
import type {Project} from '@/types';

/** Every species in the catalog, in a fixed order — drives categorical colour assignment. */
export const ALL_SPECIES: string[] = [...new Set(catalog.flatMap((p) => p.species))];

const SPLITS: Record<number, number[]> = {1: [1], 2: [0.64, 0.36], 3: [0.48, 0.32, 0.2]};

export function speciesShares(project: Project): {species: string; share: number}[] {
  const w = SPLITS[project.species.length] ?? project.species.map(() => 1 / project.species.length);
  return project.species.map((species, i) => ({species, share: w[i]}));
}
