/**
 * WS-B owns. Phase 0: basic THREE.Points with the exported vertex colours.
 * WS-B replaces the material with the custom ShaderMaterial (all colour modes + §5.8 uniforms).
 */
import {useEffect, useMemo} from 'react';
import * as THREE from 'three';
import {usePlotData} from '../PlotDataContext';

export function PointCloudLayer() {
  const {cloud} = usePlotData();

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(cloud.position, 3));
    g.setAttribute('color', new THREE.BufferAttribute(cloud.color, 3, true));
    g.computeBoundingSphere();
    return g;
  }, [cloud]);

  const material = useMemo(() => new THREE.PointsMaterial({size: 2, sizeAttenuation: false, vertexColors: true}), []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
