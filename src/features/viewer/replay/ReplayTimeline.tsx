/**
 * WS-E. Bottom replay bar (shown while playback.enabled): runs the replay clock, play/pause, ±5 s,
 * scrubber with walked-trail fill, speed, first-person ↔ overview, live reveal, and the calibration
 * popover that lines the 3D walk up with the front video.
 * Keys: Space play/pause · ←/→ ±5 s · F first person · Esc leaves first person.
 */
import {Popover, PopoverButton, PopoverPanel} from '@headlessui/react';
import {
  Footprints,
  Pause,
  Play,
  RotateCcw,
  ScanEye,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  View,
  X,
} from 'lucide-react';
import {useEffect, useMemo} from 'react';
import {cn} from '@/lib/cn';
import {fmtDistance, fmtDuration} from '@/lib/format';
import type {Trajectory} from '@/types';
import {Field, Segmented, Slider, Switch} from '../core/controls';
import {usePlotData} from '../PlotDataContext';
import {type PlaybackSpeed, useViewerStore} from '../store';
import {seekTo, useReplayClock} from './replayClock';
import {useReplayUi} from './replayUi';
import {getPath, indexAt} from './trajectoryPath';
import {effectiveIntrinsics, hfovOf, vfovOf} from './videoProjection';

const VIDEO_FPS = 15;
const SPEEDS: PlaybackSpeed[] = [0.5, 1, 2, 4];

export function ReplayTimeline() {
  const {manifest, trajectory} = usePlotData();
  const loadForPlot = useReplayUi((s) => s.loadForPlot);
  useEffect(() => loadForPlot(manifest.id), [loadForPlot, manifest.id]);
  const enabled = useViewerStore((s) => s.playback.enabled);
  if (!trajectory) return null;
  return <Timeline trajectory={trajectory} enabled={enabled} />;
}

export function useVideoOffset(trajectory: Trajectory) {
  const extra = useReplayUi((s) => s.calibration.timeOffsetS);
  return (trajectory.videoOffsetS ?? 0) + extra;
}

function Timeline({trajectory, enabled}: {trajectory: Trajectory; enabled: boolean}) {
  const path = useMemo(() => getPath(trajectory), [trajectory]);
  const duration = path.duration;
  const offset = useVideoOffset(trajectory);
  useReplayClock(enabled, duration, offset, VIDEO_FPS);

  const playback = useViewerStore((s) => s.playback);
  const setPlayback = useViewerStore((s) => s.setPlayback);
  const cameraMode = useViewerStore((s) => s.cameraMode);
  const setCameraMode = useViewerStore((s) => s.setCameraMode);
  const firstPerson = cameraMode === 'follow';

  const togglePlay = () => togglePlayback(offset, duration);
  const skip = (d: number) => seekTo(useViewerStore.getState().playback.t + d, offset, duration);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select')) return;
      const mode = useViewerStore.getState().cameraMode;
      if (mode === 'walk') return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayback(offset, duration);
      } else if (e.key === 'ArrowLeft') seekTo(useViewerStore.getState().playback.t - 5, offset, duration);
      else if (e.key === 'ArrowRight') seekTo(useViewerStore.getState().playback.t + 5, offset, duration);
      else if (e.key.toLowerCase() === 'f') setCameraMode(mode === 'follow' ? 'orbit' : 'follow');
      else if (e.key === 'Escape' && mode === 'follow') setCameraMode('orbit');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, offset, duration, setCameraMode]);

  if (!enabled) return null;

  const close = () => {
    setPlayback({enabled: false, playing: false});
    if (useViewerStore.getState().cameraMode === 'follow') setCameraMode('orbit');
  };
  const pct = (playback.t / duration) * 100;
  const walked = path.dist[indexAt(path, playback.t)];

  return (
    <div className="pointer-events-none absolute right-3 bottom-3 left-60 z-20 flex justify-center">
      <div className="glass-panel pointer-events-auto flex w-full max-w-4xl items-center gap-2 rounded-2xl px-3 py-2">
        <IconBtn label="Back 5 s (←)" onClick={() => skip(-5)}>
          <SkipBack size={16} />
        </IconBtn>
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playback.playing ? 'Pause (Space)' : 'Play (Space)'}
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-brand text-white shadow hover:bg-brand-hover"
        >
          {playback.playing ? (
            <Pause size={18} fill="currentColor" />
          ) : (
            <Play size={18} fill="currentColor" className="ml-0.5" />
          )}
        </button>
        <IconBtn label="Forward 5 s (→)" onClick={() => skip(5)}>
          <SkipForward size={16} />
        </IconBtn>

        <div className="fd-mono w-24 shrink-0 text-center text-xs text-fg">
          {fmtDuration(playback.t)} <span className="text-fg-subtle">/ {fmtDuration(duration)}</span>
        </div>

        <div className="relative flex h-6 min-w-24 flex-1 items-center">
          <div className="absolute inset-x-0 h-1.5 rounded-full bg-surface-3" />
          <div
            className="absolute left-0 h-1.5 rounded-full"
            style={{width: `${pct}%`, background: 'linear-gradient(90deg, #14b8a6, #f57e26)'}}
          />
          <input
            type="range"
            aria-label="Replay position"
            min={0}
            max={duration}
            step={0.01}
            value={playback.t}
            onChange={(e) => seekTo(Number(e.target.value), offset, duration)}
            className="relative h-6 w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-farmevo [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-farmevo [&::-webkit-slider-thumb]:shadow"
          />
        </div>

        <div className="hidden shrink-0 text-[11px] text-fg-muted xl:block">{fmtDistance(walked)} walked</div>

        <div className="w-36 shrink-0">
          <Segmented<string>
            value={String(playback.speed)}
            onChange={(v) => setPlayback({speed: Number(v) as PlaybackSpeed})}
            options={SPEEDS.map((s) => ({id: String(s), label: `${s}×`}))}
          />
        </div>

        <div className="mx-1 h-6 w-px bg-border-subtle" />
        <button
          type="button"
          onClick={() => setCameraMode(firstPerson ? 'orbit' : 'follow')}
          title="First person: walk the cloud as in the video (F)"
          className={cn(
            'flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors',
            firstPerson ? 'bg-brand text-white' : 'text-fg hover:bg-surface-hover',
          )}
        >
          {firstPerson ? <Footprints size={15} /> : <View size={15} />}
          {firstPerson ? 'First person' : 'Overview'}
        </button>
        <IconBtn
          label={playback.reveal ? 'Live reveal on' : 'Live reveal: show the cloud as it was captured'}
          active={playback.reveal}
          onClick={() => setPlayback({reveal: !playback.reveal})}
        >
          <ScanEye size={16} />
        </IconBtn>
        <CalibrationPopover />
        <IconBtn label="Close replay" onClick={close}>
          <X size={16} />
        </IconBtn>
      </div>
    </div>
  );
}

function togglePlayback(offset: number, duration: number) {
  const s = useViewerStore.getState().playback;
  if (!s.playing && s.t >= duration - 0.05) seekTo(0, offset, duration);
  useViewerStore.getState().setPlayback({playing: !s.playing});
}

function IconBtn({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors',
        active ? 'bg-brand text-white' : 'text-fg-muted hover:bg-surface-hover hover:text-fg',
      )}
    >
      {children}
    </button>
  );
}

function CalibrationPopover() {
  const cal = useReplayUi((s) => s.calibration);
  const set = useReplayUi((s) => s.setCalibration);
  const reset = useReplayUi((s) => s.resetCalibration);
  const frame = 1 / VIDEO_FPS;
  return (
    <Popover className="relative">
      <PopoverButton
        title="Calibrate first-person view against the video"
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-fg-muted hover:bg-surface-hover hover:text-fg data-[open]:bg-brand-soft data-[open]:text-brand"
      >
        <SlidersHorizontal size={16} />
      </PopoverButton>
      <PopoverPanel
        anchor={{to: 'top end', gap: 12}}
        className="glass-panel z-40 w-72 space-y-3 rounded-xl p-3 text-sm shadow-xl"
      >
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Match the video</div>
          <button
            type="button"
            onClick={reset}
            className="flex cursor-pointer items-center gap-1 text-[11px] text-fg-muted hover:text-fg"
          >
            <RotateCcw size={12} /> Reset
          </button>
        </div>
        <Field label="Time offset" value={`${cal.timeOffsetS >= 0 ? '+' : ''}${cal.timeOffsetS.toFixed(2)} s`}>
          <div className="flex items-center gap-2">
            <NudgeBtn onClick={() => set({timeOffsetS: +(cal.timeOffsetS - frame).toFixed(3)})}>−1f</NudgeBtn>
            <Slider value={cal.timeOffsetS} min={-5} max={5} step={0.01} onChange={(v) => set({timeOffsetS: v})} />
            <NudgeBtn onClick={() => set({timeOffsetS: +(cal.timeOffsetS + frame).toFixed(3)})}>+1f</NudgeBtn>
          </div>
        </Field>
        <Field label="Heading" value={`${cal.headingOffsetDeg.toFixed(0)}°`}>
          <Slider
            value={cal.headingOffsetDeg}
            min={-45}
            max={45}
            step={1}
            onChange={(v) => set({headingOffsetDeg: v})}
          />
        </Field>
        <Field label="Camera tilt" value={`${cal.pitchDeg.toFixed(0)}°`}>
          <Slider value={cal.pitchDeg} min={-35} max={20} step={1} onChange={(v) => set({pitchDeg: v})} />
        </Field>
        <FovFields />
        <Field label="Eye height" value={`${cal.heightOffsetM >= 0 ? '+' : ''}${cal.heightOffsetM.toFixed(2)} m`}>
          <Slider value={cal.heightOffsetM} min={-1} max={1} step={0.05} onChange={(v) => set({heightOffsetM: v})} />
        </Field>
        <p className="text-[11px] leading-snug text-fg-subtle">
          Pause on a distinctive tree, then adjust until it sits in the same place in the video and the 3D view. Saved
          for this plot in this browser.
        </p>
        <RevealSwitch />
        <FrameSwitch />
      </PopoverPanel>
    </Popover>
  );
}

/** H / V field of view: default from the plot's camera.json; dragging overrides, ↺ returns to it. */
function FovFields() {
  const {camera} = usePlotData();
  const cal = useReplayUi((s) => s.calibration);
  const set = useReplayUi((s) => s.setCalibration);
  const k = effectiveIntrinsics(camera, cal);
  const h = hfovOf(k);
  const v = vfovOf(k);
  const source = camera ? 'camera.json' : 'default';
  return (
    <>
      <FovField
        label="Horizontal FOV"
        value={h}
        overridden={cal.hfovDeg != null}
        source={source}
        min={40}
        max={130}
        onChange={(x) => set({hfovDeg: x})}
        onReset={() => set({hfovDeg: null})}
      />
      <FovField
        label="Vertical FOV"
        value={v}
        overridden={cal.vfovDeg != null}
        source={source}
        min={25}
        max={100}
        onChange={(x) => set({vfovDeg: x})}
        onReset={() => set({vfovDeg: null})}
      />
    </>
  );
}

function FovField(props: {
  label: string;
  value: number;
  overridden: boolean;
  source: string;
  min: number;
  max: number;
  onChange: (v: number) => void;
  onReset: () => void;
}) {
  return (
    <Field
      label={props.label}
      value={
        <span className="flex items-center gap-1.5">
          {props.overridden ? (
            <button
              type="button"
              title={`Back to ${props.source}`}
              onClick={props.onReset}
              className="cursor-pointer text-fg-muted hover:text-fg"
            >
              <RotateCcw size={11} />
            </button>
          ) : (
            <span className="font-sans text-[10px] text-brand">{props.source}</span>
          )}
          {props.value.toFixed(2)}°
        </span>
      }
    >
      <Slider value={props.value} min={props.min} max={props.max} step={0.1} onChange={props.onChange} />
    </Field>
  );
}

function FrameSwitch() {
  const showFrame = useReplayUi((s) => s.showFrame);
  const setShowFrame = useReplayUi((s) => s.setShowFrame);
  return <Switch label="Show the video's frame in 3D" checked={showFrame} onChange={setShowFrame} />;
}

function RevealSwitch() {
  const reveal = useViewerStore((s) => s.playback.reveal);
  const setPlayback = useViewerStore((s) => s.setPlayback);
  return <Switch label="Live reveal of the point cloud" checked={reveal} onChange={(v) => setPlayback({reveal: v})} />;
}

function NudgeBtn({onClick, children}: {onClick: () => void; children: React.ReactNode}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fd-mono shrink-0 cursor-pointer rounded-md bg-surface-3 px-1.5 py-0.5 text-[10px] text-fg-muted hover:text-fg"
    >
      {children}
    </button>
  );
}
