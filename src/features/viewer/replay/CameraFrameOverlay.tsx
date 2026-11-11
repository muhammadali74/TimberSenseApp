/**
 * WS-E. In first person, outlines where the front video's frame falls on the 3D view (the canvas is
 * a different shape than the 16:9 video, so the 3D view shows a little beyond it). Uses the same
 * `frameRect` as the projection, so the outline is exactly the video's field of view.
 */
import {useEffect, useRef, useState} from 'react';
import {usePlotData} from '../PlotDataContext';
import {useViewerStore} from '../store';
import {useReplayUi} from './replayUi';
import {effectiveIntrinsics, frameRect, hfovOf, vfovOf} from './videoProjection';

export function CameraFrameOverlay() {
  const {camera} = usePlotData();
  const show = useViewerStore((s) => s.playback.enabled && s.cameraMode === 'follow');
  const showFrame = useReplayUi((s) => s.showFrame);
  const cal = useReplayUi((s) => s.calibration);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({w: 0, h: 0});

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({w: e.contentRect.width, h: e.contentRect.height}));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const k = effectiveIntrinsics(camera, cal);
  const r = size.w && size.h ? frameRect(k, size.w, size.h) : null;
  const visible = show && showFrame && r;

  return (
    <div ref={box} className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      {visible && (
        <div
          className="absolute rounded-sm border border-white/45 shadow-[0_0_0_9999px_rgba(0,0,0,0.18)]"
          style={{left: r.left, top: r.top, width: r.width, height: r.height}}
        >
          <span className="absolute top-1.5 left-1/2 -translate-x-1/2 rounded bg-black/45 px-1.5 py-0.5 text-[10px] text-white/85">
            Video frame · {hfovOf(k).toFixed(1)}° × {vfovOf(k).toFixed(1)}°
          </span>
        </div>
      )}
    </div>
  );
}
