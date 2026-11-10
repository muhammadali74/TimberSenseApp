/** WS-B. Ground mesh (dtm.glb) shown when `render.showDtm` is on. */
import {useGLTF} from '@react-three/drei';
import {Suspense, useMemo} from 'react';
import * as THREE from 'three';
import {plotUrl} from '@/lib/loaders';
import {usePlotData} from '../PlotDataContext';
import {useViewerStore} from '../store';

function DtmMesh({url}: {url: string}) {
  const gltf = useGLTF(url);
  const scene = useMemo(() => {
    const s = gltf.scene.clone(true);
    s.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.material = new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.95, metalness: 0});
      }
    });
    // Sit just below the ground points so they stay visible on top.
    s.position.z = -0.03;
    return s;
  }, [gltf]);
  return <primitive object={scene} />;
}

export function DtmLayer() {
  const {plotDir, manifest} = usePlotData();
  const show = useViewerStore((s) => s.render.showDtm);
  if (!show || !manifest.files.dtm) return null;
  return (
    <Suspense fallback={null}>
      <DtmMesh url={plotUrl(plotDir, manifest.files.dtm)} />
    </Suspense>
  );
}
