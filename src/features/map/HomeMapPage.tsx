/**
 * WS-H. Home: full-bleed satellite map with every project's blocks.
 *  - zoomed out: numbered white bubbles clustering blocks (SylvaSense style)
 *  - zoomed in: block polygons coloured by status, labelled
 *  - hover → tooltip; click → select project (right panel) and fly to it
 *  - left: projects list (filtered by the header region selector); right: project panel
 */

import {boundingExtent, buffer as bufferExtent} from 'ol/extent';
import type {FeatureLike} from 'ol/Feature';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import VectorLayer from 'ol/layer/Vector';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import Cluster from 'ol/source/Cluster';
import VectorSource from 'ol/source/Vector';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {catalog} from '@/data/catalog';
import {ringCentroid} from '@/data/generate';
import {type RegionId, useShell} from '@/features/shell/shellStore';
import type {Project} from '@/types';
import {MapControls} from './MapControls';
import {MapHoverCard} from './MapHoverCard';
import {extentOf, flyTo, toMap} from './olBase';
import {ProjectPanel} from './ProjectPanel';
import {ProjectsList} from './ProjectsList';
import {StatusLegend} from './StatusLegend';
import {BLOCK_STATUS, bubbleStyle, countBy, polygonStyle, withAlpha} from './styles';
import {useOlMap} from './useOlMap';

const POLYGON_MIN_ZOOM = 12;

export function projectsInRegion(region: RegionId): Project[] {
  if (region === 'punjab') return catalog.filter((p) => p.country === 'Pakistan');
  if (region === 'bc') return catalog.filter((p) => p.country === 'Canada');
  return catalog;
}

const projectExtent = (projects: Project[]) => extentOf(projects.flatMap((p) => p.blocks.flatMap((b) => b.polygon)));

type Hover =
  | {kind: 'cluster'; pixel: [number, number]; blocks: {project: Project; name: string; status: string}[]}
  | {kind: 'block'; pixel: [number, number]; project: Project; name: string; status: string; areaHa: number}
  | null;

export function HomeMapPage() {
  const {ref, map} = useOlMap();
  const region = useShell((s) => s.region);
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('project');
  const selected = catalog.find((p) => p.id === selectedId) ?? null;
  const [hover, setHover] = useState<Hover>(null);
  const visible = useMemo(() => projectsInRegion(region), [region]);

  const select = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(params);
      if (id) next.set('project', id);
      else next.delete('project');
      setParams(next, {replace: true});
    },
    [params, setParams],
  );

  // Layers (rebuilt when the region filter changes).
  const layers = useMemo(() => {
    const points = new VectorSource();
    const polys = new VectorSource();
    for (const p of visible) {
      for (const b of p.blocks) {
        const props = {projectId: p.id, blockName: b.name, status: b.status, areaHa: b.areaHa};
        points.addFeature(new Feature({geometry: new Point(toMap(ringCentroid(b.polygon))), ...props}));
        polys.addFeature(new Feature({geometry: new Polygon([b.polygon.map(toMap)]), ...props}));
      }
    }
    const cluster = new VectorLayer({
      source: new Cluster({distance: 46, minDistance: 18, source: points}),
      maxZoom: POLYGON_MIN_ZOOM + 0.5,
      zIndex: 3,
    });
    const polygons = new VectorLayer({source: polys, minZoom: POLYGON_MIN_ZOOM - 0.5, zIndex: 2});
    return {cluster, polygons};
  }, [visible]);

  // Styles depend on the selection.
  useEffect(() => {
    layers.cluster.setStyle((f: FeatureLike) => {
      const members = (f.get('features') as Feature[]) ?? [];
      const sel = !!selectedId && members.every((m) => m.get('projectId') === selectedId);
      return bubbleStyle(members.length, {selected: sel});
    });
    layers.polygons.setStyle((f: FeatureLike, resolution: number) => {
      const st = BLOCK_STATUS[f.get('status') as keyof typeof BLOCK_STATUS];
      const sel = f.get('projectId') === selectedId;
      return polygonStyle(withAlpha(st.color, sel ? 0.45 : 0.3), sel ? '#ffffff' : st.color, {
        width: sel ? 3 : 2,
        label: resolution < 6 ? f.get('blockName') : undefined,
      });
    });
  }, [layers, selectedId]);

  useEffect(() => {
    if (!map) return;
    map.addLayer(layers.polygons);
    map.addLayer(layers.cluster);
    return () => {
      map.removeLayer(layers.polygons);
      map.removeLayer(layers.cluster);
    };
  }, [map, layers]);

  // Fly to the selected project, otherwise to the region.
  const fitCurrent = useCallback(
    (duration = 1400) => {
      if (!map) return;
      const target = selected ? [selected] : visible;
      flyTo(map, projectExtent(target), [110, selected ? 420 : 90, 80, 360], duration, 16);
    },
    [map, selected, visible],
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-fit only when the region or selection changes
  useEffect(() => {
    fitCurrent(1800);
  }, [map, region, selectedId]);

  // Hover + click.
  useEffect(() => {
    if (!map) return;
    const featureAt = (e: MapBrowserEvent<PointerEvent | KeyboardEvent | WheelEvent>) =>
      map.forEachFeatureAtPixel(e.pixel, (f) => f, {hitTolerance: 4}) as Feature | undefined;
    const onMove = (e: MapBrowserEvent<PointerEvent | KeyboardEvent | WheelEvent>) => {
      if (e.dragging) return;
      const f = featureAt(e);
      map.getTargetElement().style.cursor = f ? 'pointer' : '';
      if (!f) return setHover(null);
      const pixel = e.pixel as [number, number];
      const members = f.get('features') as Feature[] | undefined;
      if (members) {
        setHover({
          kind: 'cluster',
          pixel,
          blocks: members.map((m) => ({
            project: catalog.find((p) => p.id === m.get('projectId')) as Project,
            name: m.get('blockName'),
            status: m.get('status'),
          })),
        });
      } else {
        setHover({
          kind: 'block',
          pixel,
          project: catalog.find((p) => p.id === f.get('projectId')) as Project,
          name: f.get('blockName'),
          status: f.get('status'),
          areaHa: f.get('areaHa'),
        });
      }
    };
    const onClick = (e: MapBrowserEvent<PointerEvent | KeyboardEvent | WheelEvent>) => {
      const f = featureAt(e);
      if (!f) return;
      const members = f.get('features') as Feature[] | undefined;
      const ids = new Set((members ?? [f]).map((m) => m.get('projectId') as string));
      if (ids.size === 1) select([...ids][0]);
      else if (members) {
        const coords = members.map((m) => (m.getGeometry() as Point).getCoordinates());
        flyTo(map, bufferExtent(boundingExtent(coords), 3000), [120, 120, 120, 380], 900);
      }
    };
    map.on('pointermove', onMove);
    map.on('click', onClick);
    const leave = () => setHover(null);
    map.getTargetElement()?.addEventListener('pointerleave', leave);
    return () => {
      map.un('pointermove', onMove);
      map.un('click', onClick);
      map.getTargetElement()?.removeEventListener('pointerleave', leave);
    };
  }, [map, select]);

  return (
    <div className="relative h-full w-full bg-[#0b1a12]">
      <div ref={ref} className="absolute inset-0" />
      <ProjectsList projects={visible} selectedId={selectedId} onSelect={select} />
      {selected && <ProjectPanel project={selected} onClose={() => select(null)} />}
      <StatusLegend />
      <MapControls map={map} onFit={() => fitCurrent(900)} offsetRight={selected ? 376 : 0} />
      <MapHoverCard pixel={hover?.pixel ?? null}>
        {hover?.kind === 'cluster' && <ClusterTooltip blocks={hover.blocks} />}
        {hover?.kind === 'block' && (
          <div>
            <div className="font-semibold text-fg">{hover.name}</div>
            <div className="text-fg-muted">
              {hover.project.name} · {hover.areaHa.toFixed(1)} ha
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{background: BLOCK_STATUS[hover.status as keyof typeof BLOCK_STATUS].color}}
              />
              {BLOCK_STATUS[hover.status as keyof typeof BLOCK_STATUS].label}
            </div>
          </div>
        )}
      </MapHoverCard>
    </div>
  );
}

function ClusterTooltip({blocks}: {blocks: {project: Project; name: string; status: string}[]}) {
  const counts = countBy(blocks, (b) => b.status);
  const projects = [...new Set(blocks.map((b) => b.project.name))];
  return (
    <div>
      <div className="font-semibold text-fg">
        {blocks.length} block{blocks.length > 1 ? 's' : ''}
      </div>
      <div className="flex gap-2 text-[11px]">
        {(Object.keys(BLOCK_STATUS) as (keyof typeof BLOCK_STATUS)[])
          .filter((k) => counts[k])
          .map((k) => (
            <span key={k} style={{color: BLOCK_STATUS[k].color === '#feb743' ? '#b4730a' : BLOCK_STATUS[k].color}}>
              {counts[k]} {BLOCK_STATUS[k].label.toLowerCase()}
            </span>
          ))}
      </div>
      <ul className="mt-1 space-y-0.5 text-[11px] text-fg-muted">
        {blocks.slice(0, 4).map((b) => (
          <li key={b.name} className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{background: BLOCK_STATUS[b.status as keyof typeof BLOCK_STATUS].color}}
            />
            {b.name}
          </li>
        ))}
        {blocks.length > 4 && <li>+{blocks.length - 4} more</li>}
      </ul>
      {projects.length > 1 && (
        <div className="mt-1 text-[11px] text-fg-subtle">{projects.length} projects — click to zoom</div>
      )}
    </div>
  );
}
