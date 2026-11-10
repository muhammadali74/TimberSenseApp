/** WS-C. Floating tooltip above the hovered tree (driven by the store, so sidebar hovers show it too). */
import {Html} from '@react-three/drei';
import {fmtDbh, fmtHeight} from '@/lib/format';
import {usePlotData} from '../PlotDataContext';
import {useViewerStore} from '../store';

export function TreeTooltip() {
  const {treesById} = usePlotData();
  const hovered = useViewerStore((s) => (s.hoveredTreeId != null ? treesById.get(s.hoveredTreeId) : undefined));
  const selectedId = useViewerStore((s) => s.selectedTreeId);
  if (!hovered || hovered.id === selectedId) return null;
  const top =
    hovered.top[2] > hovered.base[2] + 0.5 ? hovered.top : [hovered.base[0], hovered.base[1], hovered.base[2] + 1.5];
  return (
    <Html position={[top[0], top[1], top[2] + 0.4]} center zIndexRange={[20, 10]} style={{pointerEvents: 'none'}}>
      <div className="-translate-y-1/2 whitespace-nowrap rounded-lg bg-fg/90 px-2.5 py-1.5 text-[11px] text-white shadow-lg backdrop-blur">
        <div className="font-semibold">
          Tree {hovered.id} <span className="font-normal text-white/60">· {hovered.species}</span>
        </div>
        {hovered.valid ? (
          <div className="fd-mono text-white/85">
            DBH {fmtDbh(hovered.dbhCm)} · H {fmtHeight(hovered.heightM)}
          </div>
        ) : (
          <div className="text-[#ffb37a]">
            Not measured — {hovered.rejectReason?.split('(')[0].replace(/_/g, ' ') ?? 'rejected'}
          </div>
        )}
      </div>
    </Html>
  );
}
