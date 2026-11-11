/**
 * Contract §5.5 — capture trajectory (`trajectory.json`).
 * Z is already placed on the DTM + sensor height. Yaw is the SLAM orientation's heading (lidar body +X,
 * from traj.tum) when `yawSource` is 'orientation', otherwise it is derived from the walking direction.
 */

/** [t (s from 0), x, y, z, yaw (radians, CCW from +X)] */
export type TrajectorySample = [t: number, x: number, y: number, z: number, yaw: number];

export interface Trajectory {
  rateHz: number;
  durationS: number;
  sensorHeightM: number;
  /** video time = trajectory time + videoOffsetS */
  videoOffsetS: number;
  /** Where yaw comes from; absent in older exports = 'velocity'. */
  yawSource?: 'orientation' | 'velocity';
  samples: TrajectorySample[];
}
