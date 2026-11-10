/**
 * Contract §5.3 — point cloud (`cloud.json` header + `cloud.bin` struct-of-arrays).
 * All positions are float32 in the plot frame (§5.1): metres, Z-up, origin at plot centre on the ground.
 */

export type CloudAttributeName = 'position' | 'color' | 'semantic' | 'instance' | 'hag' | 'tSeen';
export type CloudAttributeType = 'float32' | 'uint8' | 'uint16';

export interface CloudAttribute {
  name: CloudAttributeName;
  type: CloudAttributeType;
  size: 1 | 3;
  /** Byte offset into cloud.bin — always 4-byte aligned. */
  byteOffset: number;
  byteLength: number;
}

export type SemanticClass = 'ground' | 'wood' | 'leaves';

export interface CloudHeader {
  version: 1;
  count: number;
  bbox: {min: [number, number, number]; max: [number, number, number]};
  classes: Record<number, SemanticClass>;
  attributes: CloudAttribute[];
  /** Reserved for octree LOD (later); ignore if absent. */
  lod?: Array<{file: string; count: number}>;
}

/** Sentinel for `tSeen` — point never within sensor range. */
export const T_SEEN_NEVER = 65535;
/** `tSeen` unit: 0.1 s since trajectory start. */
export const T_SEEN_SCALE_S = 0.1;
/** `hag` unit: centimetres. */
export const HAG_SCALE_M = 0.01;
/** `instance` value for "not a tree". */
export const INSTANCE_NONE = 0;

/** Typed views over a loaded cloud.bin. */
export interface CloudData {
  header: CloudHeader;
  position: Float32Array;
  color: Uint8Array;
  semantic: Uint8Array;
  instance: Uint16Array;
  hag: Uint16Array;
  tSeen: Uint16Array;
}
