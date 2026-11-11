/**
 * WS-F. Cinematic overlay while a flythrough runs: letterbox bars, play/pause, scrubber, record,
 * exit. Controls fade out after a few seconds without mouse movement while playing.
 * Keys: Space play/pause · Esc exit. Tour stops show an info card for the featured tree.
 */
import {Circle, Pause, Play, Square, X} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {cn} from '@/lib/cn';
import {fmtDbh, fmtDuration, fmtHeight, fmtVolume} from '@/lib/format';
import {usePlotData} from '../PlotDataContext';
import {useViewerStore} from '../store';
import {exitFlythrough, PRESET_LABELS, useFlythroughUi} from './flythroughUi';
import {canRecord, startRecording, stopRecording} from './recorder';

const IDLE_MS = 2500;

function useIdle(enabled: boolean): boolean {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    if (!enabled) {
      setIdle(false);
      return;
    }
    let timer = window.setTimeout(() => setIdle(true), IDLE_MS);
    const wake = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), IDLE_MS);
    };
    window.addEventListener('pointermove', wake);
    window.addEventListener('keydown', wake);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('keydown', wake);
    };
  }, [enabled]);
  return idle;
}

function TreeCard() {
  const {treesById} = usePlotData();
  const treeId = useFlythroughUi((s) => s.treeId);
  const stops = useFlythroughUi((s) => s.flight?.stops);
  const tree = treeId != null ? treesById.get(treeId) : undefined;
  if (!tree || !stops) return null;
  const rows: [string, string][] = [
    ['DBH', fmtDbh(tree.dbhCm)],
    ['Height', fmtHeight(tree.heightM)],
    ['Volume', fmtVolume(tree.volumeM3)],
  ];
  return (
    <div
      key={tree.id}
      className="glass-panel pointer-events-auto absolute top-[14%] left-6 w-56 animate-[toast-in_0.5s_ease-out] rounded-2xl p-4"
    >
      <div className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
        Stop {stops.indexOf(tree.id) + 1} of {stops.length}
      </div>
      <div className="mt-1 text-lg font-semibold text-fg">Tree #{tree.id}</div>
      <div className="text-xs text-fg-muted">{tree.species}</div>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-fg-muted">{k}</dt>
            <dd className="fd-mono text-right text-fg">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Controls() {
  const {manifest} = usePlotData();
  const preset = useViewerStore((s) => s.flythrough.preset);
  const playing = useViewerStore((s) => s.flythrough.playing);
  const progress = useViewerStore((s) => s.flythrough.progress);
  const setFlythrough = useViewerStore((s) => s.setFlythrough);
  const duration = useFlythroughUi((s) => s.flight?.duration ?? 0);
  const recording = useFlythroughUi((s) => s.recording);
  const seek = useFlythroughUi((s) => s.seek);
  const [shown, setShown] = useState(false);
  const idle = useIdle(playing);
  const hidden = idle && playing;

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const togglePlay = () => {
    const {flythrough} = useViewerStore.getState();
    if (!flythrough.playing && flythrough.progress >= 1) seek(0);
    setFlythrough({playing: !flythrough.playing});
  };
  const togglePlayRef = useRef(togglePlay);
  togglePlayRef.current = togglePlay;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select')) return;
      if (e.key === 'Escape') exitFlythrough();
      else if (e.key === ' ') {
        e.preventDefault();
        togglePlayRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Recording runs from the start to the end of the flight.
  const record = () => {
    if (recording) {
      stopRecording();
      useFlythroughUi.getState().setRecording(false);
      return;
    }
    const canvas = document.querySelector<HTMLCanvasElement>('.viewer-canvas-bg canvas');
    if (!canvas || !preset) return;
    seek(0);
    setFlythrough({playing: true, progress: 0});
    if (startRecording(canvas, `timbersense-${manifest.id}-${preset}`)) useFlythroughUi.getState().setRecording(true);
  };
  useEffect(() => {
    if (recording && progress >= 1) {
      stopRecording();
      useFlythroughUi.getState().setRecording(false);
    }
  }, [recording, progress]);
  useEffect(
    () => () => {
      stopRecording();
      useFlythroughUi.getState().setRecording(false);
    },
    [],
  );

  const bar = 'bg-black transition-[height] duration-700 ease-out';
  const fade = cn('transition-opacity duration-500', hidden ? 'opacity-0' : 'opacity-100');
  const btn =
    'pointer-events-auto flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white';

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between">
      <div className={cn(bar, 'flex items-end justify-center', shown ? 'h-[9%]' : 'h-0')}>
        <div className={cn(fade, 'pb-2 text-xs font-medium uppercase tracking-[0.25em] text-white/70')}>
          {preset ? PRESET_LABELS[preset] : ''}
          {recording && <span className="ml-3 text-red-400 normal-case tracking-normal">● recording</span>}
        </div>
      </div>
      <TreeCard />
      <div className={cn(bar, 'flex items-center', shown ? 'h-[11%] min-h-14' : 'h-0')}>
        <div className={cn(fade, 'flex w-full items-center gap-3 px-5')}>
          <button type="button" className={btn} onClick={togglePlay} title={playing ? 'Pause (Space)' : 'Play (Space)'}>
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(progress * 1000)}
            onChange={(e) => {
              const p = Number(e.target.value) / 1000;
              seek(p * duration);
              setFlythrough({progress: p});
            }}
            aria-label="Flythrough progress"
            className="pointer-events-auto h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/20 accent-brand [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            style={{
              background: `linear-gradient(90deg, var(--color-brand) ${progress * 100}%, rgb(255 255 255 / 0.2) ${progress * 100}%)`,
            }}
          />
          <span className="fd-mono w-24 text-right text-xs text-white/70">
            {fmtDuration(progress * duration)} / {fmtDuration(duration)}
          </span>
          {canRecord() && (
            <button
              type="button"
              className={btn}
              onClick={record}
              title={recording ? 'Stop recording (saves a .webm)' : 'Record the flythrough from the start (.webm)'}
            >
              {recording ? (
                <Square size={15} className="fill-red-500 text-red-500" />
              ) : (
                <Circle size={16} className="fill-red-500/80 text-red-500" />
              )}
            </button>
          )}
          <button type="button" className={btn} onClick={exitFlythrough} title="Exit (Esc)">
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function FlythroughControls() {
  const active = useViewerStore((s) => s.cameraMode === 'flythrough' && s.flythrough.preset != null);
  return active ? <Controls /> : null;
}
