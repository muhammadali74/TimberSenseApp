/**
 * Contract §5.5 — capture trajectory (`trajectory.json`).
 * Z is already placed on the DTM + sensor height; yaw is derived from velocity (no IMU orientation available).
 */

/** [t (s from 0), x, y, z, yaw (radians, CCW from +X)] */
export type TrajectorySample = [t: number, x: number, y: number, z: number, yaw: number];

export interface Trajectory {
  rateHz: number;
  durationS: number;
  sensorHeightM: number;
  /** video time = trajectory time + videoOffsetS */
  videoOffsetS: number;
  samples: TrajectorySample[];
}
