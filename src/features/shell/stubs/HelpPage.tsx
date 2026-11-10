/** WS-G. Help centre: quick start, viewer shortcuts, FAQ, contact (stub). */
import {ChevronDown, LifeBuoy, Mail, PlayCircle} from 'lucide-react';
import {useState} from 'react';
import {Button} from '@/components/ui';
import {cn} from '@/lib/cn';
import {toast} from '../toast';
import {PageLayout} from './PageLayout';

const STEPS = [
  {
    title: 'Capture',
    body: 'Walk the plot with a TimberSense unit. Lidar, IMU, GNSS and four cameras record automatically.',
  },
  {title: 'Upload', body: 'Use “Upload capture” or sync the device. Assign it to a project and block.'},
  {title: 'Process', body: 'SLAM, segmentation and tree fitting run in the cloud — usually under 20 minutes per plot.'},
  {title: 'Explore', body: 'Open the plot in 3D, click trees for DBH, height and volume, and export reports.'},
];

const SHORTCUTS = [
  ['Drag', 'Orbit the plot'],
  ['Scroll', 'Zoom'],
  ['Double-click', 'Re-centre orbit on a point'],
  ['Click a tree', 'Select and show DBH / height'],
  ['Esc', 'Clear selection / leave walk mode'],
  ['W A S D', 'Walk (in walk mode)'],
  ['Shift', 'Run (in walk mode)'],
  ['/', 'Search projects, blocks and plots'],
];

const FAQ = [
  [
    'How is DBH measured?',
    'Stem points between 1.2 and 1.4 m above ground are fitted with circles/cylinders at several heights; the median section at breast height (1.3 m) gives the DBH.',
  ],
  [
    'How accurate are heights?',
    'Height is measured from the terrain model to the highest point of each segmented tree. Dense canopy above the sensor can make heights slightly low.',
  ],
  [
    'What is QSM?',
    'A Quantitative Structure Model reconstructs each tree as cylinders, giving stem and branch volume for biomass and carbon.',
  ],
  [
    'Why are some trees “rejected”?',
    'Instances too short, too sparse, or without stem points at breast height are excluded from plot statistics but kept for review.',
  ],
];

export function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  return (
    <PageLayout title="Help & support" subtitle="Get the most out of TimberSense.">
      <div className="grid gap-4 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <div key={s.title} className="rounded-2xl border border-border-subtle bg-surface p-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
              {i + 1}
            </div>
            <div className="mt-3 font-semibold text-fg">{s.title}</div>
            <p className="mt-1 text-sm text-fg-muted">{s.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-2xl border border-border-subtle bg-surface p-5">
          <h2 className="text-sm font-semibold">3D viewer shortcuts</h2>
          <dl className="mt-3 divide-y divide-border-subtle text-sm">
            {SHORTCUTS.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2">
                <dt>
                  <kbd className="rounded-md border border-border bg-surface-2 px-2 py-0.5 text-xs">{k}</kbd>
                </dt>
                <dd className="text-fg-muted">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-2xl border border-border-subtle bg-surface p-5">
          <h2 className="text-sm font-semibold">Frequently asked</h2>
          <div className="mt-2 divide-y divide-border-subtle">
            {FAQ.map(([q, a], i) => (
              <div key={q}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between py-3 text-left text-sm font-medium text-fg cursor-pointer"
                >
                  {q}
                  <ChevronDown
                    size={16}
                    className={cn('text-fg-subtle transition-transform', openFaq === i && 'rotate-180')}
                  />
                </button>
                {openFaq === i && <p className="pb-3 text-sm text-fg-muted">{a}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-brand-soft p-5">
        <div className="flex items-center gap-3">
          <LifeBuoy className="text-brand" />
          <div>
            <div className="font-semibold text-fg">Need a hand?</div>
            <div className="text-sm text-fg-muted">Our forestry team usually replies within a business day.</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button icon={<PlayCircle size={15} />} onClick={() => toast('Video walkthrough coming soon', 'info')}>
            Watch walkthrough
          </Button>
          <Button
            variant="primary"
            icon={<Mail size={15} />}
            onClick={() => toast('Support request sent — we’ll be in touch')}
          >
            Contact support
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
