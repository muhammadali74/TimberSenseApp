/**
 * WS-E. Picks which encoding of a camera video to play: the best rendition the browser can decode,
 * honouring the user's quality choice. 4K HEVC is tried first where the browser claims support;
 * a decode error at runtime marks it failed and the next rendition is used.
 */
import {plotUrl} from '@/lib/loaders';
import type {CameraPosition, PlotManifest, VideoRendition} from '@/types';
import type {VideoQuality} from './replayUi';

export interface Source extends VideoRendition {
  url: string;
  label: string;
}

const MIME: Record<VideoRendition['codec'], (h: number) => string> = {
  // HEVC Main, level 5.1 (4K30)
  hevc: () => 'video/mp4; codecs="hvc1.1.6.L153.B0"',
  // H.264 High; level 5.1 for 4K, 4.0 otherwise
  h264: (h) => `video/mp4; codecs="${h > 1080 ? 'avc1.640033' : 'avc1.640028'}"`,
};

export function canDecode(r: VideoRendition): boolean {
  const type = MIME[r.codec](r.height);
  if (typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported(type)) return true;
  return document.createElement('video').canPlayType(type) !== '';
}

export function sourcesFor(plotDir: string, manifest: PlotManifest, camera: CameraPosition): Source[] {
  const list: VideoRendition[] =
    manifest.files.videoRenditions?.[camera] ??
    (manifest.files.video?.[camera] ? [{src: manifest.files.video[camera], codec: 'h264', width: 0, height: 0}] : []);
  return list.map((r) => ({
    ...r,
    url: plotUrl(plotDir, r.src),
    label: r.height ? `${r.height >= 2160 ? '4K' : `${r.height}p`} ${r.codec === 'hevc' ? 'HEVC' : 'H.264'}` : 'Video',
  }));
}

/** First playable source for the requested quality ('auto' = best available). */
export function pickSource(sources: Source[], quality: VideoQuality, failed: Set<string>): Source | null {
  const ok = sources.filter((s) => !failed.has(s.url) && (s.height === 0 || canDecode(s)));
  if (!ok.length) return null;
  if (quality === 'auto') return ok[0];
  return ok.find((s) => s.height === quality) ?? ok.find((s) => s.height < quality) ?? ok[ok.length - 1];
}

/** Next lower-resolution source (for auto step-down when frames are being dropped). */
export function stepDown(sources: Source[], current: Source, failed: Set<string>): Source | null {
  return sources.find((s) => s.height < current.height && !failed.has(s.url) && canDecode(s)) ?? null;
}
