/**
 * Contract §5.4 — per-tree records (`trees.json`, an array of Tree).
 * Coordinates are in the plot frame (§5.1).
 */

export type QsmStatus = 'ok' | 'partial' | 'no_tree' | 'not_run';

export interface Tree {
  id: number;
  valid: boolean;
  rejectReason?: string;
  species: string;
  base: [number, number, number];
  top: [number, number, number];
  dbhCm: number | null;
  dbhCmQsm: number | null;
  /** Pipeline confidence grade, e.g. 'A' | 'B' | 'C' */
  dbhConfidence?: string;
  heightM: number | null;
  heightMQsm: number | null;
  basalAreaM2: number | null;
  volumeM3: number | null;
  biomassKg: number | null;
  /** 0.5 × biomass */
  carbonKg: number | null;
  /** 3.667 × carbon */
  co2eKg: number | null;
  crownRadiusM: number | null;
  stemTiltDeg: number | null;
  nnDistM: number | null;
  nnId: number | null;
  wellSpaced: boolean;
  thinRemove: boolean;
  qsmStatus: QsmStatus;
  nPoints: number;
  /**
   * DBH fit rings from the pipeline (`*_dbh_cylinders.ply`), bottom → top, in the plot frame.
   * Exact circles: centre, unit plane normal, radius. Absent when no DBH fit exists.
   */
  dbhRings?: DbhRing[];
  /** Index into `dbhRings` of the ring at the measured DBH height (≈1.3 m). */
  dbhRingIndex?: number;
  /** Relative to the plot directory. */
  thumbnail?: string;
  /** Relative to the plot directory. */
  qsmMesh?: string;
}

export interface DbhRing {
  center: [number, number, number];
  normal: [number, number, number];
  radiusM: number;
}

/** DBH is measured at breast height: 1.3 m above the stem base. */
export const BREAST_HEIGHT_M = 1.3;
