/** WS-D owns. Right sidebar content while a tree is selected. Talks to other workstreams only through the store. */
import {ArrowLeft, Box, ChevronLeft, ChevronRight, Crosshair, ImageOff} from 'lucide-react';
import {useMemo, useState} from 'react';
import {Badge, type BadgeTone, Button, KpiTile, SidebarSection} from '@/components/ui';
import {fmtAreaM2, fmtDbh, fmtDistance, fmtHeight, fmtMass, fmtNumber, fmtVolume} from '@/lib/format';
import {plotUrl} from '@/lib/loaders';
import type {QsmStatus, Tree} from '@/types';
import {usePlotData} from '../PlotDataContext';
import {useViewerStore} from '../store';
import {parseRejectReason} from './treeStats';

const QSM_BADGE: Record<QsmStatus, {tone: BadgeTone; label: string}> = {
  ok: {tone: 'success', label: 'QSM ok'},
  partial: {tone: 'warning', label: 'QSM partial'},
  no_tree: {tone: 'danger', label: 'QSM: no tree'},
  not_run: {tone: 'neutral', label: 'QSM not run'},
};

export function TreeDetails({tree}: {tree: Tree}) {
  const {plotDir, trees, treesById} = usePlotData();
  const selectTree = useViewerStore((s) => s.selectTree);
  const requestCamera = useViewerStore((s) => s.requestCamera);
  const qsmOn = useViewerStore((s) => s.layers.qsm);
  const setLayers = useViewerStore((s) => s.setLayers);

  // Prev/next walks the measured trees in id order (or the rejected ones, if a rejected tree is open).
  const ring = useMemo(
    () => trees.filter((t) => t.valid === tree.valid).sort((a, b) => a.id - b.id),
    [trees, tree.valid],
  );
  const idx = ring.findIndex((t) => t.id === tree.id);
  const go = (id: number) => {
    selectTree(id);
    requestCamera({kind: 'focusTree', id});
  };
  const step = (d: number) => go(ring[(idx + d + ring.length) % ring.length].id);

  const neighbour = tree.nnId != null ? treesById.get(tree.nnId) : undefined;

  return (
    <>
      <div className="flex items-center gap-1 border-b border-border-subtle px-2 py-2">
        <Button size="sm" variant="ghost" icon={<ArrowLeft size={14} />} onClick={() => selectTree(null)}>
          Plot
        </Button>
        <div className="ml-auto flex items-center gap-1">
          <span className="fd-mono mr-1 text-[11px] text-fg-subtle">
            {idx + 1}/{ring.length}
          </span>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => step(-1)} title="Previous tree">
            <ChevronLeft size={16} />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => step(1)} title="Next tree">
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      <SidebarSection>
        <Thumbnail key={tree.id} src={tree.thumbnail && plotUrl(plotDir, tree.thumbnail)} alt={`Tree ${tree.id}`} />
        <div className="mt-3 flex items-baseline justify-between">
          <h3 className="text-lg font-semibold">Tree {tree.id}</h3>
          <span className="text-xs text-fg-subtle">{tree.nPoints.toLocaleString()} pts</span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Badge tone="brand" dot>
            {tree.species}
          </Badge>
          {tree.valid ? (
            <>
              {tree.thinRemove && <Badge tone="danger">Thin: remove</Badge>}
              <Badge tone={tree.wellSpaced ? 'success' : 'warning'}>
                {tree.wellSpaced ? 'Well spaced' : 'Crowded'}
              </Badge>
              <Badge tone={QSM_BADGE[tree.qsmStatus].tone}>{QSM_BADGE[tree.qsmStatus].label}</Badge>
              {tree.dbhConfidence && <Badge tone="info">Confidence {tree.dbhConfidence}</Badge>}
            </>
          ) : (
            <Badge tone="danger">Rejected</Badge>
          )}
        </div>
      </SidebarSection>

      {!tree.valid && (
        <SidebarSection title="Why it was rejected">
          <ul className="space-y-1.5 text-sm">
            {parseRejectReason(tree.rejectReason).map((r) => (
              <li key={r.label} className="flex items-baseline justify-between gap-2">
                <span>{r.label}</span>
                {r.detail && <span className="fd-mono text-[11px] text-fg-subtle">{r.detail}</span>}
              </li>
            ))}
          </ul>
        </SidebarSection>
      )}

      {tree.valid && (
        <>
          <SidebarSection title="Measurements">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-fg-muted">
                  <th className="pb-1 text-left font-medium" />
                  <th className="pb-1 text-right font-medium" title="Fitted from the point cloud">
                    Point cloud
                  </th>
                  <th className="pb-1 text-right font-medium" title="Quantitative structure model">
                    QSM
                  </th>
                </tr>
              </thead>
              <tbody className="fd-mono">
                <tr className="border-t border-border-subtle">
                  <td className="py-1.5 font-sans text-fg-muted">DBH</td>
                  <td className="py-1.5 text-right font-semibold">{fmtDbh(tree.dbhCm)}</td>
                  <td className="py-1.5 text-right">{fmtDbh(tree.dbhCmQsm)}</td>
                </tr>
                <tr className="border-t border-border-subtle">
                  <td className="py-1.5 font-sans text-fg-muted">Height</td>
                  <td className="py-1.5 text-right font-semibold">{fmtHeight(tree.heightM)}</td>
                  <td className="py-1.5 text-right">{fmtHeight(tree.heightMQsm)}</td>
                </tr>
              </tbody>
            </table>
          </SidebarSection>

          <SidebarSection title="Wood & carbon">
            <div className="grid grid-cols-2 gap-2">
              <KpiTile size="sm" label="Basal area" value={fmtAreaM2(tree.basalAreaM2, 3)} />
              <KpiTile size="sm" label="Volume" value={fmtVolume(tree.volumeM3)} />
              <KpiTile size="sm" label="Biomass" value={fmtMass(tree.biomassKg)} />
              <KpiTile size="sm" label="Carbon" value={fmtMass(tree.carbonKg)} />
              <KpiTile size="sm" tone="brand" label="CO₂e" value={fmtMass(tree.co2eKg)} className="col-span-2" />
            </div>
          </SidebarSection>

          <SidebarSection title="Form & spacing">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-fg-muted">Crown radius</dt>
              <dd className="fd-mono text-right">{fmtDistance(tree.crownRadiusM)}</dd>
              <dt className="text-fg-muted">Stem tilt</dt>
              <dd className="fd-mono text-right">
                {tree.stemTiltDeg == null ? fmtNumber(null) : `${fmtNumber(tree.stemTiltDeg, 1)}°`}
              </dd>
              <dt className="text-fg-muted">Nearest neighbour</dt>
              <dd className="fd-mono text-right">
                {fmtDistance(tree.nnDistM)}
                {neighbour && (
                  <button
                    type="button"
                    onClick={() => go(neighbour.id)}
                    className="ml-1.5 cursor-pointer font-sans text-xs text-brand hover:underline"
                  >
                    #{neighbour.id}
                  </button>
                )}
              </dd>
            </dl>
          </SidebarSection>
        </>
      )}

      <SidebarSection className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 justify-center"
          icon={<Crosshair size={14} />}
          onClick={() => requestCamera({kind: 'focusTree', id: tree.id})}
        >
          Focus
        </Button>
        <Button
          size="sm"
          className="flex-1 justify-center"
          icon={<Box size={14} />}
          active={qsmOn && !!tree.qsmMesh}
          disabled={!tree.qsmMesh}
          title={tree.qsmMesh ? 'Show the reconstructed QSM mesh' : 'No QSM model exported for this tree'}
          onClick={() => setLayers({qsm: !qsmOn})}
        >
          {qsmOn && tree.qsmMesh ? 'Hide QSM model' : 'View QSM model'}
        </Button>
      </SidebarSection>
    </>
  );
}

function Thumbnail({src, alt}: {src?: string; alt: string}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-surface-3 text-xs text-fg-subtle">
        <ImageOff size={16} />
        No thumbnail
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="aspect-[4/3] w-full rounded-xl bg-surface-3 object-contain"
    />
  );
}
