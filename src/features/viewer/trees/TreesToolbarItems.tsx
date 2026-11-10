/** WS-C. Toolbar toggles: measurement markers, tree labels, QSM model, thinning overlay. */
import {Axe, Cylinder, Ruler, Tags} from 'lucide-react';
import {ToolbarButton, ToolbarDivider} from '../core/ToolbarButton';
import {useViewerStore} from '../store';
import {useTreesUi} from './treesUi';

export function TreesToolbarItems() {
  const layers = useViewerStore((s) => s.layers);
  const setLayers = useViewerStore((s) => s.setLayers);
  const thinning = useTreesUi((s) => s.thinning);
  const setThinning = useTreesUi((s) => s.setThinning);
  return (
    <>
      <ToolbarDivider />
      <ToolbarButton
        label="DBH & height markers"
        active={layers.markers}
        onClick={() => setLayers({markers: !layers.markers})}
      >
        <Ruler size={18} />
      </ToolbarButton>
      <ToolbarButton label="Tree labels" active={layers.labels} onClick={() => setLayers({labels: !layers.labels})}>
        <Tags size={18} />
      </ToolbarButton>
      <ToolbarButton
        label="QSM model (selected tree)"
        active={layers.qsm}
        onClick={() => setLayers({qsm: !layers.qsm})}
      >
        <Cylinder size={18} />
      </ToolbarButton>
      <ToolbarButton label="Thinning plan" active={thinning} onClick={() => setThinning(!thinning)}>
        <Axe size={18} />
      </ToolbarButton>
    </>
  );
}
