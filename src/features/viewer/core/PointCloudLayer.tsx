/**
 * WS-B. Point cloud with the custom shader (all colour modes + §5.8 uniforms).
 * Uniforms are synced from the store every frame without React re-renders.
 */
import {useFrame, useThree} from '@react-three/fiber';
import {useEffect, useMemo} from 'react';
import * as THREE from 'three';
import {usePlotData} from '../PlotDataContext';
import {COLOR_MODE_INDEX, pointsFragmentShader, pointsVertexShader} from '../shaders/points';
import {type MetricKey, useViewerStore} from '../store';
import {buildMetricTexture, METRIC_TEX_WIDTH} from './metrics';

const SIZE_MODE_INDEX = {fixed: 0, adaptive: 1} as const;

export function PointCloudLayer() {
  const {cloud, trees} = usePlotData();
  const metric = useViewerStore((s) => s.metric);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(cloud.position, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(cloud.color, 3, true));
    g.setAttribute('aSemantic', new THREE.BufferAttribute(cloud.semantic, 1));
    g.setAttribute('aInstance', new THREE.BufferAttribute(cloud.instance, 1));
    g.setAttribute('aHag', new THREE.BufferAttribute(cloud.hag, 1));
    g.setAttribute('aTSeen', new THREE.BufferAttribute(cloud.tSeen, 1));
    const {min, max} = cloud.header.bbox;
    g.boundingBox = new THREE.Box3(new THREE.Vector3(...min), new THREE.Vector3(...max));
    g.boundingSphere = g.boundingBox.getBoundingSphere(new THREE.Sphere());
    return g;
  }, [cloud]);

  const hagMax = useMemo(() => {
    const tallest = trees.reduce((m, t) => Math.max(m, t.heightM ?? 0), 0);
    return tallest > 0 ? tallest * 1.05 : Math.max(1, cloud.header.bbox.max[2] - cloud.header.bbox.min[2]);
  }, [trees, cloud]);

  const metricTextures = useMemo(() => {
    const keys: MetricKey[] = ['dbh', 'height', 'volume'];
    return Object.fromEntries(keys.map((k) => [k, buildMetricTexture(trees, k)])) as Record<
      MetricKey,
      THREE.DataTexture
    >;
  }, [trees]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: pointsVertexShader,
        fragmentShader: pointsFragmentShader,
        uniforms: {
          uColorMode: {value: 0},
          uMetricTex: {value: null},
          uMetricTexSize: {value: new THREE.Vector2(METRIC_TEX_WIDTH, 1)},
          uHoveredId: {value: 0},
          uSelectedId: {value: 0},
          uDimOthers: {value: 1},
          uRevealT: {value: -1},
          uPointSize: {value: 2},
          uSizeMode: {value: 1},
          uProjScale: {value: 800},
          uPixelRatio: {value: 1},
          uHagMax: {value: 8},
        },
      }),
    [],
  );

  useEffect(() => {
    const tex = metricTextures[metric];
    material.uniforms.uMetricTex.value = tex;
    material.uniforms.uMetricTexSize.value.set(tex.image.width, tex.image.height);
  }, [material, metricTextures, metric]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      for (const t of Object.values(metricTextures)) t.dispose();
    },
    [geometry, material, metricTextures],
  );

  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  useFrame(({camera}) => {
    const s = useViewerStore.getState();
    const u = material.uniforms;
    u.uColorMode.value = COLOR_MODE_INDEX[s.colorMode];
    u.uHoveredId.value = s.hoveredTreeId ?? 0;
    u.uSelectedId.value = s.selectedTreeId ?? 0;
    u.uDimOthers.value = s.dimOthers ? 1 : 0;
    u.uRevealT.value = s.playback.enabled && s.playback.reveal ? s.playback.t : -1;
    u.uPointSize.value = s.render.pointSize;
    u.uSizeMode.value = SIZE_MODE_INDEX[s.render.sizeMode];
    u.uPixelRatio.value = dpr;
    u.uHagMax.value = hagMax;
    const fov = (camera as THREE.PerspectiveCamera).fov ?? 55;
    u.uProjScale.value = (size.height * dpr) / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2));
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
