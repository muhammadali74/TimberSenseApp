/**
 * WS-G. "Upload capture" flow (simulated): pick files or import from a device → upload progress →
 * processing pipeline stages → done (links to the processed demo plot and posts a notification).
 */
import {Check, CloudUpload, HardDriveDownload, Loader2, Radio} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {routes} from '@/app/routes';
import {Badge, Button, Modal} from '@/components/ui';
import {catalog} from '@/data/catalog';
import {cn} from '@/lib/cn';
import {DEVICES} from '../mockData';
import {useShell} from '../shellStore';

type Step = 'select' | 'uploading' | 'processing' | 'done';

const STAGES = [
  'Upload verified',
  'Lidar-inertial SLAM & trajectory',
  'Point cloud colourisation',
  'Ground & tree segmentation',
  'DBH & height fitting',
  'Volume, biomass & carbon',
  'Report ready',
];

interface FileItem {
  name: string;
  sizeMb: number;
}

const DEVICE_FILES: FileItem[] = [
  {name: 'capture_2026-11-10_0932.mcap', sizeMb: 4310},
  {name: 'cam_front_2026-11-10_0932.mp4', sizeMb: 962},
  {name: 'gnss_2026-11-10_0932.ubx', sizeMb: 3},
];

function stageIcon(done: boolean, running: boolean, i: number) {
  if (done) return <Check size={13} />;
  if (running) return <Loader2 size={13} className="animate-spin" />;
  return i + 1;
}

const fmtSize = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`);

export function UploadCaptureModal() {
  const {uploadOpen, setUploadOpen, pushNotification} = useShell();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('select');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [projectId, setProjectId] = useState(catalog[0]?.id ?? '');
  const [blockId, setBlockId] = useState(catalog[0]?.blocks[0]?.id ?? '');
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const project = catalog.find((p) => p.id === projectId);
  const totalMb = files.reduce((a, f) => a + f.sizeMb, 0);

  const reset = () => {
    setStep('select');
    setFiles([]);
    setProgress(0);
    setStage(0);
  };
  const close = () => {
    setUploadOpen(false);
    window.setTimeout(reset, 250);
  };

  // Simulated upload.
  useEffect(() => {
    if (step !== 'uploading') return;
    const id = window.setInterval(() => {
      setProgress((p) => {
        const next = Math.min(1, p + 0.035 + Math.random() * 0.03);
        if (next >= 1) window.setTimeout(() => setStep('processing'), 300);
        return next;
      });
    }, 120);
    return () => window.clearInterval(id);
  }, [step]);

  // Simulated processing pipeline.
  useEffect(() => {
    if (step !== 'processing') return;
    if (stage >= STAGES.length) {
      setStep('done');
      pushNotification({
        kind: 'processing',
        title: 'New capture processed',
        body: `${files[0]?.name ?? 'Capture'} → ${project?.name ?? 'project'}`,
        href: routes.plot('kotli-sattian', 'ks-b01', 'fariy_1_test'),
      });
      return;
    }
    const id = window.setTimeout(() => setStage((s) => s + 1), 750 + Math.random() * 500);
    return () => window.clearTimeout(id);
  }, [step, stage, files, project, pushNotification]);

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    setFiles((f) => [...f, ...Array.from(list).map((x) => ({name: x.name, sizeMb: x.size / 1e6}))]);
  };

  return (
    <Modal open={uploadOpen} onClose={close} title="Upload capture" size="lg">
      {step === 'select' && (
        <div className="space-y-5">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              addFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors',
              drag ? 'border-brand bg-brand-soft' : 'border-border hover:border-brand/60 hover:bg-surface-2',
            )}
          >
            <CloudUpload size={30} className="text-brand" />
            <p className="mt-2 text-sm font-semibold">Drop capture files here, or click to browse</p>
            <p className="mt-1 text-xs text-fg-muted">
              Lidar bags (.mcap, .bag), camera video (.mp4), GNSS logs — or a zipped session
            </p>
            <input ref={inputRef} type="file" multiple hidden onChange={(e) => addFiles(e.target.files)} />
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">
              Or import from a device
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DEVICES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  disabled={d.status === 'offline'}
                  onClick={() => setFiles(DEVICE_FILES)}
                  className="flex items-center gap-2.5 rounded-xl border border-border-subtle p-2.5 text-left hover:border-brand disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  <Radio size={16} className="text-brand" />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold">{d.name}</span>
                    <span className="block text-[11px] text-fg-muted capitalize">{d.status}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {files.length > 0 && (
            <ul className="divide-y divide-border-subtle rounded-xl border border-border-subtle">
              {files.map((f) => (
                <li key={f.name} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <HardDriveDownload size={14} className="text-fg-subtle" />
                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                  <span className="fd-mono text-xs text-fg-muted">{fmtSize(f.sizeMb)}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-medium text-fg-muted">
              Project
              <select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setBlockId(catalog.find((p) => p.id === e.target.value)?.blocks[0]?.id ?? '');
                }}
                className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-2 text-sm text-fg outline-none"
              >
                {catalog.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-fg-muted">
              Block
              <select
                value={blockId}
                onChange={(e) => setBlockId(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-2 text-sm text-fg outline-none"
              >
                {project?.blocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-fg-muted">
              {files.length
                ? `${files.length} file${files.length > 1 ? 's' : ''} · ${fmtSize(totalMb)}`
                : 'No files selected'}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button variant="primary" disabled={!files.length} onClick={() => setStep('uploading')}>
                Upload & process
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 'uploading' && (
        <div className="py-6">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">
              Uploading {files.length} file{files.length > 1 ? 's' : ''}…
            </span>
            <span className="fd-mono text-fg-muted">
              {fmtSize(totalMb * progress)} / {fmtSize(totalMb)}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-150"
              style={{width: `${progress * 100}%`}}
            />
          </div>
          <p className="mt-3 text-xs text-fg-muted">
            Keep this window open. Processing starts automatically once the upload finishes.
          </p>
        </div>
      )}

      {(step === 'processing' || step === 'done') && (
        <div className="space-y-4">
          <ol className="space-y-2.5">
            {STAGES.map((s, i) => {
              const done = i < stage || step === 'done';
              const running = i === stage && step === 'processing';
              return (
                <li key={s} className="flex items-center gap-3 text-sm">
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full',
                      done && 'bg-brand text-white',
                      running && 'bg-brand-soft text-brand',
                      !done && !running && 'bg-surface-3 text-fg-subtle',
                    )}
                  >
                    {stageIcon(done, running, i)}
                  </span>
                  <span className={cn(done || running ? 'text-fg' : 'text-fg-subtle', running && 'font-semibold')}>
                    {s}
                  </span>
                  {running && <Badge tone="brand">running</Badge>}
                </li>
              );
            })}
          </ol>
          {step === 'done' ? (
            <div className="flex items-center justify-between rounded-xl bg-brand-soft p-3">
              <span className="text-sm font-medium text-brand">Processing complete — 29 trees measured.</span>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={close}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    close();
                    navigate(routes.plot('kotli-sattian', 'ks-b01', 'fariy_1_test'));
                  }}
                >
                  Open in 3D viewer
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-fg-muted">
              You can close this window — we’ll notify you when processing finishes.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
