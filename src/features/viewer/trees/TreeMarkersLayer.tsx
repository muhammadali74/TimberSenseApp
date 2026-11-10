/**
 * WS-C. Measurement overlays:
 *  - selected tree (layers.markers): DBH ring at 1.3 m, height stick with 1 m ticks, crown circle, base pin
 *  - all trees (layers.labels): ID + DBH chips
 *  - thinning overlay (local toggle): red rings on trees flagged for removal + spacing-conflict links
 */
import {Line} from '@react-three/drei';
import {useThree} from '@react-three/fiber';
import {useMemo} from 'react';
import * as THREE from 'three';
import {fmtDbh, fmtHeight} from '@/lib/format';
import type {Tree} from '@/types';
import {HIGHLIGHT_COLOR} from '../core/colors';
import {type GroundSampler, useGround} from '../core/ground';
import {usePlotData} from '../PlotDataContext';
import {useViewerStore} from '../store';
import {DbhRings} from './DbhRings';
import {MeasureLabel} from './MeasureLabel';
import {useTreesUi} from './treesUi';

const UP = new THREE.Vector3(0, 0, 1);
const MIN_SPACING_M = 2.0; // pipeline --min_spacing

function groundCircle(ground: GroundSampler, cx: number, cy: number, r: number, lift = 0.06, n = 64) {
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    pts.push([x, y, ground.heightAt(x, y) + lift]);
  }
  return pts;
}

/**
 * Stem position on the ground. The pipeline's `base` can sit ~10 cm off the stem, so when a DBH fit
 * exists, project the fitted stem axis (lowest ring centre along its normal) down to the base height.
 */
function stemBase(tree: Tree): THREE.Vector3 {
  const base = new THREE.Vector3(...tree.base);
  const ring = tree.dbhRings?.[0];
  if (!ring) return base;
  const c = new THREE.Vector3(...ring.center);
  const n = new THREE.Vector3(...ring.normal).normalize();
  if (n.z < 0.5) return base;
  return c.addScaledVector(n, (base.z - c.z) / n.z);
}

function SelectedTreeMarkers({tree}: {tree: Tree}) {
  const camera = useThree((s) => s.camera);
  const dpr = useThree((s) => s.viewport.dpr);
  const ground = useGround();

  // The camera is read once per selection so the height stick doesn't swing around while orbiting.
  // biome-ignore lint/correctness/useExhaustiveDependencies: stick side fixed when the tree is selected
  const geo = useMemo(() => {
    const base = stemBase(tree);
    const top = new THREE.Vector3(...tree.top);
    const radius = (tree.dbhCm ?? 20) / 200;
    // Height stick sits beside the stem, on the side facing the camera at selection time.
    const toCam = camera.position.clone().sub(base).setZ(0);
    if (toCam.lengthSq() < 1e-6) toCam.set(1, 0, 0);
    toCam.normalize();
    const side = new THREE.Vector3().crossVectors(UP, toCam).normalize();
    const off = side
      .clone()
      .multiplyScalar(radius + 0.45)
      .addScaledVector(toCam, 0.15);
    const height = tree.heightM ?? Math.max(top.z - base.z, 0);
    const s0 = new THREE.Vector3(base.x + off.x, base.y + off.y, base.z);
    const s1 = s0.clone().setZ(base.z + height);
    const ticks: [THREE.Vector3, THREE.Vector3][] = [];
    for (let m = 1; m < height; m++) {
      const p = s0.clone().setZ(base.z + m);
      ticks.push([p.clone().addScaledVector(side, -0.1), p.clone().addScaledVector(side, 0.1)]);
    }
    return {base, top, radius, s0, s1, ticks, height, side};
  }, [tree]);

  const crown = useMemo(
    () => (tree.crownRadiusM ? groundCircle(ground, geo.base.x, geo.base.y, tree.crownRadiusM) : null),
    [ground, tree, geo],
  );

  const capW = 0.22;

  return (
    <group>
      {/* DBH rings — exact pipeline fit, dotted; the DBH-height ring in orange */}
      <DbhRings tree={tree} side={geo.side} pixelRatio={dpr} />

      {/* Height stick */}
      {geo.height > 0 && (
        <>
          <Line points={[geo.s0, geo.s1]} color="#ffffff" lineWidth={3} depthTest={false} renderOrder={12} />
          <Line
            points={[geo.s1.clone().addScaledVector(geo.side, -capW), geo.s1.clone().addScaledVector(geo.side, capW)]}
            color="#ffffff"
            lineWidth={3}
            depthTest={false}
            renderOrder={12}
          />
          <Line
            points={[geo.s0.clone().addScaledVector(geo.side, -capW), geo.s0.clone().addScaledVector(geo.side, capW)]}
            color="#ffffff"
            lineWidth={3}
            depthTest={false}
            renderOrder={12}
          />
          {geo.ticks.map(([a, b], i) => (
            <Line key={i} points={[a, b]} color="#ffffff" lineWidth={2} depthTest={false} renderOrder={12} />
          ))}
          <Line
            points={[geo.s1, geo.top]}
            color="#ffffff"
            lineWidth={1.2}
            dashed
            dashSize={0.12}
            gapSize={0.08}
            depthTest={false}
            renderOrder={12}
          />
          <MeasureLabel position={[geo.s1.x, geo.s1.y, geo.s1.z + 0.18]} tone="dark">
            H {fmtHeight(tree.heightM)}
          </MeasureLabel>
        </>
      )}

      {/* Crown footprint on the ground */}
      {crown && (
        <Line points={crown} color="#ffd2ad" lineWidth={2} dashed dashSize={0.25} gapSize={0.12} renderOrder={9} />
      )}

      {/* Base pin */}
      <mesh position={[geo.base.x, geo.base.y, geo.base.z + 0.04]} renderOrder={10}>
        <circleGeometry args={[geo.radius + 0.12, 40]} />
        <meshBasicMaterial
          color={HIGHLIGHT_COLOR}
          transparent
          opacity={0.55}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function TreeLabels({trees, selectedId}: {trees: Tree[]; selectedId: number | null}) {
  return (
    <>
      {trees
        .filter((t) => t.valid && t.id !== selectedId)
        .map((t) => (
          <MeasureLabel
            key={t.id}
            position={[t.top[0], t.top[1], t.top[2] + 0.35]}
            tone="light"
            className="text-[10px]"
          >
            {t.id} · {fmtDbh(t.dbhCm, 0)}
          </MeasureLabel>
        ))}
    </>
  );
}

function ThinningOverlay({trees}: {trees: Tree[]}) {
  const ground = useGround();
  const {treesById} = usePlotData();
  const rings = useMemo(
    () =>
      trees
        .filter((t) => t.thinRemove)
        .map((t) => ({t, pts: groundCircle(ground, t.base[0], t.base[1], 0.55, 0.08, 40)})),
    [trees, ground],
  );
  const links = useMemo(() => {
    const seen = new Set<string>();
    const out: {key: string; pts: [number, number, number][]}[] = [];
    for (const t of trees) {
      if (!t.valid || t.nnId == null || t.nnDistM == null || t.nnDistM >= MIN_SPACING_M) continue;
      const n = treesById.get(t.nnId);
      if (!n) continue;
      const key = [t.id, n.id].sort().join('-');
      if (seen.has(key)) continue;
      seen.add(key);
      const z = (x: number, y: number) => ground.heightAt(x, y) + 0.12;
      out.push({
        key,
        pts: [
          [t.base[0], t.base[1], z(t.base[0], t.base[1])],
          [n.base[0], n.base[1], z(n.base[0], n.base[1])],
        ],
      });
    }
    return out;
  }, [trees, treesById, ground]);

  return (
    <>
      {links.map((l) => (
        <Line
          key={l.key}
          points={l.pts}
          color="#feb743"
          lineWidth={2}
          dashed
          dashSize={0.15}
          gapSize={0.1}
          renderOrder={9}
        />
      ))}
      {rings.map(({t, pts}) => (
        <group key={t.id}>
          <Line points={pts} color="#e3412b" lineWidth={3} renderOrder={9} />
          <MeasureLabel position={[t.base[0], t.base[1], t.base[2] + 0.5]} tone="danger" className="text-[10px]">
            ✕ {t.id}
          </MeasureLabel>
        </group>
      ))}
    </>
  );
}

export function TreeMarkersLayer() {
  const {trees, treesById} = usePlotData();
  const selectedId = useViewerStore((s) => s.selectedTreeId);
  const layers = useViewerStore((s) => s.layers);
  const thinning = useTreesUi((s) => s.thinning);
  const selected = selectedId != null ? treesById.get(selectedId) : undefined;
  return (
    <>
      {layers.markers && selected && <SelectedTreeMarkers key={selected.id} tree={selected} />}
      {layers.labels && <TreeLabels trees={trees} selectedId={selectedId} />}
      {thinning && <ThinningOverlay trees={trees} />}
    </>
  );
}
