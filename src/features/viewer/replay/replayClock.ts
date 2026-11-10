/**
 * WS-E. Replay clock. While the front video plays it is the master clock: requestVideoFrameCallback
 * reports the media time of each frame actually shown, and we extrapolate between frames so the
 * 3D camera moves at display rate (≤ 1 frame of error). Paused / scrubbing / no video: the
 * timeline is master and the video is seeked to match.
 *
 * Time bases: playback.t is trajectory time; video time = playback.t + videoOffset.
 */
import {useEffect} from 'react';
import {useViewerStore} from '../store';

interface FrameStamp {
  mediaTime: number;
  wall: number;
}

/** The single front <video> element (registered by CameraFeeds). */
let frontVideo: HTMLVideoElement | null = null;
let lastFrame: FrameStamp | null = null;
let rvfcHandle = 0;

type VideoWithRvfc = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number, meta: {mediaTime: number}) => void) => number;
  cancelVideoFrameCallback?: (h: number) => void;
};

export function registerFrontVideo(v: HTMLVideoElement | null) {
  const prev = frontVideo as VideoWithRvfc | null;
  if (prev?.cancelVideoFrameCallback && rvfcHandle) prev.cancelVideoFrameCallback(rvfcHandle);
  frontVideo = v;
  lastFrame = null;
  const vv = v as VideoWithRvfc | null;
  if (!vv?.requestVideoFrameCallback) return;
  const onFrame = (now: number, meta: {mediaTime: number}) => {
    lastFrame = {mediaTime: meta.mediaTime, wall: now};
    rvfcHandle = vv.requestVideoFrameCallback!(onFrame);
  };
  rvfcHandle = vv.requestVideoFrameCallback(onFrame);
}

export function getFrontVideo() {
  return frontVideo;
}

/** Video seconds that correspond to trajectory time t. */
export const toVideoTime = (t: number, offset: number) => t + offset;

const usable = (v: HTMLVideoElement | null): v is HTMLVideoElement =>
  !!v && v.readyState >= 2 && Number.isFinite(v.duration) && v.duration > 0 && !v.error;

/**
 * Drives playback.t while playback is enabled. Mount once (ReplayTimeline).
 * `duration` = trajectory length; `offset` = total video offset in seconds; `fps` ≈ video frame rate.
 */
export function useReplayClock(enabled: boolean, duration: number, offset: number, fps = 15) {
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let prevWall = performance.now();
    let wasPlaying = false;

    const tick = (wall: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (wall - prevWall) / 1000);
      prevWall = wall;
      const store = useViewerStore.getState();
      const pb = store.playback;
      const v = frontVideo;
      const vt = toVideoTime(pb.t, offset);
      const videoCovers = usable(v) && vt >= 0 && vt < v.duration - 0.05;

      if (pb.playing) {
        let t = pb.t;
        if (videoCovers) {
          if (v.playbackRate !== pb.speed) v.playbackRate = pb.speed;
          if (v.paused && !v.ended) void v.play().catch(() => {});
          if (!wasPlaying) lastFrame = null;
          if (lastFrame && !v.paused && !v.seeking) {
            const ahead = Math.min(((wall - lastFrame.wall) / 1000) * v.playbackRate, 1.5 / fps);
            t = lastFrame.mediaTime + Math.max(0, ahead) - offset;
          } else if (!v.seeking) {
            t = v.currentTime - offset;
          }
          // Never let the clock run backwards on a late frame callback.
          if (t < pb.t && pb.t - t < 0.25) t = pb.t;
        } else {
          // Outside the video (or no video): timeline clock; keep the video parked.
          if (usable(v) && !v.paused) v.pause();
          t = pb.t + dt * pb.speed;
          // Entering the video's range: hand over to it.
          if (usable(v) && toVideoTime(t, offset) >= 0 && toVideoTime(t, offset) < v.duration) {
            v.currentTime = toVideoTime(t, offset);
          }
        }
        if (t >= duration) {
          store.setPlayback({t: duration, playing: false});
          if (usable(v)) v.pause();
        } else if (t !== pb.t) {
          store.setPlayback({t: Math.max(0, t)});
        }
        wasPlaying = true;
      } else {
        wasPlaying = false;
        if (usable(v)) {
          if (!v.paused) v.pause();
          const target = Math.min(Math.max(0, vt), v.duration - 0.05);
          if (!v.seeking && Math.abs(v.currentTime - target) > 0.5 / fps) v.currentTime = target;
        }
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      frontVideo?.pause();
    };
  }, [enabled, duration, offset, fps]);
}

/** Jump to trajectory time t (scrubbing / skip buttons): updates the store and seeks the video at once. */
export function seekTo(t: number, offset: number, duration: number) {
  const clamped = Math.min(Math.max(0, t), duration);
  useViewerStore.getState().setPlayback({t: clamped});
  lastFrame = null;
  const v = frontVideo;
  if (usable(v)) {
    const vt = toVideoTime(clamped, offset);
    if (vt >= 0 && vt < v.duration) v.currentTime = vt;
  }
}
