/**
 * WS-C. QSM cylinder model of the selected tree (layers.qsm). Drawn as a slightly transparent
 * overlay on top of the points so the reconstructed stem/branches are readable.
 */
import {useGLTF} from '@react-three/drei';
import {Suspense, useMemo} from 'react';
import * as THREE from 'three';
import {plotUrl} from '@/lib/loaders';
import {usePlotData} from '../PlotDataContext';
import {useViewerStore} from '../store';

function QsmMesh({url}: {url: string}) {
  const gltf = useGLTF(url);
  const scene = useMemo(() => {
    const s = gltf.scene.clone(true);
    s.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.material = new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.7,
          transparent: true,
          opacity: 0.88,
          depthTest: false,
          depthWrite: false,
        });
        o.renderOrder = 8;
      }
    });
    return s;
  }, [gltf]);
  return <primitive object={scene} />;
}

export function QsmMeshLayer() {
  const {plotDir, treesById} = usePlotData();
  const show = useViewerStore((s) => s.layers.qsm);
  const tree = useViewerStore((s) => (s.selectedTreeId != null ? treesById.get(s.selectedTreeId) : undefined));
  if (!show || !tree?.qsmMesh) return null;
  return (
    <Suspense fallback={null}>
      <QsmMesh key={tree.id} url={plotUrl(plotDir, tree.qsmMesh)} />
    </Suspense>
  );
}
