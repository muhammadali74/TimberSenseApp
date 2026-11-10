/**
 * WS-G. Marketing cards for the login carousel (SylvaSense FeatureCarousel style).
 * Numbers come from the real Kotli Sattian plot FR-01.
 */
import type {ReactNode} from 'react';
import LeafIcon from '@/assets/icons/app-leaf.svg?react';

const GREENS = {900: '#1f4d2d', 700: '#2f7a45', 500: '#4c9d5f', 400: '#6db57c', 300: '#9bcca4', 200: '#c4e2c8'};

function FeatureCard({
  label,
  stat,
  statSub,
  description,
  children,
}: {
  label: string;
  stat: string;
  statSub: string;
  description: ReactNode;
  children?: ReactNode;
}) {
  return (
    <article className="flex min-h-[360px] flex-col items-start rounded-3xl bg-surface px-8 py-7">
      <h2 className="text-sm font-normal tracking-wider text-fg uppercase">{label}</h2>
      <div className="mt-3 flex items-baseline gap-3">
        <span className="text-[44px] leading-none font-semibold text-fg">{stat}</span>
        <span className="text-sm font-medium text-fg">{statSub}</span>
      </div>
      <p className="mt-3 text-sm leading-5 font-light text-fg-muted">{description}</p>
      <div className="mt-auto w-full pt-6">{children}</div>
    </article>
  );
}

export function TestimonialCard() {
  return (
    <article className="flex min-h-[360px] flex-col justify-between rounded-3xl bg-surface px-8 py-7">
      <h2 className="text-[30px] leading-tight font-semibold text-fg">A new way to cruise timber.</h2>
      <blockquote className="mt-4 flex-grow text-lg leading-relaxed text-fg-muted">
        “We walked the plot once. Before we were back at the truck, TimberSense had DBH, height and volume for every
        stem — no tapes, no clinometer.”
      </blockquote>
      <div className="mt-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success">
          <LeafIcon width={28} height={20} className="[&_path]:stroke-white" />
        </div>
        <p className="tracking-[0.2em] text-fg-muted uppercase">Timber cruising</p>
      </div>
    </article>
  );
}

export function CaptureCard() {
  return (
    <FeatureCard
      label="Trees measured"
      stat="29"
      statSub="in a 2-minute walk"
      description={
        <>
          Lidar, IMU and four cameras capture the stand as you walk.
          <br />
          Every stem is segmented and measured automatically.
        </>
      }
    >
      <svg viewBox="0 0 320 110" className="w-full" aria-hidden="true">
        <path
          d="M10 85 C 60 30, 110 100, 160 55 S 260 20, 310 70"
          fill="none"
          stroke={GREENS[300]}
          strokeWidth="3"
          strokeDasharray="2 7"
          strokeLinecap="round"
        />
        {[30, 70, 105, 140, 185, 220, 255, 290].map((x, i) => (
          <g key={x}>
            <rect
              x={x - 4}
              y={36 + (i % 3) * 8}
              width="8"
              height={60 - (i % 3) * 8}
              rx="3"
              fill={GREENS[700]}
              opacity={0.85}
            />
            <circle cx={x} cy={34 + (i % 3) * 8} r={13 - (i % 2) * 3} fill={GREENS[400]} opacity={0.7} />
          </g>
        ))}
        <circle cx="160" cy="55" r="7" fill="#F57E26" />
        <circle cx="160" cy="55" r="15" fill="none" stroke="#F57E26" strokeOpacity="0.4" strokeWidth="2" />
      </svg>
    </FeatureCard>
  );
}

const SPH = [
  {label: 'FR-01', value: 641, color: GREENS[700]},
  {label: 'FR-02', value: 588, color: GREENS[500]},
  {label: 'FR-03', value: 702, color: GREENS[400]},
  {label: 'FR-04', value: 455, color: GREENS[300]},
];

export function StemsCard() {
  const max = Math.max(...SPH.map((s) => s.value));
  return (
    <FeatureCard
      label="Stems per hectare"
      stat="641"
      statSub="stems / ha"
      description={
        <>
          Stocking, basal area and spacing for every plot.
          <br />
          Plan thinning with a tree-by-tree removal list.
        </>
      }
    >
      <div className="flex w-full items-end justify-evenly">
        {SPH.map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-2">
            <div
              className="flex w-[64px] flex-col items-center justify-center rounded-[10px]"
              style={{backgroundColor: s.color, height: 40 + (s.value / max) * 70}}
            >
              <span className="text-base leading-tight font-semibold text-white">{s.value}</span>
              <span className="text-[9px] font-medium text-white">SPH</span>
            </div>
            <span className="text-[10px] font-medium text-fg">{s.label}</span>
          </div>
        ))}
      </div>
    </FeatureCard>
  );
}

const DBH_BINS = [
  {cls: '15', n: 2},
  {cls: '20', n: 7},
  {cls: '25', n: 7},
  {cls: '30', n: 1},
  {cls: '35', n: 10},
  {cls: '40', n: 2},
];

export function DbhCard() {
  return (
    <FeatureCard
      label="Diameter at breast height"
      stat="30.1"
      statSub="cm mean DBH"
      description={
        <>
          Stem cylinders fitted at 1.3 m from the point cloud,
          <br />
          cross-checked against a full QSM tree model.
        </>
      }
    >
      <div className="flex h-[110px] w-full items-end gap-2">
        {DBH_BINS.map((b) => (
          <div key={b.cls} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className="w-full rounded-md"
              style={{height: b.n * 9 + 4, backgroundColor: b.n >= 7 ? GREENS[700] : GREENS[300]}}
            />
            <span className="text-[10px] text-fg-muted">{b.cls}</span>
          </div>
        ))}
      </div>
    </FeatureCard>
  );
}

export function CarbonCard() {
  const parts = [
    {label: 'Stem wood', pct: 68, color: GREENS[700]},
    {label: 'Branches', pct: 21, color: GREENS[400]},
    {label: 'Foliage', pct: 11, color: GREENS[200]},
  ];
  return (
    <FeatureCard
      label="Carbon stock"
      stat="5.5 t"
      statSub="CO₂e in one plot"
      description={
        <>
          Volume → biomass → carbon for every tree,
          <br />
          rolled up to blocks and projects for reporting.
        </>
      }
    >
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        {parts.map((p) => (
          <div key={p.label} style={{width: `${p.pct}%`, backgroundColor: p.color}} />
        ))}
      </div>
      <div className="mt-3 flex gap-4">
        {parts.map((p) => (
          <span key={p.label} className="flex items-center gap-1.5 text-[11px] text-fg">
            <span className="h-2 w-2 rounded-full" style={{backgroundColor: p.color}} />
            {p.label} {p.pct}%
          </span>
        ))}
      </div>
    </FeatureCard>
  );
}

export const FEATURE_CARDS = [TestimonialCard, CaptureCard, StemsCard, DbhCard, CarbonCard];
