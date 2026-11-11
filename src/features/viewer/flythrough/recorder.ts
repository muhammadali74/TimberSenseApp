/**
 * WS-F. Records the viewer canvas with MediaRecorder and downloads a .webm when stopped.
 * Only the 3D view is captured (no letterbox or controls).
 */

let active: {rec: MediaRecorder; chunks: Blob[]; name: string} | null = null;

export function canRecord(): boolean {
  return typeof MediaRecorder !== 'undefined' && 'captureStream' in HTMLCanvasElement.prototype;
}

function pickMime(): string {
  for (const m of ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return '';
}

export function startRecording(canvas: HTMLCanvasElement, name: string): boolean {
  if (active || !canRecord()) return false;
  const mimeType = pickMime();
  const rec = new MediaRecorder(canvas.captureStream(60), {
    ...(mimeType ? {mimeType} : {}),
    videoBitsPerSecond: 16_000_000,
  });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  rec.onstop = () => {
    const url = URL.createObjectURL(new Blob(chunks, {type: mimeType || 'video/webm'}));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.webm`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };
  rec.start(1000);
  active = {rec, chunks, name};
  return true;
}

export function stopRecording() {
  if (!active) return;
  const {rec} = active;
  active = null;
  if (rec.state !== 'inactive') rec.stop();
}
