/**
 * WS-E. Camera feeds as a picture-in-picture window over the 3D view (shown while replaying).
 *  - Front: <video> at up to 4K. Plays the best rendition the browser can decode (4K HEVC → 4K H.264 →
 *    1080p → 720p); a decode error falls through to the next; "Auto" steps down if frames drop.
 *  - Left / Right / Back: "Camera offline" unless the manifest has them.
 *  - Sizes S / M / L, drag the header to snap to a corner, expand to fill the viewer.
 * The front <video> stays mounted during replay (even if the window is hidden) because it is the
 * replay's master clock (see replayClock.ts).
 */
import {GripHorizontal, Maximize2, Minimize2, VideoOff, X} from 'lucide-react';
import {useEffect, useMemo, useRef, useState} from 'react';
import {cn} from '@/lib/cn';
import type {CameraPosition, Trajectory} from '@/types';
import {usePlotData} from '../PlotDataContext';
import {useViewerStore} from '../store';
import {useVideoOffset} from './ReplayTimeline';
import {getFrontVideo, registerFrontVideo, toVideoTime} from './replayClock';
import {type PipCorner, type PipSize, useReplayUi, type VideoQuality} from './replayUi';
import {pickSource, type Source, sourcesFor, stepDown} from './videoSources';

const CAMERAS: {id: CameraPosition; label: string}[] = [
  {id: 'front', label: 'Front'},
  {id: 'left', label: 'Left'},
  {id: 'right', label: 'Right'},
  {id: 'back', label: 'Back'},
];
const NEXT_SIZE: Record<PipSize, PipSize> = {s: 'm', m: 'l', l: 's'};
const WIDTH: Record<PipSize, string> = {s: 'w-72', m: 'w-[30rem]', l: 'w-[44rem]'};
const CORNER: Record<PipCorner, string> = {
  tl: 'top-3 left-16',
  tr: 'top-3 right-3',
  bl: 'bottom-20 left-60',
  br: 'bottom-20 right-3',
};
const QUALITIES: {id: VideoQuality; label: string}[] = [
  {id: 'auto', label: 'Auto'},
  {id: 2160, label: '4K'},
  {id: 1080, label: '1080p'},
  {id: 720, label: '720p'},
];

export function CameraFeeds() {
  const {trajectory} = usePlotData();
  const enabled = useViewerStore((s) => s.playback.enabled);
  if (!enabled || !trajectory) return null;
  return <Pip trajectory={trajectory} />;
}

function Pip({trajectory}: {trajectory: Trajectory}) {
  const {plotDir, manifest} = usePlotData();
  const ui = useReplayUi();
  const firstPerson = useViewerStore((s) => s.cameraMode === 'follow');
  const offset = useVideoOffset(trajectory);
  const size: PipSize = firstPerson ? ui.pipSize : 's';
  const box = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{dx: number; dy: number} | null>(null);

  const startDrag = (e: React.PointerEvent) => {
    if (ui.pipExpanded || (e.target as HTMLElement).closest('button, select')) return;
    const el = box.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    const x0 = e.clientX;
    const y0 = e.clientY;
    const move = (ev: PointerEvent) => setDrag({dx: ev.clientX - x0, dy: ev.clientY - y0});
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const pr = parent.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const cx = (r.left + r.right) / 2;
      const cy = (r.top + r.bottom) / 2;
      const corner =
        `${cy < pr.top + pr.height / 2 ? 't' : 'b'}${cx < pr.left + pr.width / 2 ? 'l' : 'r'}` as PipCorner;
      setDrag(null);
      ui.setPip({pipCorner: corner});
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const hidden = !ui.pipVisible;
  return (
    <div
      ref={box}
      className={cn(
        'absolute z-20 overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl transition-[width] duration-200',
        ui.pipExpanded ? 'inset-x-16 top-3 bottom-20' : [WIDTH[size], CORNER[ui.pipCorner]],
        hidden && 'pointer-events-none invisible',
      )}
      style={drag ? {transform: `translate(${drag.dx}px, ${drag.dy}px)`, transition: 'none'} : undefined}
    >
      <div
        onPointerDown={startDrag}
        className={cn(
          'flex h-8 items-center gap-1 bg-black/80 px-2 text-[11px] text-white/80 select-none',
          !ui.pipExpanded && 'cursor-grab active:cursor-grabbing',
        )}
      >
        {!ui.pipExpanded && <GripHorizontal size={13} className="text-white/40" />}
        <div className="flex gap-0.5">
          {CAMERAS.map((c) => {
            const live = !!(manifest.files.videoRenditions?.[c.id]?.length || manifest.files.video?.[c.id]);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => ui.setPip({pipCamera: c.id})}
                className={cn(
                  'flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5',
                  ui.pipCamera === c.id ? 'bg-white/15 text-white' : 'hover:text-white',
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', live ? 'bg-[#e3412b]' : 'bg-white/30')} />
                {c.label}
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <select
            aria-label="Video quality"
            value={String(ui.quality)}
            onChange={(e) =>
              ui.setQuality(e.target.value === 'auto' ? 'auto' : (Number(e.target.value) as VideoQuality))
            }
            className="cursor-pointer rounded bg-white/10 px-1 py-0.5 text-[11px] text-white outline-none"
          >
            {QUALITIES.map((q) => (
              <option key={q.id} value={String(q.id)} className="text-black">
                {q.label}
              </option>
            ))}
          </select>
          {firstPerson && !ui.pipExpanded && (
            <button
              type="button"
              title="Window size"
              onClick={() => ui.setPip({pipSize: NEXT_SIZE[ui.pipSize]})}
              className="fd-mono w-6 cursor-pointer rounded px-1 py-0.5 uppercase hover:bg-white/15"
            >
              {ui.pipSize}
            </button>
          )}
          <button
            type="button"
            title={ui.pipExpanded ? 'Back to picture-in-picture' : 'Expand video'}
            onClick={() => ui.setPip({pipExpanded: !ui.pipExpanded})}
            className="cursor-pointer rounded p-1 hover:bg-white/15"
          >
            {ui.pipExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button
            type="button"
            title="Hide camera"
            onClick={() => ui.setPip({pipVisible: false, pipExpanded: false})}
            className="cursor-pointer rounded p-1 hover:bg-white/15"
          >
            <X size={13} />
          </button>
        </div>
      </div>
      <div className={cn('relative bg-black', ui.pipExpanded ? 'h-[calc(100%-2rem)]' : 'aspect-video')}>
        <FrontVideo plotDir={plotDir} offset={offset} visible={ui.pipCamera === 'front'} />
        {ui.pipCamera !== 'front' && (
          <Offline label={`${CAMERAS.find((c) => c.id === ui.pipCamera)?.label} camera offline`} />
        )}
        <CaptureClock captureDate={manifest.captureDate} />
      </div>
    </div>
  );
}

function FrontVideo({plotDir, offset, visible}: {plotDir: string; offset: number; visible: boolean}) {
  const {manifest} = usePlotData();
  const quality = useReplayUi((s) => s.quality);
  const setActiveRendition = useReplayUi((s) => s.setActiveRendition);
  const activeLabel = useReplayUi((s) => s.activeRendition);
  const sources = useMemo(() => sourcesFor(plotDir, manifest, 'front'), [plotDir, manifest]);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const [autoCap, setAutoCap] = useState<number | null>(null);

  const usableSources = useMemo(
    () => (quality === 'auto' && autoCap ? sources.filter((s) => s.height === 0 || s.height <= autoCap) : sources),
    [sources, quality, autoCap],
  );
  const source: Source | null = pickSource(usableSources, quality, failed);

  useEffect(() => setActiveRendition(source?.label ?? null), [source, setActiveRendition]);
  useEffect(() => () => registerFrontVideo(null), []);

  // Auto quality: if more than a quarter of frames are dropped over a few seconds, step down once.
  useEffect(() => {
    if (quality !== 'auto' || !source) return;
    let prev = {dropped: 0, total: 0};
    const id = window.setInterval(() => {
      const v = getFrontVideo();
      if (!v || v.paused || !v.getVideoPlaybackQuality) return;
      const q = v.getVideoPlaybackQuality();
      const total = q.totalVideoFrames - prev.total;
      const dropped = q.droppedVideoFrames - prev.dropped;
      prev = {dropped: q.droppedVideoFrames, total: q.totalVideoFrames};
      if (total >= 20 && dropped / total > 0.25) {
        const lower = stepDown(sources, source, failed);
        if (lower) setAutoCap(lower.height);
      }
    }, 3000);
    return () => window.clearInterval(id);
  }, [quality, source, sources, failed]);

  if (!sources.length) return <Offline label="No front video in this export" />;
  if (!source) return <Offline label="This browser can't decode any rendition of the front video" />;

  return (
    <>
      <video
        key={source.url}
        ref={registerFrontVideo}
        src={source.url}
        muted
        playsInline
        preload="auto"
        className={cn('absolute inset-0 h-full w-full object-contain', !visible && 'invisible')}
        onLoadedMetadata={(e) => {
          const t = useViewerStore.getState().playback.t;
          const vt = toVideoTime(t, offset);
          if (vt >= 0 && vt < e.currentTarget.duration) e.currentTarget.currentTime = vt;
        }}
        onError={() => setFailed((f) => new Set(f).add(source.url))}
      />
      {visible && activeLabel && (
        <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white/90">
          {activeLabel}
        </span>
      )}
    </>
  );
}

/** Wall-clock time of the capture at the current replay position, like a camera OSD. */
function CaptureClock({captureDate}: {captureDate: string}) {
  const t = useViewerStore((s) => Math.floor(s.playback.t));
  const start = Date.parse(captureDate);
  if (!Number.isFinite(start)) return null;
  const d = new Date(start + t * 1000);
  return (
    <span className="fd-mono pointer-events-none absolute top-1.5 right-1.5 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white/90">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#e3412b]" />
      {d.toLocaleTimeString('en-GB', {hour12: false})}
    </span>
  );
}

function Offline({label}: {label: string}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[repeating-linear-gradient(135deg,#111_0_12px,#161616_12px_24px)] text-xs text-white/50">
      <VideoOff size={20} />
      {label}
    </div>
  );
}
