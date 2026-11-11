/**
 * Loaders for per-plot files (contracts §5.2–5.5). All paths are relative to the plot directory,
 * e.g. plotDir = '/data/plots/fariy_1_test'.
 */
import type {CameraIntrinsics, CloudAttribute, CloudData, CloudHeader, PlotManifest, Trajectory, Tree} from '@/types';

export function plotUrl(plotDir: string, relPath: string): string {
  return `${plotDir.replace(/\/$/, '')}/${relPath}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  // The dev server answers missing files with index.html (SPA fallback), so check the content type too.
  if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) {
    throw new Error(`Plot data not found at ${url}. Export it with tools/prepare_plot.py (or npm run sample).`);
  }
  return (await res.json()) as T;
}

export function loadManifest(plotDir: string): Promise<PlotManifest> {
  return fetchJson<PlotManifest>(plotUrl(plotDir, 'plot.json'));
}

export function loadTrees(plotDir: string, manifest: PlotManifest): Promise<Tree[]> {
  return fetchJson<Tree[]>(plotUrl(plotDir, manifest.files.trees));
}

export async function loadTrajectory(plotDir: string, manifest: PlotManifest): Promise<Trajectory | null> {
  if (!manifest.files.trajectory) return null;
  return fetchJson<Trajectory>(plotUrl(plotDir, manifest.files.trajectory));
}

/** Front-camera intrinsics, or null when the plot has none (or the file is missing). */
export async function loadCamera(plotDir: string, manifest: PlotManifest): Promise<CameraIntrinsics | null> {
  if (!manifest.files.camera) return null;
  try {
    return await fetchJson<CameraIntrinsics>(plotUrl(plotDir, manifest.files.camera));
  } catch {
    return null;
  }
}

const TYPED_ARRAYS = {float32: Float32Array, uint8: Uint8Array, uint16: Uint16Array} as const;

function view(buffer: ArrayBuffer, attr: CloudAttribute | undefined) {
  if (!attr) return undefined;
  const Ctor = TYPED_ARRAYS[attr.type];
  return new Ctor(buffer, attr.byteOffset, attr.byteLength / Ctor.BYTES_PER_ELEMENT);
}

/**
 * Loads cloud.json + cloud.bin and returns typed views (no copies).
 * `cloud` in the manifest points at the .json header; the .bin sits next to it.
 * WS-B may replace this with a worker-based streaming loader; keep the return type.
 */
export async function loadCloud(
  plotDir: string,
  manifest: PlotManifest,
  onProgress?: (loaded: number, total: number) => void,
): Promise<CloudData> {
  const headerUrl = plotUrl(plotDir, manifest.files.cloud);
  const header = await fetchJson<CloudHeader>(headerUrl);
  const binUrl = headerUrl.replace(/\.json$/, '.bin');

  const res = await fetch(binUrl);
  if (!res.ok || !res.body || (res.headers.get('content-type') ?? '').includes('html')) {
    throw new Error(`Point cloud not found at ${binUrl}.`);
  }
  const total = Number(res.headers.get('content-length')) || 0;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const {done, value} = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    onProgress?.(loaded, total);
  }
  const bytes = new Uint8Array(loaded);
  let o = 0;
  for (const c of chunks) {
    bytes.set(c, o);
    o += c.byteLength;
  }
  const buf = bytes.buffer;
  const get = (name: CloudAttribute['name']) => header.attributes.find((a) => a.name === name);
  const n = header.count;
  return {
    header,
    position: view(buf, get('position')) as Float32Array,
    color: (view(buf, get('color')) as Uint8Array | undefined) ?? new Uint8Array(n * 3).fill(200),
    semantic: (view(buf, get('semantic')) as Uint8Array | undefined) ?? new Uint8Array(n),
    instance: (view(buf, get('instance')) as Uint16Array | undefined) ?? new Uint16Array(n),
    hag: (view(buf, get('hag')) as Uint16Array | undefined) ?? new Uint16Array(n),
    tSeen: (view(buf, get('tSeen')) as Uint16Array | undefined) ?? new Uint16Array(n),
  };
}
