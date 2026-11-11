/**
 * WS-H. Project page: satellite map with block polygons coloured by a metric, left sidebar with
 * project info + block list. `?tab=summary` shows WS-I's ProjectSummary over the map.
 */

import {BarChart3} from 'lucide-react';
import type {FeatureLike} from 'ol/Feature';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import VectorLayer from 'ol/layer/Vector';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import VectorSource from 'ol/source/Vector';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {routes} from '@/app/routes';
import {Badge, Button} from '@/components/ui';
import {Breadcrumbs} from '@/features/map/Breadcrumbs';
import {MapControls} from '@/features/map/MapControls';
import {MapHoverCard} from '@/features/map/MapHoverCard';
import {extentOf, flyTo, toMap} from '@/features/map/olBase';
import {SummaryOverlay} from '@/features/map/SummaryOverlay';
import {
  BLOCK_STATUS,
  METRIC_RAMP,
  PLOT_STATUS,
  PROJECT_STATUS,
  polygonStyle,
  rampColor,
  withAlpha,
} from '@/features/map/styles';
import {useOlMap} from '@/features/map/useOlMap';
import {NotFoundPage} from '@/features/shell/NotFoundPage';
import {type AggregateSummary, findProject, summarizeBlock, summarizeProject} from '@/lib/aggregate';
import {cn} from '@/lib/cn';
import {fmtArea, fmtBasalArea, fmtNumber, fmtStemsPerHa, fmtVolumePerHa} from '@/lib/format';
import type {Block} from '@/types';
import {ProjectSummary} from './summary/ProjectSummary';

type ColorBy = 'status' | 'sph' | 'ba' | 'volume' | 'progress';

const COLOR_BY: {
  id: ColorBy;
  label: string;
  get?: (s: AggregateSummary) => number | null;
  fmt?: (v: number) => string;
}[] = [
  {id: 'status', label: 'Status'},
  {id: 'sph', label: 'Stems/ha', get: (s) => s.stemsPerHa, fmt: (v) => fmtStemsPerHa(v)},
  {id: 'ba', label: 'Basal area', get: (s) => s.basalAreaM2PerHa, fmt: (v) => fmtBasalArea(v)},
  {id: 'volume', label: 'Volume', get: (s) => s.volumeM3PerHa, fmt: (v) => fmtVolumePerHa(v, 0)},
  {id: 'progress', label: 'Progress', get: (s) => s.progress, fmt: (v) => `${Math.round(v * 100)}%`},
];

export function ProjectPage() {
  const {projectId = ''} = useParams();
  const project = findProject(projectId);
  if (!project) return <NotFoundPage />;
  return <ProjectMap key={project.id} projectId={project.id} />;
}

function ProjectMap({projectId}: {projectId: string}) {
  const project = findProject(projectId)!;
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const showSummary = params.get('tab') === 'summary';
  const {ref, map} = useOlMap();
  const [colorBy, setColorBy] = useState<ColorBy>('status');
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [tip, setTip] = useState<{pixel: [number, number]; block: Block} | null>(null);

  const summaries = useMemo(() => new Map(project.blocks.map((b) => [b.id, summarizeBlock(b)])), [project]);
  const ps = useMemo(() => summarizeProject(project), [project]);
  const metric = COLOR_BY.find((c) => c.id === colorBy)!;
  const range = useMemo(() => {
    if (!metric.get) return null;
    const vals = [...summaries.values()].map(metric.get).filter((v): v is number => v != null);
    if (!vals.length) return null;
    return {min: Math.min(...vals), max: Math.max(...vals)};
  }, [metric, summaries]);

  const layers = useMemo(() => {
    const polys = new VectorSource({
      features: project.blocks.map((b) => new Feature({geometry: new Polygon([b.polygon.map(toMap)]), blockId: b.id})),
    });
    const plots = new VectorSource({
      features: project.blocks.flatMap((b) =>
        b.plots.map((p) => new Feature({geometry: new Point(toMap(p.center)), status: p.status})),
      ),
    });
    return {
      polygons: new VectorLayer({source: polys, zIndex: 2}),
      plots: new VectorLayer({source: plots, zIndex: 3, minZoom: 15}),
    };
  }, [project]);

  const colorFor = useCallback(
    (b: Block) => {
      if (colorBy === 'status' || !metric.get || !range) return BLOCK_STATUS[b.status].color;
      const v = metric.get(summaries.get(b.id)!);
      if (v == null) return '#9ca3af';
      return rampColor(range.max > range.min ? (v - range.min) / (range.max - range.min) : 1);
    },
    [colorBy, metric, range, summaries],
  );

  useEffect(() => {
    layers.polygons.setStyle((f: FeatureLike, resolution: number) => {
      const b = project.blocks.find((x) => x.id === f.get('blockId'))!;
      const c = colorFor(b);
      const hot = b.id === hoverId;
      return polygonStyle(withAlpha(c, hot ? 0.65 : 0.45), hot ? '#ffffff' : c, {
        width: hot ? 3.5 : 2,
        label: resolution < 8 ? b.name : undefined,
      });
    });
    const cache = new Map<string, Style>();
    layers.plots.setStyle((f: FeatureLike) => {
      const st = f.get('status') as keyof typeof PLOT_STATUS;
      if (!cache.has(st)) {
        cache.set(
          st,
          new Style({
            image: new CircleStyle({
              radius: 4,
              fill: new Fill({color: PLOT_STATUS[st].color}),
              stroke: new Stroke({color: '#fff', width: 1.5}),
            }),
          }),
        );
      }
      return cache.get(st)!;
    });
  }, [layers, colorFor, hoverId, project]);

  useEffect(() => {
    if (!map) return;
    map.addLayer(layers.polygons);
    map.addLayer(layers.plots);
    return () => {
      map.removeLayer(layers.polygons);
      map.removeLayer(layers.plots);
    };
  }, [map, layers]);

  const fit = useCallback(
    (duration = 1500) =>
      map && flyTo(map, extentOf(project.blocks.flatMap((b) => b.polygon)), [110, 80, 70, 390], duration, 17),
    [map, project],
  );
  useEffect(() => {
    if (!map) return;
    // Start zoomed out a little, then fly in.
    map.getView().setCenter(toMap(project.center));
    map.getView().setZoom(9);
    fit(1600);
  }, [map, project, fit]);

  useEffect(() => {
    if (!map) return;
    const blockAt = (e: MapBrowserEvent<PointerEvent | KeyboardEvent | WheelEvent>) => {
      const f = map.forEachFeatureAtPixel(e.pixel, (x) => x, {layerFilter: (l) => l === layers.polygons});
      return f ? project.blocks.find((b) => b.id === f.get('blockId')) : undefined;
    };
    const onMove = (e: MapBrowserEvent<PointerEvent | KeyboardEvent | WheelEvent>) => {
      if (e.dragging) return;
      const b = blockAt(e);
      map.getTargetElement().style.cursor = b ? 'pointer' : '';
      setHoverId(b?.id ?? null);
      setTip(b ? {pixel: e.pixel as [number, number], block: b} : null);
    };
    const onClick = (e: MapBrowserEvent<PointerEvent | KeyboardEvent | WheelEvent>) => {
      const b = blockAt(e);
      if (b) navigate(routes.block(project.id, b.id));
    };
    map.on('pointermove', onMove);
    map.on('click', onClick);
    return () => {
      map.un('pointermove', onMove);
      map.un('click', onClick);
    };
  }, [map, layers, project, navigate]);

  const st = PROJECT_STATUS[project.status];
  const tipSummary = tip ? summaries.get(tip.block.id) : undefined;

  return (
    <div className="relative h-full w-full bg-[#0b1a12]">
      <div ref={ref} className="absolute inset-0" />

      <aside className="absolute top-[84px] bottom-4 left-4 z-10 flex w-[340px] flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-2xl">
        <div className="space-y-2 border-b border-border-subtle px-5 py-4">
          <Breadcrumbs items={[{label: 'Projects', to: routes.home()}, {label: project.name}]} />
          <h1 className="text-lg leading-snug font-semibold">{project.name}</h1>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={st.tone} dot>
              {st.label}
            </Badge>
            <span className="text-xs text-fg-muted">
              {project.client} · {project.region}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <Stat label="Area" value={fmtArea(project.areaHa, 1)} />
            <Stat label="Blocks" value={String(project.blocks.length)} />
            <Stat label="Plots" value={`${ps.nPlotsProcessed}/${ps.nPlots}`} />
          </div>
          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-fg-muted">
              Targets: <span className="text-fg">{fmtNumber(project.targets.sph)} SPH</span> · min DBH{' '}
              <span className="text-fg">{project.targets.minDbhCm} cm</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {project.species.map((sp) => (
              <Badge key={sp} tone="brand" dot>
                {sp}
              </Badge>
            ))}
          </div>
        </div>

        <div className="border-b border-border-subtle px-5 py-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Colour blocks by</div>
          <div className="flex flex-wrap gap-1">
            {COLOR_BY.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setColorBy(c.id)}
                className={cn(
                  'rounded-md px-2 py-1 text-[11px] font-medium cursor-pointer',
                  colorBy === c.id ? 'bg-brand text-white' : 'bg-surface-3 text-fg-muted hover:text-fg',
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          {colorBy === 'status' || !range || !metric.fmt ? (
            <div className="mt-2.5 flex gap-3 text-[11px]">
              {Object.values(BLOCK_STATUS).map((s) => (
                <span key={s.label} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{background: s.color}} />
                  {s.label}
                </span>
              ))}
            </div>
          ) : (
            <div className="mt-2.5">
              <div
                className="h-2 rounded-full"
                style={{background: `linear-gradient(to right, ${METRIC_RAMP.join(',')})`}}
              />
              <div className="fd-mono mt-1 flex justify-between text-[10px] text-fg-muted">
                <span>{metric.fmt(range.min)}</span>
                <span>{metric.fmt(range.max)}</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-fg-subtle">
                <span className="h-2 w-2 rounded-sm bg-[#9ca3af]" /> not yet cruised
              </div>
            </div>
          )}
        </div>

        <ul className="flex-1 overflow-y-auto">
          {project.blocks.map((b) => {
            const s = summaries.get(b.id)!;
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onMouseEnter={() => setHoverId(b.id)}
                  onMouseLeave={() => setHoverId(null)}
                  onClick={() => navigate(routes.block(project.id, b.id))}
                  className={cn(
                    'flex w-full items-center gap-3 border-b border-border-subtle px-5 py-2.5 text-left cursor-pointer',
                    hoverId === b.id ? 'bg-brand-soft' : 'hover:bg-surface-hover',
                  )}
                >
                  <span className="h-8 w-1.5 shrink-0 rounded-full" style={{background: colorFor(b)}} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-fg">{b.name}</span>
                    <span className="block text-[11px] text-fg-muted">
                      {fmtArea(b.areaHa, 1)} · {s.nPlotsProcessed}/{s.nPlots} plots · {fmtStemsPerHa(s.stemsPerHa)}
                    </span>
                  </span>
                  <span
                    className="text-[10px] font-medium"
                    style={{
                      color: BLOCK_STATUS[b.status].color === '#feb743' ? '#b4730a' : BLOCK_STATUS[b.status].color,
                    }}
                  >
                    {BLOCK_STATUS[b.status].label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-border-subtle p-4">
          <Button
            variant="primary"
            className="w-full justify-center"
            icon={<BarChart3 size={15} />}
            onClick={() => setParams(showSummary ? {} : {tab: 'summary'})}
          >
            {showSummary ? 'Back to map' : 'Project summary'}
          </Button>
        </div>
      </aside>

      {!showSummary && <MapControls map={map} onFit={() => fit(900)} />}
      {showSummary && (
        <SummaryOverlay onClose={() => setParams({})}>
          <ProjectSummary project={project} />
        </SummaryOverlay>
      )}

      <MapHoverCard pixel={tip?.pixel ?? null}>
        {tip && tipSummary && (
          <div className="min-w-44">
            <div className="font-semibold text-fg">{tip.block.name}</div>
            <div className="mb-1.5 text-fg-muted">
              {fmtArea(tip.block.areaHa, 1)} · {BLOCK_STATUS[tip.block.status].label}
            </div>
            <div className="fd-mono grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
              <span className="text-fg-muted">Stems</span>
              <span className="text-right">{fmtStemsPerHa(tipSummary.stemsPerHa)}</span>
              <span className="text-fg-muted">Basal area</span>
              <span className="text-right">{fmtBasalArea(tipSummary.basalAreaM2PerHa)}</span>
              <span className="text-fg-muted">Volume</span>
              <span className="text-right">{fmtVolumePerHa(tipSummary.volumeM3PerHa, 0)}</span>
              <span className="text-fg-muted">Plots</span>
              <span className="text-right">
                {tipSummary.nPlotsProcessed}/{tipSummary.nPlots}
              </span>
            </div>
          </div>
        )}
      </MapHoverCard>
    </div>
  );
}

function Stat({label, value}: {label: string; value: string}) {
  return (
    <div className="rounded-lg bg-surface-2 py-1.5">
      <div className="fd-mono text-sm font-semibold text-fg">{value}</div>
      <div className="text-[10px] text-fg-muted">{label}</div>
    </div>
  );
}
