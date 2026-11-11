/**
 * WS-H. Block page: satellite view fitted to the block outline, true-size plot circles with numbered
 * markers (real 3D plots in Farmevo orange), left sidebar (stocking, targets, plot list) and a right
 * card for the selected plot with "Open 3D viewer". `?tab=summary` shows WS-I's BlockSummary.
 */

import {BarChart3, Box, CalendarDays, X} from 'lucide-react';
import type {FeatureLike} from 'ol/Feature';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import VectorLayer from 'ol/layer/Vector';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import VectorSource from 'ol/source/Vector';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import Text from 'ol/style/Text';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {routes} from '@/app/routes';
import {Badge, type BadgeTone, Button, KpiTile} from '@/components/ui';
import {Breadcrumbs} from '@/features/map/Breadcrumbs';
import {MapControls} from '@/features/map/MapControls';
import {MapHoverCard} from '@/features/map/MapHoverCard';
import {extentOf, flyTo, toMap} from '@/features/map/olBase';
import {plotFeatures} from '@/features/map/plotFeatures';
import {SummaryOverlay} from '@/features/map/SummaryOverlay';
import {BLOCK_STATUS, BLOCK_TONE, countBy, PLOT_STATUS, PLOT_TONE, withAlpha} from '@/features/map/styles';
import {useOlMap} from '@/features/map/useOlMap';
import {NotFoundPage} from '@/features/shell/NotFoundPage';
import {findBlock, findProject, summarizeBlock} from '@/lib/aggregate';
import {cn} from '@/lib/cn';
import {
  fmtArea,
  fmtBasalArea,
  fmtDate,
  fmtDbh,
  fmtHeight,
  fmtNumber,
  fmtStemsPerHa,
  fmtTonnes,
  fmtVolumePerHa,
} from '@/lib/format';
import type {Block, PlotRef, Project} from '@/types';
import {BlockSummary} from './summary/BlockSummary';

const REAL = '#F57E26';
const OUTLINE = '#f5c542';

export function BlockPage() {
  const {projectId = '', blockId = ''} = useParams();
  const project = findProject(projectId);
  const block = findBlock(projectId, blockId);
  if (!project || !block) return <NotFoundPage />;
  return <BlockMap key={block.id} project={project} block={block} />;
}

function stocking(project: Project, sph: number | null): {label: string; tone: BadgeTone} {
  if (sph == null) return {label: 'Not assessed', tone: 'neutral'};
  const r = sph / project.targets.sph;
  if (r >= 1) return {label: 'Stocked', tone: 'success'};
  if (r >= 0.8) return {label: 'Satisfactory', tone: 'warning'};
  return {label: 'Below target', tone: 'danger'};
}

function BlockMap({project, block}: {project: Project; block: Block}) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const showSummary = params.get('tab') === 'summary';
  const {ref, map} = useOlMap();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [tipPixel, setTipPixel] = useState<[number, number] | null>(null);
  const s = useMemo(() => summarizeBlock(block), [block]);
  const stock = stocking(project, s.stemsPerHa);
  const selected = block.plots.find((p) => p.id === selectedId) ?? null;
  const hovered = block.plots.find((p) => p.id === hoverId) ?? null;

  const layers = useMemo(() => {
    const outline = new VectorLayer({
      source: new VectorSource({features: [new Feature({geometry: new Polygon([block.polygon.map(toMap)])})]}),
      style: [
        new Style({stroke: new Stroke({color: 'rgba(0,0,0,0.45)', width: 5})}),
        new Style({stroke: new Stroke({color: OUTLINE, width: 2.5}), fill: new Fill({color: 'rgba(245,197,66,0.06)'})}),
      ],
      zIndex: 2,
    });
    const plots = new VectorLayer({source: new VectorSource({features: plotFeatures(block)}), zIndex: 3});
    return {outline, plots};
  }, [block]);

  useEffect(() => {
    layers.plots.setStyle((f: FeatureLike, resolution: number) => {
      const st = PLOT_STATUS[f.get('status') as keyof typeof PLOT_STATUS];
      const real = f.get('real') as boolean;
      const color = real ? REAL : st.color;
      const hot = f.get('plotId') === hoverId || f.get('plotId') === selectedId;
      if (f.get('kind') === 'circle') {
        return new Style({
          fill: new Fill({color: withAlpha(color, hot ? 0.45 : 0.28)}),
          stroke: new Stroke({color: hot ? '#ffffff' : color, width: hot ? 2.5 : 1.5}),
        });
      }
      // Numbered bubble; hide numbers when zoomed far out.
      let r = real ? 11 : 9;
      if (hot) r = 12;
      let z = hot ? 9 : 1;
      if (real) z = 10;
      return new Style({
        image: new CircleStyle({
          radius: r,
          fill: new Fill({color: real ? REAL : '#ffffff'}),
          stroke: new Stroke({color: hot ? '#2f9c5a' : color, width: hot ? 3 : 2.5}),
        }),
        text:
          resolution < 3
            ? new Text({
                text: String(f.get('index')),
                font: '600 10px Poppins, sans-serif',
                fill: new Fill({color: real ? '#ffffff' : '#0a0a0a'}),
              })
            : undefined,
        zIndex: z,
      });
    });
  }, [layers, hoverId, selectedId]);

  useEffect(() => {
    if (!map) return;
    map.addLayer(layers.outline);
    map.addLayer(layers.plots);
    return () => {
      map.removeLayer(layers.outline);
      map.removeLayer(layers.plots);
    };
  }, [map, layers]);

  const fit = useCallback(
    (duration = 1400) => map && flyTo(map, extentOf(block.polygon), [110, selected ? 400 : 80, 70, 390], duration, 19),
    [map, block, selected],
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: initial fly-in only
  useEffect(() => {
    if (!map) return;
    map.getView().setCenter(toMap(block.plots[0]?.center ?? project.center));
    map.getView().setZoom(13);
    fit(1500);
  }, [map]);

  useEffect(() => {
    if (!map) return;
    const plotAt = (e: MapBrowserEvent<PointerEvent | KeyboardEvent | WheelEvent>) => {
      const f = map.forEachFeatureAtPixel(e.pixel, (x) => x, {layerFilter: (l) => l === layers.plots, hitTolerance: 3});
      return (f?.get('plotId') as string | undefined) ?? null;
    };
    const onMove = (e: MapBrowserEvent<PointerEvent | KeyboardEvent | WheelEvent>) => {
      if (e.dragging) return;
      const id = plotAt(e);
      map.getTargetElement().style.cursor = id ? 'pointer' : '';
      setHoverId(id);
      setTipPixel(id ? (e.pixel as [number, number]) : null);
    };
    const onClick = (e: MapBrowserEvent<PointerEvent | KeyboardEvent | WheelEvent>) => setSelectedId(plotAt(e));
    map.on('pointermove', onMove);
    map.on('click', onClick);
    return () => {
      map.un('pointermove', onMove);
      map.un('click', onClick);
    };
  }, [map, layers]);

  const counts = countBy(block.plots, (p) => p.status);

  return (
    <div className="relative h-full w-full bg-[#0b1a12]">
      <div ref={ref} className="absolute inset-0" />

      <aside className="absolute top-[84px] bottom-4 left-4 z-10 flex w-[340px] flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-2xl">
        <div className="space-y-2 border-b border-border-subtle px-5 py-4">
          <Breadcrumbs
            items={[
              {label: 'Projects', to: routes.home()},
              {label: project.name, to: routes.project(project.id)},
              {label: block.name},
            ]}
          />
          <h1 className="text-lg leading-snug font-semibold">Block {block.name}</h1>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
            <Badge tone={BLOCK_TONE[block.status]} dot>
              {BLOCK_STATUS[block.status].label}
            </Badge>
            {fmtArea(block.areaHa)} · {project.region}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <section className="border-b border-border-subtle px-5 py-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Stocking status</span>
              <Badge tone={stock.tone}>{stock.label}</Badge>
            </div>
            <dl className="mt-2.5 grid grid-cols-2 gap-y-1 text-[13px]">
              <dt className="text-fg-muted">Target SPH</dt>
              <dd className="fd-mono text-right">{fmtNumber(project.targets.sph)}</dd>
              <dt className="text-fg-muted">Measured SPH</dt>
              <dd className="fd-mono text-right">{fmtNumber(s.stemsPerHa)}</dd>
              <dt className="text-fg-muted">Min. preferred</dt>
              <dd className="fd-mono text-right">{fmtNumber(project.targets.sph * 0.8)}</dd>
              <dt className="text-fg-muted">Min. DBH</dt>
              <dd className="fd-mono text-right">{project.targets.minDbhCm} cm</dd>
            </dl>
          </section>

          <section className="border-b border-border-subtle px-5 py-3.5">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">Species</div>
            <div className="flex flex-wrap gap-1.5">
              {project.species.map((sp) => (
                <Badge key={sp} tone="brand" dot>
                  {sp}
                </Badge>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-2 border-b border-border-subtle px-5 py-3.5">
            <KpiTile size="sm" label="Basal area" value={fmtBasalArea(s.basalAreaM2PerHa)} />
            <KpiTile size="sm" label="Volume" value={fmtVolumePerHa(s.volumeM3PerHa, 0)} />
            <KpiTile size="sm" label="Mean DBH" value={fmtDbh(s.dbhCmMean)} />
            <KpiTile size="sm" label="CO₂e" value={fmtTonnes(s.totalCo2eT, 0)} tone="brand" />
          </section>

          <section className="px-5 py-3.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Plots</span>
              <span className="fd-mono text-[11px] text-fg-muted">
                {s.nPlotsProcessed}/{s.nPlots} processed
              </span>
            </div>
            <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
              {(Object.keys(PLOT_STATUS) as (keyof typeof PLOT_STATUS)[]).map((k) => (
                <span key={k} className="flex items-center gap-1.5 text-fg-muted">
                  <span className="h-2 w-2 rounded-full" style={{background: PLOT_STATUS[k].color}} />
                  {counts[k] ?? 0} {PLOT_STATUS[k].label.toLowerCase()}
                </span>
              ))}
              <span className="flex items-center gap-1.5 text-fg-muted">
                <span className="h-2 w-2 rounded-full" style={{background: REAL}} /> 3D available
              </span>
            </div>
            <ul className="space-y-0.5">
              {block.plots.map((p, i) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setHoverId(p.id)}
                    onMouseLeave={() => setHoverId(null)}
                    onClick={() => setSelectedId(p.id)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] cursor-pointer',
                      p.id === selectedId ? 'bg-brand-soft' : 'hover:bg-surface-hover',
                    )}
                  >
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold"
                      style={{
                        background: p.dataPath ? REAL : '#fff',
                        color: p.dataPath ? '#fff' : '#0a0a0a',
                        boxShadow: `inset 0 0 0 2px ${p.dataPath ? REAL : PLOT_STATUS[p.status].color}`,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    {p.dataPath && <Box size={13} className="text-farmevo" />}
                    <span className="fd-mono text-[11px] text-fg-muted">
                      {p.summary ? fmtStemsPerHa(p.summary.stemsPerHa) : '—'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="border-t border-border-subtle p-4">
          <Button
            variant="primary"
            className="w-full justify-center"
            icon={<BarChart3 size={15} />}
            onClick={() => setParams(showSummary ? {} : {tab: 'summary'})}
          >
            {showSummary ? 'Back to map' : 'Block summary'}
          </Button>
        </div>
      </aside>

      {selected && !showSummary && (
        <PlotCard
          plot={selected}
          index={block.plots.indexOf(selected) + 1}
          onClose={() => setSelectedId(null)}
          onOpen={() => navigate(routes.plot(project.id, block.id, selected.id))}
        />
      )}
      {!showSummary && <MapControls map={map} onFit={() => fit(900)} offsetRight={selected ? 376 : 0} />}
      {showSummary && (
        <SummaryOverlay onClose={() => setParams({})}>
          <BlockSummary project={project} block={block} />
        </SummaryOverlay>
      )}

      <MapHoverCard pixel={tipPixel}>
        {hovered && (
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-fg">
              {hovered.name}
              {hovered.dataPath && <Badge tone="farmevo">3D</Badge>}
            </div>
            <div className="text-fg-muted">
              {PLOT_STATUS[hovered.status].label}
              {hovered.captureDate && ` · ${fmtDate(hovered.captureDate)}`}
            </div>
            {hovered.summary && (
              <div className="fd-mono mt-1 text-[11px]">
                {hovered.summary.nValidTrees} trees · {fmtStemsPerHa(hovered.summary.stemsPerHa)} ·{' '}
                {fmtBasalArea(hovered.summary.basalAreaM2PerHa)}
              </div>
            )}
          </div>
        )}
      </MapHoverCard>
    </div>
  );
}

/** Tries each image in turn (camera poster → tree thumbnail); falls back to an illustration. */
function PlotPreview({plot}: {plot: PlotRef}) {
  const candidates = plot.dataPath
    ? [`${plot.dataPath}/media/video/front_poster.jpg`, `${plot.dataPath}/media/thumbs/227.jpg`]
    : [];
  const [i, setI] = useState(0);
  if (i >= candidates.length) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl bg-gradient-to-br from-[#3F6B47] via-[#7BA882] to-[#C5DCB5] text-white/90">
        <span className="text-xs font-medium">
          {plot.status === 'pending' ? 'Not yet captured' : 'No 3D model in this demo'}
        </span>
      </div>
    );
  }
  return (
    <img
      src={candidates[i]}
      alt={`${plot.name} preview`}
      onError={() => setI((x) => x + 1)}
      className="h-40 w-full rounded-xl object-cover"
    />
  );
}

function PlotCard({
  plot,
  index,
  onClose,
  onOpen,
}: {
  plot: PlotRef;
  index: number;
  onClose: () => void;
  onOpen: () => void;
}) {
  const s = plot.summary;
  const st = PLOT_STATUS[plot.status];
  return (
    <aside className="absolute top-[84px] right-4 bottom-4 z-10 flex w-[360px] flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-2xl">
      <div className="flex items-start justify-between px-5 pt-4">
        <div>
          <div className="text-[11px] font-medium text-fg-muted">Plot #{index}</div>
          <h2 className="text-lg font-semibold">{plot.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge tone={PLOT_TONE[plot.status]} dot>
              {st.label}
            </Badge>
            {plot.dataPath && <Badge tone="farmevo">3D point cloud</Badge>}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-md p-1 text-fg-subtle hover:bg-surface-hover cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <PlotPreview plot={plot} />
        {plot.captureDate && (
          <div className="flex items-center gap-2 text-xs text-fg-muted">
            <CalendarDays size={14} /> Captured {fmtDate(plot.captureDate)} · TimberSense Backpack
          </div>
        )}
        {s ? (
          <div className="grid grid-cols-2 gap-2">
            <KpiTile size="sm" label="Trees" value={s.nValidTrees} hint={`${s.nRejected} rejected`} />
            <KpiTile size="sm" label="Stocking" value={fmtStemsPerHa(s.stemsPerHa)} />
            <KpiTile size="sm" label="Mean DBH" value={fmtDbh(s.dbhCmMean)} />
            <KpiTile size="sm" label="Mean height" value={fmtHeight(s.heightMMean)} />
            <KpiTile size="sm" label="Basal area" value={fmtBasalArea(s.basalAreaM2PerHa)} />
            <KpiTile size="sm" label="Volume" value={fmtVolumePerHa(s.woodVolumeM3PerHa, 0)} />
          </div>
        ) : (
          <p className="rounded-xl bg-surface-2 p-3 text-sm text-fg-muted">
            {plot.status === 'captured'
              ? 'Captured in the field — processing is under way. Measurements appear here when it finishes.'
              : 'This plot is on the cruise plan but hasn’t been captured yet.'}
          </p>
        )}
      </div>
      <div className="border-t border-border-subtle p-4">
        <Button
          variant="dark"
          size="lg"
          className="w-full justify-center"
          disabled={!plot.dataPath}
          onClick={onOpen}
          icon={<Box size={16} />}
        >
          {plot.dataPath ? 'Open 3D viewer' : '3D view not available'}
        </Button>
      </div>
    </aside>
  );
}
